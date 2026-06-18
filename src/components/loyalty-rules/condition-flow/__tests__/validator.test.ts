import { describe, expect, it } from "vitest";

import type { ConditionFlowEdge, ConditionFlowNode } from "../types";
import { GraphValidator, NodeValidator } from "../validator";

function baseNodes(): ConditionFlowNode[] {
  return [
    { id: "event", type: "eventNode", position: { x: 0, y: 0 }, data: { eventType: "purchase" } },
    { id: "action_yes", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "award_points", params: {} } },
    { id: "action_no", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "noop", params: {} } },
  ];
}

describe("GraphValidator", () => {
  it("rejects diagram with no event node", () => {
    const nodes: ConditionFlowNode[] = [
      { id: "action_yes", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "award_points", params: {} } },
    ];
    const errors = new GraphValidator().validateGraph(nodes, []);
    expect(errors.some((e) => e.message.toLowerCase().includes("exactly one event"))).toBe(true);
  });

  it("detects disconnected nodes", () => {
    const nodes: ConditionFlowNode[] = [
      ...baseNodes(),
      {
        id: "cond1",
        type: "conditionNode",
        position: { x: 0, y: 0 },
        data: { field: "event.amount", operator: "GT", value: 500 },
      },
    ];
    const edges: ConditionFlowEdge[] = [];
    const errors = new GraphValidator().validateGraph(nodes, edges);
    expect(errors.some((e) => e.nodeId === "cond1" && e.message.toLowerCase().includes("disconnected"))).toBe(true);
  });

  it('enforces "yes" and "no" on condition nodes', () => {
    const nodes: ConditionFlowNode[] = [
      ...baseNodes(),
      {
        id: "cond1",
        type: "conditionNode",
        position: { x: 0, y: 0 },
        data: { field: "event.amount", operator: "GT", value: 500 },
      },
    ];
    const edges: ConditionFlowEdge[] = [{ id: "e1", source: "event", target: "cond1", data: {} }];
    const errors = new GraphValidator().validateGraph(nodes, edges);
    expect(errors.some((e) => e.nodeId === "cond1" && e.message.toLowerCase().includes("yes"))).toBe(true);
  });

  it("detects cycles", () => {
    const nodes: ConditionFlowNode[] = [
      ...baseNodes(),
      {
        id: "cond1",
        type: "conditionNode",
        position: { x: 0, y: 0 },
        data: { field: "event.amount", operator: "GT", value: 500 },
      },
      {
        id: "cond2",
        type: "conditionNode",
        position: { x: 0, y: 0 },
        data: { field: "event.amount", operator: "LT", value: 999 },
      },
    ];
    const edges: ConditionFlowEdge[] = [
      { id: "e:event->cond1", source: "event", target: "cond1", data: {} },
      { id: "e:cond1->cond2:yes", source: "cond1", target: "cond2", data: { label: "yes" } },
      { id: "e:cond1->action_no:no", source: "cond1", target: "action_no", data: { label: "no" } },
      { id: "e:cond2->cond1:yes", source: "cond2", target: "cond1", data: { label: "yes" } },
      { id: "e:cond2->action_yes:no", source: "cond2", target: "action_yes", data: { label: "no" } },
    ];
    const errors = new GraphValidator().validateGraph(nodes, edges);
    expect(errors.some((e) => e.message.toLowerCase().includes("circular"))).toBe(true);
  });
});

describe("NodeValidator", () => {
  it("requires field selection", () => {
    const node: ConditionFlowNode = {
      id: "cond1",
      type: "conditionNode",
      position: { x: 0, y: 0 },
      data: { field: null, operator: "GT", value: 1 },
    };
    const errors = new NodeValidator().validateConditionNode(node as Extract<ConditionFlowNode, { type: "conditionNode" }>);
    expect(errors.some((e) => e.field === "field")).toBe(true);
  });

  it("allows any supported operator on numeric fields", () => {
    const node: ConditionFlowNode = {
      id: "cond1",
      type: "conditionNode",
      position: { x: 0, y: 0 },
      data: { field: "event.amount", operator: "CONTAINS", value: "500" },
    };
    const errors = new NodeValidator().validateConditionNode(node as Extract<ConditionFlowNode, { type: "conditionNode" }>);
    expect(errors.some((e) => e.field === "operator" && e.severity === "error")).toBe(false);
  });

  it("validates BETWEEN shape", () => {
    const node: ConditionFlowNode = {
      id: "cond1",
      type: "conditionNode",
      position: { x: 0, y: 0 },
      data: { field: "event.amount", operator: "BETWEEN", value: [10] },
    };
    const errors = new NodeValidator().validateConditionNode(node as Extract<ConditionFlowNode, { type: "conditionNode" }>);
    expect(errors.some((e) => e.field === "value" && e.message.toLowerCase().includes("between"))).toBe(true);
  });
});

