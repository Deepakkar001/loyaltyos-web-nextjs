import { describe, expect, it } from "vitest";

import type { ConditionFlowEdge, ConditionFlowNode } from "../types";
import { RuleTreeBuilder } from "../treeBuilder";

describe("RuleTreeBuilder", () => {
  it("returns everyone when event has no outgoing edges", () => {
    const nodes: ConditionFlowNode[] = [
      { id: "event", type: "eventNode", position: { x: 0, y: 0 }, data: { eventType: "purchase" } },
      { id: "action_yes", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "award_points", params: {} } },
      { id: "action_no", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "noop", params: {} } },
    ];
    const edges: ConditionFlowEdge[] = [];
    const { tree, errors } = new RuleTreeBuilder().buildTree(nodes, edges);
    // With action-node validation enabled, this is a blocking structural error (no path leads to action).
    expect(errors.some((e) => e.severity === "error")).toBe(true);
    expect(tree.kind).toBe("everyone");
  });

  it("builds a single leaf when yes qualifies and no rejects", () => {
    const nodes: ConditionFlowNode[] = [
      { id: "event", type: "eventNode", position: { x: 0, y: 0 }, data: { eventType: "purchase" } },
      { id: "action_yes", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "award_points", params: {} } },
      { id: "action_no", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "noop", params: {} } },
      { id: "cond1", type: "conditionNode", position: { x: 0, y: 0 }, data: { field: "event.amount", operator: "GT", value: 500 } },
    ];
    const edges: ConditionFlowEdge[] = [
      { id: "e:event->cond1", source: "event", target: "cond1", data: {} },
      { id: "e:cond1->action_yes:yes", source: "cond1", target: "action_yes", data: { label: "yes" } },
      { id: "e:cond1->action_no:no", source: "cond1", target: "action_no", data: { label: "no" } },
    ];
    const { tree, errors } = new RuleTreeBuilder().buildTree(nodes, edges);
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
    // Only non-noop actions qualify the rule; "no" → noop is ignored for the saved tree.
    expect(tree.kind).toBe("group");
    if (tree.kind === "group") {
      const leaf = tree.nodes[0];
      expect(leaf?.kind).toBe("leaf");
      if (leaf?.kind === "leaf") {
        expect(leaf.field).toBe("event.amount");
        expect(leaf.op).toBe("GT");
        expect(leaf.value).toBe(500);
      }
    }
  });

  it("is deterministic regardless of edge array order", () => {
    const nodes: ConditionFlowNode[] = [
      { id: "event", type: "eventNode", position: { x: 0, y: 0 }, data: { eventType: "purchase" } },
      { id: "action_yes", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "award_points", params: {} } },
      { id: "action_no", type: "actionNode", position: { x: 0, y: 0 }, data: { actionType: "noop", params: {} } },
      { id: "cond1", type: "conditionNode", position: { x: 0, y: 0 }, data: { field: "event.amount", operator: "GT", value: 500 } },
      { id: "cond2", type: "conditionNode", position: { x: 0, y: 0 }, data: { field: "customer.tierUid", operator: "EQ", value: "gold" } },
    ];
    const edgesA: ConditionFlowEdge[] = [
      { id: "e:event->cond1", source: "event", target: "cond1", data: {} },
      { id: "e:cond1->cond2:yes", source: "cond1", target: "cond2", data: { label: "yes" } },
      { id: "e:cond1->action_no:no", source: "cond1", target: "action_no", data: { label: "no" } },
      { id: "e:cond2->action_yes:yes", source: "cond2", target: "action_yes", data: { label: "yes" } },
      { id: "e:cond2->action_no:no", source: "cond2", target: "action_no", data: { label: "no" } },
    ];
    const edgesB = [...edgesA].reverse();

    const a = new RuleTreeBuilder().buildTree(nodes, edgesA).tree;
    const b = new RuleTreeBuilder().buildTree(nodes, edgesB).tree;
    expect(a).toEqual(b);
  });
});

