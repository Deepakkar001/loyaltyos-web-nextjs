import type { ComparisonOp, ConditionField, ConditionGroup, ConditionNode, ConditionTreeDraft, LeafCondition, LogicalOp, NotNode } from "../condition-builder/types";
import type { ConditionFlowEdge, ConditionFlowNode, ValidationError } from "./types";
import { FIELD_METADATA, getConditionBranchLabel } from "./types";
import { GraphValidator, NodeValidator } from "./validator";

type BuildOpts = {
  /** event node id is derived if omitted */
  eventNodeId?: string;
  fieldMetadata?: Record<string, { type: "number" | "string" | "datetime" | "enum" }>;
};

function stableIdFromPath(parts: Array<string | number>) {
  return `p:${parts.join(".")}`;
}

type Literal = { field: ConditionField; op: ComparisonOp; value?: unknown; negated: boolean };

function literalKey(l: Literal) {
  return `${l.negated ? "!" : ""}${l.field}:${l.op}:${JSON.stringify(l.value ?? null)}`;
}

function group(op: LogicalOp, nodes: ConditionNode[], id: string): ConditionNode {
  if (nodes.length === 0) {
    // Caller should avoid creating empty groups. Keep a deterministic fallback.
    return { id, kind: "group", op, nodes: [] } satisfies ConditionGroup;
  }
  if (nodes.length === 1) return nodes[0]!;
  return { id, kind: "group", op, nodes } satisfies ConditionGroup;
}

function not(node: ConditionNode, id: string): NotNode {
  // Avoid double-NOT canonicalization here; keep deterministic structure.
  return { id, kind: "not", node };
}

function leaf(
  field: ConditionField,
  op: ComparisonOp,
  value: unknown,
  id: string,
  fieldMetadata: Record<string, { type: "number" | "string" | "datetime" | "enum" }>
): LeafCondition {
  const meta = fieldMetadata[field];
  const type = meta?.type ?? "string";
  const normalized = normalizeValue(value, op, type);
  return {
    id,
    kind: "leaf",
    field,
    op,
    ...(op === "IS_NULL" || op === "IS_NOT_NULL" ? {} : { value: normalized }),
  };
}

function literalToNode(
  l: Literal,
  idBase: string,
  fieldMetadata: Record<string, { type: "number" | "string" | "datetime" | "enum" }>
): ConditionNode {
  const base = leaf(l.field, l.op, l.value, `${idBase}:leaf`, fieldMetadata);
  return l.negated ? not(base, `${idBase}:not`) : base;
}

function normalizeValue(
  input: unknown,
  operator: ComparisonOp,
  type: "number" | "string" | "datetime" | "enum"
): LeafCondition["value"] {
  // Deterministic normalization for backend SpEL parser:
  // - numbers: Number(...)
  // - datetime: keep string (backend expects string literals; do not auto-ISO to avoid surprising rewrites)
  // - strings: String(...)
  // - IN/NOT_IN: arrays of normalized
  // - BETWEEN: [low, high] normalized
  if (operator === "IS_NULL" || operator === "IS_NOT_NULL") return undefined;

  const cast = (v: unknown) => {
    if (type === "number") return Number(v);
    if (type === "datetime") return String(v);
    return String(v);
  };

  if (operator === "BETWEEN" && Array.isArray(input)) {
    if (type === "number") return [Number(input[0]), Number(input[1])] as [number, number];
    return [String(input[0]), String(input[1])] as unknown as LeafCondition["value"];
  }

  if ((operator === "IN" || operator === "NOT_IN") && Array.isArray(input)) {
    return input.map(cast);
  }

  // Default scalar
  return cast(input);
}

function outgoingSorted(edges: ConditionFlowEdge[], sourceId: string) {
  const outs = edges.filter((e) => e.source === sourceId);
  return outs.sort((a, b) => {
    const la = getConditionBranchLabel(a) ?? "";
    const lb = getConditionBranchLabel(b) ?? "";
    const labelRank = (l: string) => (l === "yes" ? 0 : l === "no" ? 1 : 2);
    const r = labelRank(la) - labelRank(lb);
    if (r !== 0) return r;
    return a.target.localeCompare(b.target);
  });
}

function findSingleEvent(nodes: ConditionFlowNode[]): ConditionFlowNode | undefined {
  const events = nodes.filter((n) => n.type === "eventNode");
  return events.length === 1 ? events[0] : undefined;
}

