export type LogicalOp = "AND" | "OR";
export type ComparisonOp =
  | "EQ"
  | "NEQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN"
  | "NOT_IN"
  | "BETWEEN"
  | "IS_NULL"
  | "IS_NOT_NULL"
  | "CONTAINS"
  | "STARTS_WITH";

export type ConditionField =
  | "event.amount"
  | "event.eventType"
  | "event.channel"
  | "event.timestamp"
  | "event.transactionId"
  | "event.merchantId"
  | "event.productCategory"
  | "customer.tierUid";

export type LeafCondition = {
  id: string;
  kind: "leaf";
  field: ConditionField;
  op: ComparisonOp;
  value?: string | number | boolean | Array<string | number> | [number, number] | null;
};

export type ConditionGroup = {
  id: string;
  kind: "group";
  op: LogicalOp;
  nodes: Array<ConditionNode>;
};

export type NotNode = {
  id: string;
  kind: "not";
  node: ConditionNode;
};

export type ConditionNode = LeafCondition | ConditionGroup | NotNode;

export type ConditionTreeDraft = ConditionGroup | { kind: "everyone" };

export function toBackendConditionTree(tree: ConditionTreeDraft): unknown {
  if (tree.kind === "everyone") return {};
  return toBackendNode(tree);
}

function toBackendNode(node: ConditionNode): unknown {
  if (node.kind === "leaf") {
    return {
      field: node.field,
      op: node.op,
      ...(node.op === "IS_NULL" || node.op === "IS_NOT_NULL" ? {} : { value: node.value }),
    };
  }
  if (node.kind === "not") {
    return {
      op: "NOT",
      node: toBackendNode(node.node),
    };
  }
  // group
  return {
    op: node.op,
    nodes: node.nodes.map(toBackendNode),
  };
}

