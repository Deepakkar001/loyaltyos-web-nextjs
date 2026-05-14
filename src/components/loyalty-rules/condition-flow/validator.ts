import type { ComparisonOp, ConditionField } from "../condition-builder/types";
import type { ConditionFlowEdge, ConditionFlowNode, ValidationError } from "./types";
import { FIELD_METADATA, getConditionBranchLabel, OPERATORS_BY_TYPE, OPERATORS_WITH_ANY_TYPE } from "./types";

function newErrorId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
}

function getOutgoing(edges: ConditionFlowEdge[], sourceId: string) {
  return edges.filter((e) => e.source === sourceId);
}

function getIncoming(edges: ConditionFlowEdge[], targetId: string) {
  return edges.filter((e) => e.target === targetId);
}

function edgesFromMap(edges: ConditionFlowEdge[]) {
  const bySource = new Map<string, ConditionFlowEdge[]>();
  for (const e of edges) {
    const arr = bySource.get(e.source) ?? [];
    arr.push(e);
    bySource.set(e.source, arr);
  }
  return bySource;
}

export class GraphValidator {
  validateGraph(nodes: ConditionFlowNode[], edges: ConditionFlowEdge[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));

    // Rule 1: Exactly one EVENT node
    const eventNodes = nodes.filter((n) => n.type === "eventNode");
    if (eventNodes.length !== 1) {
      errors.push({
        id: newErrorId(),
        nodeId: "",
        severity: "error",
        message: "Diagram must start with exactly one Event node.",
        suggestedFix: "Add one Event node (and remove extras).",
      });
    }
    const eventNode = eventNodes.length === 1 ? eventNodes[0] : undefined;

    // Event must have no incoming edges
    if (eventNode) {
      const incoming = getIncoming(edges, eventNode.id);
      if (incoming.length > 0) {
        errors.push({
          id: newErrorId(),
          nodeId: eventNode.id,
          severity: "error",
          message: "Event is the start node and cannot have incoming connections.",
          suggestedFix: "Remove arrows pointing into the Event node.",
        });
      }
    }

    // Rule 2: No disconnected nodes (all non-event must have incoming edge)
    for (const node of nodes) {
      if (node.type === "eventNode") continue;
      const incoming = getIncoming(edges, node.id);
      if (incoming.length === 0) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "This node is disconnected. Connect an arrow to it.",
          suggestedFix: "Draw an arrow from an upstream node into this node.",
        });
      }
    }

    // Rule 3: CONDITION nodes have both yes + no outgoing
    for (const node of nodes) {
      if (node.type !== "conditionNode") continue;
      const outgoing = getOutgoing(edges, node.id);
      const hasYes = outgoing.some((e) => getConditionBranchLabel(e) === "yes");
      const hasNo = outgoing.some((e) => getConditionBranchLabel(e) === "no");
      if (!hasYes || !hasNo) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: 'Condition must have both "yes" and "no" paths.',
          suggestedFix: 'Connect two outgoing arrows and label them "yes" and "no".',
        });
      }
    }

    // Logic nodes: need 2+ incoming and exactly 1 outgoing
    for (const node of nodes) {
      if (node.type !== "logicNode") continue;
      const incoming = getIncoming(edges, node.id);
      const outgoing = getOutgoing(edges, node.id);
      if (incoming.length < 2) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "Logic node must combine at least 2 incoming paths.",
          suggestedFix: "Connect two or more arrows into this logic node.",
        });
      }
      if (outgoing.length !== 1) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "Logic node must have exactly 1 outgoing connection.",
          suggestedFix: "Keep one outgoing arrow from this logic node.",
        });
      }
    }

    // Rule 4: ACTION nodes are terminal (no outgoing)
    for (const node of nodes) {
      if (node.type !== "actionNode") continue;
      const hasOutgoing = edges.some((e) => e.source === node.id);
      if (hasOutgoing) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "Actions are terminal nodes. Remove outgoing connections.",
          suggestedFix: "Remove outgoing connections from this action node.",
        });
      }

      const incoming = getIncoming(edges, node.id);
      if (incoming.length === 0) {
        errors.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "This action is disconnected. Connect an arrow to it.",
          suggestedFix: "Connect a condition or logic node into this action.",
        });
      }
    }

    // Rule 6: No cycles
    if (this.hasCycle(nodes, edges)) {
      errors.push({
        id: newErrorId(),
        nodeId: "",
        severity: "error",
        message: "Diagram has a circular reference. Paths cannot loop back to previous nodes.",
        suggestedFix: "Remove the connection that creates the loop.",
      });
    }

    // Rule 5: All paths lead to an action node (no dead ends)
    // Only run if graph has exactly one event and at least one action node.
    const actionNodes = nodes.filter((n) => n.type === "actionNode");
    if (eventNode && actionNodes.length > 0) {
      const edgeBySource = edgesFromMap(edges);
      const canReachActionMemo = new Map<string, boolean>();
      for (const node of nodes) {
        if (node.type === "eventNode") continue;
        if (node.type === "actionNode") continue;
        if (!nodeMap.has(node.id)) continue;
        const ok = this.hasPathToAction(node.id, nodeMap, edgeBySource, canReachActionMemo);
        if (!ok) {
          errors.push({
            id: newErrorId(),
            nodeId: node.id,
            severity: "error",
            message: "This node does not lead to an action. All paths must end with an action.",
            suggestedFix: "Connect this path to an action node.",
          });
        }
      }
    }

    return errors;
  }

  private hasPathToAction(
    nodeId: string,
    nodeMap: Map<string, ConditionFlowNode>,
    edgeBySource: Map<string, ConditionFlowEdge[]>,
    memo: Map<string, boolean>
  ): boolean {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const visited = new Set<string>();

    const dfs = (id: string): boolean => {
      if (visited.has(id)) return false;
      visited.add(id);
      const node = nodeMap.get(id);
      if (!node) return false;
      if (node.type === "actionNode") return true;

      const outgoing = edgeBySource.get(id) ?? [];
      if (outgoing.length === 0) return false;
      return outgoing.some((e) => dfs(e.target));
    };

    const res = dfs(nodeId);
    memo.set(nodeId, res);
    return res;
  }

  private hasCycle(nodes: ConditionFlowNode[], edges: ConditionFlowEdge[]): boolean {
    const bySource = edgesFromMap(edges);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (id: string): boolean => {
      visited.add(id);
      stack.add(id);

      const outgoing = bySource.get(id) ?? [];
      for (const e of outgoing) {
        if (!nodeIds.has(e.target)) continue;
        if (!visited.has(e.target)) {
          if (dfs(e.target)) return true;
        } else if (stack.has(e.target)) {
          return true;
        }
      }

      stack.delete(id);
      return false;
    };

    for (const n of nodes) {
      if (!visited.has(n.id) && dfs(n.id)) return true;
    }
    return false;
  }
}