export class RuleTreeBuilder {
  buildTree(nodes: ConditionFlowNode[], edges: ConditionFlowEdge[], opts: BuildOpts = {}): { tree: ConditionTreeDraft; errors: ValidationError[] } {
    const fieldMetadata = opts.fieldMetadata ?? FIELD_METADATA;
    const graphErrors = new GraphValidator().validateGraph(nodes, edges);

    const nodeValidator = new NodeValidator(fieldMetadata);
    const nodeErrors: ValidationError[] = [];
    for (const n of nodes) {
      if (n.type === "conditionNode") {
        nodeErrors.push(...nodeValidator.validateConditionNode(n as Extract<ConditionFlowNode, { type: "conditionNode" }>));
      }
    }

    const allErrors = [...graphErrors, ...nodeErrors];
    const blocking = allErrors.filter((e) => e.severity === "error");
    if (blocking.length > 0) {
      // Deterministic failure: return everyone-tree is NOT allowed; caller must show errors.
      return { tree: { kind: "everyone" }, errors: allErrors };
    }

    const eventNode = opts.eventNodeId ? nodes.find((n) => n.id === opts.eventNodeId) : findSingleEvent(nodes);
    if (!eventNode || eventNode.type !== "eventNode") {
      return {
        tree: { kind: "everyone" },
        errors: [
          ...allErrors,
          { id: "missing_event", nodeId: "", severity: "error", message: "No Event node found." },
        ],
      };
    }

    const outs = outgoingSorted(edges, eventNode.id);
    if (outs.length === 0) {
      return {
        tree: { kind: "everyone" },
        errors: [
          ...allErrors,
          {
            id: "event_no_outgoing",
            nodeId: eventNode.id,
            severity: "error" as const,
            message: "Connect the Event node to the first step in your flow (e.g. a Condition).",
            suggestedFix: "Draw one arrow from Event to your Condition node.",
          },
        ],
      };
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));

    // Deterministic DP: compute conjunction sets reaching each node from the event.
    // Each conjunction is a list of Literals (DNF representation).
    const dp = this.computeDnfFromEvent(eventNode.id, nodes, edges, nodeMap, fieldMetadata);

    // Only branches that end in a "real" action qualify the rule.
    // The diagram uses a dedicated noop terminal for reject/no-match paths,
    // which must NOT become part of the saved condition tree.
    const actionNodes = nodes.filter(
      (n) => n.type === "actionNode" && n.data.actionType !== "noop"
    );
    const allConjs: Literal[][] = [];
    for (const a of actionNodes.sort((x, y) => x.id.localeCompare(y.id))) {
      const conjs = dp.get(a.id) ?? [];
      for (const c of conjs) allConjs.push(c);
    }

    if (allConjs.length === 0) {
      return {
        tree: { kind: "everyone" },
        errors: [
          ...allErrors,
          {
            id: "missing_positive_action",
            nodeId: "",
            severity: "error",
            message: "Diagram must lead to at least one real action (not only a reject/noop path).",
            suggestedFix: "Connect the matching path to Award Points or another real action.",
          },
        ],
      };
    }

    // Canonicalize: dedupe conjunctions and sort deterministically.
    const conjKey = (c: Literal[]) => c.map(literalKey).sort().join("&");
    const uniq = new Map<string, Literal[]>();
    for (const c of allConjs) {
      const normalized = [...c].sort((a, b) => literalKey(a).localeCompare(literalKey(b)));
      uniq.set(conjKey(normalized), normalized);
    }
    const ordered = Array.from(uniq.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // Build tree: OR of AND(conjunction)
    const disjuncts: ConditionNode[] = ordered.map(([, conj], idx) => {
      if (conj.length === 0) {
        // A path with no predicates => always true => everyone
        return { id: stableIdFromPath(["true", idx]), kind: "group", op: "AND", nodes: [] };
      }
      const nodes = conj.map((l, j) => literalToNode(l, stableIdFromPath(["lit", idx, j]), fieldMetadata));
      return group("AND", nodes, stableIdFromPath(["and", idx]));
    });

    // If any empty conjunction exists, the OR is always true => everyone.
    // This is almost always a wiring mistake (e.g. Event still connects to Award,
    // or a Logic OR merges a "no filter" branch with a real branch into Award).
    // Surface as a blocking error so the badge is not green and Next explains why.
    if (ordered.some(([, conj]) => conj.length === 0)) {
      return {
        tree: { kind: "everyone" },
        errors: [
          ...allErrors,
          {
            id: "unfiltered_path_to_award",
            nodeId: "event",
            severity: "error" as const,
            message:
              "Every event would earn points: at least one path reaches Award Points without passing through any condition.",
            suggestedFix:
              "Remove any arrow from Event straight to Award. If you use Logic (OR), ensure no branch skips all conditions. The \"no\" side of a filter should usually go to \"no action\", not to the same Award as \"yes\".",
          },
        ],
      };
    }

    const rootId = stableIdFromPath(["root"]);
    const root = group("OR", disjuncts, rootId);
    if (root.kind === "group") return { tree: root, errors: allErrors };
    return { tree: { kind: "group", id: rootId, op: "AND", nodes: [root] }, errors: allErrors };
  }

