import { describe, expect, it } from "vitest";

import { isEditingExistingRuleDraft } from "@/lib/store/rule-draft-storage";

describe("isEditingExistingRuleDraft", () => {
  it("returns true when draft intent is edit and ruleUid is set", () => {
    expect(
      isEditingExistingRuleDraft({
        draftIntent: "edit",
        ruleUid: "abc-123",
      })
    ).toBe(true);
  });

  it("returns false when ruleUid is missing even if intent is edit", () => {
    expect(isEditingExistingRuleDraft({ draftIntent: "edit" })).toBe(false);
  });

  it("returns false for create drafts with a stale ruleUid", () => {
    expect(
      isEditingExistingRuleDraft({
        draftIntent: "create",
        ruleUid: "abc-123",
      })
    ).toBe(false);
  });
});