export class NodeValidator {
  validateConditionNode(node: ConditionFlowNode & { type: "conditionNode" }): ValidationError[] {
    const errs: ValidationError[] = [];
    const data = node.data;

    if (!data.field) {
      errs.push({
        id: newErrorId(),
        nodeId: node.id,
        severity: "error",
        message: "Please select a field.",
        field: "field",
      });
      return errs;
    }

    const field = data.field as ConditionField;
    const meta = FIELD_METADATA[field];
    if (!meta) {
      errs.push({
        id: newErrorId(),
        nodeId: node.id,
        severity: "error",
        message: "Unknown field.",
        field: "field",
      });
      return errs;
    }

    if (!data.operator) {
      errs.push({
        id: newErrorId(),
        nodeId: node.id,
        severity: "error",
        message: "Please select an operator.",
        field: "operator",
      });
      return errs;
    }

    const operator = data.operator as ComparisonOp;
    const allowedOps = [...OPERATORS_BY_TYPE[meta.type], ...OPERATORS_WITH_ANY_TYPE];
    if (!allowedOps.includes(operator)) {
      errs.push({
        id: newErrorId(),
        nodeId: node.id,
        severity: "error",
        message: `"${operator}" is not allowed for ${meta.type} fields.`,
        field: "operator",
      });
      return errs;
    }

    if (operator === "IS_NULL" || operator === "IS_NOT_NULL") {
      return errs;
    }

    const value = data.value as unknown;
    if (value == null || value === "") {
      errs.push({
        id: newErrorId(),
        nodeId: node.id,
        severity: "error",
        message: "Please enter a value.",
        field: "value",
      });
      return errs;
    }

    // BETWEEN
    if (operator === "BETWEEN") {
      if (!Array.isArray(value) || value.length !== 2) {
        errs.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "BETWEEN requires two values (min and max).",
          field: "value",
        });
        return errs;
      }
      if (meta.type === "number") {
        const low = Number(value[0]);
        const high = Number(value[1]);
        if (!Number.isFinite(low) || !Number.isFinite(high)) {
          errs.push({
            id: newErrorId(),
            nodeId: node.id,
            severity: "error",
            message: "BETWEEN range must contain valid numbers.",
            field: "value",
          });
          return errs;
        }
        if (low > high) {
          errs.push({
            id: newErrorId(),
            nodeId: node.id,
            severity: "error",
            message: "BETWEEN range is invalid (min > max).",
            field: "value",
          });
          return errs;
        }
      }
      return errs;
    }

    // IN / NOT_IN
    if (operator === "IN" || operator === "NOT_IN") {
      if (!Array.isArray(value) || value.length === 0) {
        errs.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: `${operator} requires at least one value.`,
          field: "value",
        });
        return errs;
      }
      if (meta.type === "number") {
        const allNums = value.every((v) => Number.isFinite(Number(v)));
        if (!allNums) {
          errs.push({
            id: newErrorId(),
            nodeId: node.id,
            severity: "error",
            message: "List values must all be numbers.",
            field: "value",
          });
        }
      }
      return errs;
    }

    // Type-specific validation
    if (meta.type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        errs.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "Value must be a number.",
          field: "value",
        });
      } else if (num < 0) {
        errs.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "warning",
          message: "Value is negative. Is this intended?",
          field: "value",
        });
      }
    }

    if (meta.type === "datetime") {
      const d = new Date(String(value));
      if (!Number.isFinite(d.getTime())) {
        errs.push({
          id: newErrorId(),
          nodeId: node.id,
          severity: "error",
          message: "Invalid date/time value.",
          field: "value",
          suggestedFix: "Use a valid ISO date/time string (e.g. 2026-05-11).",
        });
      }
    }

    return errs;
  }
}

