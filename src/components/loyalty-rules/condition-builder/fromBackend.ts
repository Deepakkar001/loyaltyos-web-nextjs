import type { ComparisonOp, ConditionField, ConditionGroup, ConditionNode, ConditionTreeDraft, LeafCondition, LogicalOp, NotNode } from "./types";

function stableId(path: Array<string | number>) {
  return `b:${path.join(".")}`;
}

function isLeafValue(v: unknown): v is LeafCondition["value"] {
  if (v == null) return true;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return true;
  if (Array.isArray(v)) {
    // [number, number] or Array<string|number>
    if (v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number") return true;
    return v.every((x) => typeof x === "string" || typeof x === "number");
  }
  return false;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function parseNode(input: unknown, path: Array<string | number>): ConditionNode | null {
  if (!isObject(input)) return null;
  const field = asString(input.field);
  const op = asString(input.op) ?? asString(input.operator);

  if (field && op) {
    const record = input as Record<string, unknown>;
    const rawValue = record.value;
    const safeValue = isLeafValue(rawValue) ? rawValue : undefined;
    const leaf: LeafCondition = {
      id: stableId([...path, "leaf"]),
      kind: "leaf",
      field: field as ConditionField,
      op: op as ComparisonOp,
      ...(op === "IS_NULL" || op === "IS_NOT_NULL" ? {} : { value: safeValue }),
    };
    return leaf;
  }

  if (!op) return null;
  const upper = op.toUpperCase();
  if (upper === "NOT") {
    const record = input as Record<string, unknown>;
    const child = parseNode(record.node, [...path, "not"]);
    if (!child) return null;
    const n: NotNode = { id: stableId([...path, "notNode"]), kind: "not", node: child };
    return n;
  }

  if (upper === "AND" || upper === "OR") {
    const record = input as Record<string, unknown>;
    const raw = record.nodes;
    if (!Array.isArray(raw)) return null;
    const children: ConditionNode[] = [];
    raw.forEach((c, i) => {
      const parsed = parseNode(c, [...path, i]);
      if (parsed) children.push(parsed);
    });
    const g: ConditionGroup = {
      id: stableId([...path, "group"]),
      kind: "group",
      op: upper as LogicalOp,
      nodes: children,
    };
    return g;
  }

  return null;
}

export function fromBackendConditionTree(input: unknown): ConditionTreeDraft {
  // Backend uses {} (empty object) for "everyone"
  if (input == null) return { kind: "everyone" };
  if (isObject(input) && Object.keys(input).length === 0) return { kind: "everyone" };

  const parsed = parseNode(input, ["root"]);
  if (!parsed) return { kind: "everyone" };
  if (parsed.kind === "group") return parsed;
  return { kind: "group", id: stableId(["root", "wrap"]), op: "AND", nodes: [parsed] };
}

