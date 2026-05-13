import type { ConditionNode, ConditionTreeDraft, LeafCondition, LogicalOp } from "../condition-builder/types";
import type { ConditionFlowEdge, ConditionFlowNode, ConditionNodeData } from "./types";

type Literal = { leaf: LeafCondition; negated: boolean };

type NnfNode =
  | { kind: "literal"; literal: Literal }
  | { kind: "group"; op: LogicalOp; nodes: NnfNode[] };

function stableNodeId(path: Array<string | number>) {
  return `t:${path.join(".")}`;
}

function edgeId(source: string, target: string, label?: "yes" | "no") {
  return `e:${source}->${target}${label ? `:${label}` : ""}`;
}

function asNode(tree: ConditionTreeDraft): ConditionNode | null {
  if (tree.kind === "everyone") return null;
  return tree;
}

function nnf(node: ConditionNode, neg: boolean): NnfNode {
  if (node.kind === "leaf") {
    return { kind: "literal", literal: { leaf: node, negated: neg } };
  }
  if (node.kind === "not") {
    return nnf(node.node, !neg);
  }
  // group
  const op: LogicalOp = node.op;
  if (!neg) {
    return { kind: "group", op, nodes: node.nodes.map((n) => nnf(n, false)) };
  }
  // De Morgan
  const flipped: LogicalOp = op === "AND" ? "OR" : "AND";
  return { kind: "group", op: flipped, nodes: node.nodes.map((n) => nnf(n, true)) };
}

function toDnf(n: NnfNode): Literal[][] {
  if (n.kind === "literal") return [[n.literal]];
  if (n.nodes.length === 0) return [[]];

  if (n.op === "OR") {
    return n.nodes.flatMap(toDnf);
  }

  // AND: cartesian product
  let acc: Literal[][] = [[]];
  for (const child of n.nodes) {
    const childDnf = toDnf(child);
    const next: Literal[][] = [];
    for (const a of acc) {
      for (const b of childDnf) next.push([...a, ...b]);
    }
    acc = next;
  }
  return acc;
}

export function diagramFromConditionTree(args: {
  tree: ConditionTreeDraft;
  eventType: string;
}): { nodes: ConditionFlowNode[]; edges: ConditionFlowEdge[] } {
  const actionYesId = "action_yes";
  const actionNoId = "action_no";
  const eventId = "event";

  const nodes: ConditionFlowNode[] = [
    {
      id: eventId,
      type: "eventNode",
      position: { x: 0, y: 0 },
      data: { eventType: args.eventType },
    },
    {
      id: actionYesId,
      type: "actionNode",
      position: { x: 260, y: 520 },
      data: { actionType: "award_points", params: { multiplier: "1x" } },
    },
    {
      id: actionNoId,
      type: "actionNode",
      position: { x: -260, y: 520 },
      data: { actionType: "noop", params: {} },
    },
  ];

  const edges: ConditionFlowEdge[] = [];

  const root = asNode(args.tree);
  if (!root) {
    // everyone
    edges.push({ id: edgeId(eventId, actionYesId), source: eventId, target: actionYesId, data: {} });
    edges.push({ id: edgeId(eventId, actionNoId), source: eventId, target: actionNoId, data: {} });
    return { nodes, edges };
  }

  const nnfRoot = nnf(root, false);
  const dnf = toDnf(nnfRoot);

  // Deterministic ordering: sort conjunctions by stable string key
  const keyOf = (conj: Literal[]) =>
    conj
      .map((l) => `${l.negated ? "!" : ""}${l.leaf.field}:${l.leaf.op}:${JSON.stringify(l.leaf.value ?? null)}`)
      .join("&");
  const ordered = [...dnf].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

  const branchXSpacing = 340;
  const baseY = 140;
  const stepY = 150;

  ordered.forEach((conj, i) => {
    // Remove duplicates in a conjunction deterministically (best-effort)
    const seen = new Set<string>();
    const unique = conj.filter((l) => {
      const k = `${l.negated ? "!" : ""}${l.leaf.field}:${l.leaf.op}:${JSON.stringify(l.leaf.value ?? null)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (unique.length === 0) {
      // empty conj => everyone (OR true). Connect directly.
      edges.push({ id: edgeId(eventId, actionYesId, "yes"), source: eventId, target: actionYesId, data: { label: "yes" } });
      edges.push({ id: edgeId(eventId, actionNoId, "no"), source: eventId, target: actionNoId, data: { label: "no" } });
      return;
    }

    const x = (i - Math.floor(ordered.length / 2)) * branchXSpacing;

    unique.forEach((lit, idx) => {
      const id = stableNodeId(["b", i, idx]);
      const data: ConditionNodeData = {
        field: lit.leaf.field,
        operator: lit.leaf.op,
        value: lit.leaf.value ?? null,
        negate: lit.negated || undefined,
      };
      nodes.push({
        id,
        type: "conditionNode",
        position: { x, y: baseY + idx * stepY },
        data,
      });

      // Connect event -> first condition (unlabeled)
      if (idx === 0) {
        edges.push({
          id: edgeId(eventId, id),
          source: eventId,
          target: id,
          data: {},
        });
      }

      // condition: no always rejects this conjunction
      edges.push({
        id: edgeId(id, actionNoId, "no"),
        source: id,
        target: actionNoId,
        data: { label: "no" },
      });

      // yes continues (or qualifies if last)
      if (idx === unique.length - 1) {
        edges.push({
          id: edgeId(id, actionYesId, "yes"),
          source: id,
          target: actionYesId,
          data: { label: "yes" },
        });
      }

    });

    // For intermediate nodes, add yes edge to next
    unique.forEach((_, idx) => {
      if (idx === unique.length - 1) return;
      const fromId = stableNodeId(["b", i, idx]);
      const toId = stableNodeId(["b", i, idx + 1]);
      edges.push({
        id: edgeId(fromId, toId, "yes"),
        source: fromId,
        target: toId,
        data: { label: "yes" },
      });
    });
  });

  return { nodes, edges };
}

