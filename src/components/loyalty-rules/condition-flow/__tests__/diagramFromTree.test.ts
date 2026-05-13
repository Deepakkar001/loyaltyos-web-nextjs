import { describe, expect, it } from "vitest";

import { diagramFromConditionTree } from "../diagramFromTree";
import type { ConditionTreeDraft } from "../../condition-builder/types";

describe("diagramFromConditionTree", () => {
  it("creates deterministic ids for same tree", () => {
    const tree = {
      kind: "group",
      id: "root",
      op: "AND",
      nodes: [
        { id: "a", kind: "leaf", field: "event.amount", op: "GT", value: 500 },
        { id: "b", kind: "leaf", field: "customer.tierUid", op: "EQ", value: "gold" },
      ],
    } as unknown as ConditionTreeDraft;

    const a = diagramFromConditionTree({ tree, eventType: "purchase" });
    const b = diagramFromConditionTree({ tree, eventType: "purchase" });
    expect(a).toEqual(b);
  });

  it("includes event + qualified + rejected nodes", () => {
    const tree = { kind: "everyone" } as ConditionTreeDraft;
    const { nodes } = diagramFromConditionTree({ tree, eventType: "purchase" });
    expect(nodes.some((n) => n.type === "eventNode")).toBe(true);
    expect(nodes.some((n) => n.type === "actionNode")).toBe(true);
  });
});