  private computeDnfFromEvent(
    eventId: string,
    nodes: ConditionFlowNode[],
    edges: ConditionFlowEdge[],
    nodeMap: Map<string, ConditionFlowNode>,
    fieldMetadata: Record<string, { type: "number" | "string" | "datetime" | "enum" }>
  ): Map<string, Literal[][]> {
    const incomingByTarget = new Map<string, ConditionFlowEdge[]>();
    const outgoingBySource = new Map<string, ConditionFlowEdge[]>();
    for (const e of edges) {
      incomingByTarget.set(e.target, [...(incomingByTarget.get(e.target) ?? []), e]);
      outgoingBySource.set(e.source, [...(outgoingBySource.get(e.source) ?? []), e]);
    }

    // Toposort (graph is already validated as acyclic).
    const indeg = new Map<string, number>();
    for (const n of nodes) indeg.set(n.id, 0);
    for (const e of edges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);

    const q: string[] = [];
    for (const [id, d] of Array.from(indeg.entries())) if (d === 0) q.push(id);
    q.sort();
    const order: string[] = [];
    while (q.length) {
      const id = q.shift()!;
      order.push(id);
      const outs = outgoingBySource.get(id) ?? [];
      for (const e of outs) {
        indeg.set(e.target, (indeg.get(e.target) ?? 0) - 1);
        if (indeg.get(e.target) === 0) {
          q.push(e.target);
          q.sort();
        }
      }
    }

    const dp = new Map<string, Literal[][]>();
    dp.set(eventId, [[]]);

    const mergeOr = (lists: Literal[][][]) => lists.flatMap((x) => x);
    const mergeAnd = (lists: Literal[][][]) => {
      let acc: Literal[][] = [[]];
      for (const part of lists) {
        const next: Literal[][] = [];
        for (const a of acc) for (const b of part) next.push([...a, ...b]);
        acc = next;
      }
      return acc;
    };

    const literalsAlongConditionEdge = (cond: ConditionFlowNode, edge: ConditionFlowEdge): Literal[][] => {
      if (cond.type !== "conditionNode") return [];
      const field = cond.data.field as ConditionField;
      const op = cond.data.operator as ComparisonOp;
      const meta = fieldMetadata[field];
      if (!meta) return [];
      const value = op === "IS_NULL" || op === "IS_NOT_NULL" ? undefined : cond.data.value;
      const base: Literal = { field, op, value, negated: !!cond.data.negate };
      const yesLit = base;
      const noLit: Literal = { ...base, negated: !base.negated };
      const branch = getConditionBranchLabel(edge);
      const here = dp.get(cond.id) ?? [];
      if (branch === "yes") return here.map((c) => [...c, yesLit]);
      if (branch === "no") return here.map((c) => [...c, noLit]);
      return [];
    };

    for (const id of order) {
      const node = nodeMap.get(id);
      if (!node) continue;

      if (id !== eventId) {
        const ins = (incomingByTarget.get(id) ?? []).sort((a, b) => a.source.localeCompare(b.source));
        // dp(condition) is conjunctions *before* that node evaluates; merging it at downstream
        // nodes wrongly treated Award as reachable with no literals. Expand per incoming edge.
        const incomingLists: Literal[][][] = ins.map((e) => {
          const src = nodeMap.get(e.source);
          if (src?.type === "conditionNode") {
            return literalsAlongConditionEdge(src, e);
          }
          return dp.get(e.source) ?? [];
        });

        if (node.type === "logicNode") {
          dp.set(id, node.data.logic === "AND" ? mergeAnd(incomingLists) : mergeOr(incomingLists));
        } else {
          // Default merge is OR across multiple incoming paths.
          dp.set(id, mergeOr(incomingLists));
        }
      }

      // Propagate to outgoing
      const outs = outgoingSorted(edges, id);
      const here = dp.get(id) ?? [];

      if (node.type === "conditionNode") {
        // Downstream DNF is applied when each target merges incoming edges (see literalsAlongConditionEdge).
        continue;
      }

      // All other nodes: pass-through
      for (const e of outs) {
        dp.set(e.target, [...(dp.get(e.target) ?? []), ...here.map((c) => [...c])]);
      }
    }

    return dp;
  }
}

