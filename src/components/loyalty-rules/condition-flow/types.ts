import type { Edge, Node } from "reactflow";

import type { ComparisonOp, ConditionField, ConditionTreeDraft, LogicalOp } from "../condition-builder/types";

/**
 * Yes/no branch for edges leaving a condition node.
 * React Flow keeps `sourceHandle` and may keep a top-level `label`; some flows strip `edge.data`.
 * The tree builder and validator must not rely on `data.label` alone.
 */
export function getConditionBranchLabel(e: {
  id?: string;
  data?: { label?: "yes" | "no" };
  label?: unknown;
  sourceHandle?: string | null;
}): "yes" | "no" | undefined {
  const d = e.data?.label;
  if (d === "yes" || d === "no") return d;
  if (e.label === "yes" || e.label === "no") return e.label;
  const h = e.sourceHandle;
  if (h === "yes" || h === "no") return h;
  // Built-in edges use ids like `e:cond:…->action_yes:yes` — RF sometimes drops data/sourceHandle.
  if (typeof e.id === "string") {
    const m = /:(yes|no)$/.exec(e.id);
    if (m?.[1] === "yes" || m?.[1] === "no") return m[1];
  }
  return undefined;
}

export type ConditionValueType = "number" | "string" | "datetime";

export type ConditionFieldMeta = {
  type: ConditionValueType;
  label: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

export const FIELD_METADATA: Record<ConditionField, ConditionFieldMeta> = {
  "event.amount": { type: "number", label: "Transaction Amount", placeholder: "e.g. 500" },
  "event.eventType": {
    type: "string",
    label: "Event Type",
    options: [
      { label: "Purchase", value: "purchase" },
      { label: "Login", value: "login" },
      { label: "Referral", value: "referral" },
    ],
  },
  "event.channel": {
    type: "string",
    label: "Channel",
    options: [
      { label: "Mobile", value: "mobile" },
      { label: "Web", value: "web" },
      { label: "In-Store", value: "instore" },
    ],
  },
  "event.timestamp": { type: "datetime", label: "Event Time", placeholder: "YYYY-MM-DD" },
  "event.transactionId": { type: "string", label: "Transaction ID" },
  "event.merchantId": { type: "string", label: "Merchant ID" },
  "event.productCategory": { type: "string", label: "Product Category" },
  "customer.tierUid": {
    type: "string",
    label: "Customer Tier",
    options: [
      { label: "Gold", value: "gold" },
      { label: "Silver", value: "silver" },
      { label: "Bronze", value: "bronze" },
    ],
  },
};

export const OPERATORS_BY_TYPE: Record<ConditionValueType, ComparisonOp[]> = {
  number: ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "BETWEEN", "IN", "NOT_IN"],
  string: ["EQ", "NEQ", "IN", "NOT_IN", "CONTAINS", "STARTS_WITH"],
  datetime: ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "BETWEEN"],
};

export const OPERATORS_WITH_ANY_TYPE: ComparisonOp[] = ["IS_NULL", "IS_NOT_NULL"];

export const OPERATOR_LABELS: Record<ComparisonOp, string> = {
  EQ: "equals",
  NEQ: "does not equal",
  GT: "is greater than",
  GTE: "is greater than or equal to",
  LT: "is less than",
  LTE: "is less than or equal to",
  IN: "is one of",
  NOT_IN: "is not one of",
  BETWEEN: "is between",
  IS_NULL: "is empty",
  IS_NOT_NULL: "is not empty",
  CONTAINS: "contains",
  STARTS_WITH: "starts with",
};

export type ValidationSeverity = "error" | "warning";

export type ValidationError = {
  id: string;
  nodeId: string; // empty for global errors
  severity: ValidationSeverity;
  message: string;
  field?: "field" | "operator" | "value";
  suggestedFix?: string;
};

export type EventNodeData = {
  eventType: string;
  /** UI-only: update callback injected by builder */
  onUpdate?: (patch: Partial<Omit<EventNodeData, "onUpdate">>) => void;
};

export type ActionNodeData = {
  actionType: "award_points" | "tier_upgrade" | "notify" | "badge_award" | "noop";
  params: Record<string, unknown>;
  /** When set (e.g. rule details preview), overrides the title derived from actionType */
  displayTitle?: string;
  /** When set, replaces the default `Type: …` subtitle line */
  displayTypeLine?: string;
  /** UI-only: update callback injected by builder */
  onUpdate?: (patch: Partial<Omit<ActionNodeData, "onUpdate" | "onDelete">>) => void;
  /** UI-only: delete callback injected by builder */
  onDelete?: () => void;
};

export type ConditionNodeData = {
  field: ConditionField | null;
  operator: ComparisonOp | null;
  value: unknown;
  /** If true, this node represents NOT(field op value) */
  negate?: boolean;
  /** UI-only: update callback injected by builder */
  onUpdate?: (patch: Partial<Omit<ConditionNodeData, "onUpdate">>) => void;
  /** UI-only: delete callback injected by builder */
  onDelete?: () => void;
};

export type LogicNodeData = {
  logic: LogicalOp;
  /** UI-only: update callback injected by builder */
  onUpdate?: (patch: Partial<Omit<LogicNodeData, "onUpdate" | "onDelete">>) => void;
  /** UI-only: delete callback injected by builder */
  onDelete?: () => void;
};

export type ConditionFlowNode =
  | Node<EventNodeData, "eventNode">
  | Node<ConditionNodeData, "conditionNode">
  | Node<ActionNodeData, "actionNode">
  | Node<LogicNodeData, "logicNode">;

export type ConditionFlowEdge = Edge<{
  label?: "yes" | "no";
}>;

export type ConditionFlowState = {
  nodes: ConditionFlowNode[];
  edges: ConditionFlowEdge[];
  validationErrors: ValidationError[];
};

export type BuildResult =
  | { ok: true; tree: ConditionTreeDraft; errors: ValidationError[] }
  | { ok: false; tree?: ConditionTreeDraft; errors: ValidationError[] };

