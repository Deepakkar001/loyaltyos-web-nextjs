import type { Edge, Node } from "reactflow";

import type { ComparisonOp, ConditionField, ConditionTreeDraft, LogicalOp } from "../condition-builder/types";
import {
  ALL_COMPARISON_OPS,
  CONDITION_OPERATOR_LABELS,
  fallbackConditionFieldCatalog,
  catalogToFieldMetadata,
  type ConditionFieldMeta,
  type ConditionFieldValueType,
} from "@/lib/rules/condition-field-catalog";

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

export type { ConditionFieldMeta };
export type ConditionValueType = ConditionFieldValueType;

export const FIELD_METADATA: Record<string, ConditionFieldMeta> = catalogToFieldMetadata(
  fallbackConditionFieldCatalog({ programmeUid: "default", triggerEventType: "PURCHASE" })
);

export const OPERATORS_BY_TYPE: Record<ConditionValueType, ComparisonOp[]> = {
  number: [...ALL_COMPARISON_OPS],
  string: [...ALL_COMPARISON_OPS],
  enum: [...ALL_COMPARISON_OPS],
  datetime: [...ALL_COMPARISON_OPS],
};

export const OPERATORS_WITH_ANY_TYPE: ComparisonOp[] = [];

export const OPERATOR_LABELS: Record<ComparisonOp, string> = CONDITION_OPERATOR_LABELS;

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

