import { describe, expect, it } from "vitest";

import {
  buildDuplicateCatalogItem,
  cloneCatalogItemDraft,
  newCatalogRewardUid,
  type RewardCatalogItemDraft,
} from "./reward-catalog-merge";

const sampleItem: RewardCatalogItemDraft = {
  rewardUid: "free_coffee",
  name: "Free Coffee",
  rewardType: "VOUCHER",
  status: "ACTIVE",
  pointsCost: 500,
  displayOrder: 0,
  description: "Any size",
  metadataJson: '{"sku":"COFFEE-001"}',
};

describe("cloneCatalogItemDraft", () => {
  it("deep-clones metadata JSON", () => {
    const copy = cloneCatalogItemDraft(sampleItem);
    copy.metadataJson = '{"sku":"CHANGED"}';
    expect(sampleItem.metadataJson).toBe('{"sku":"COFFEE-001"}');
  });
});

describe("newCatalogRewardUid", () => {
  it("generates reward_* ids", () => {
    const uid = newCatalogRewardUid();
    expect(uid).toMatch(/^reward_/);
  });

  it("avoids collisions with existing uids", () => {
    const existing = newCatalogRewardUid();
    const next = newCatalogRewardUid([existing]);
    expect(next).not.toBe(existing);
  });
});

describe("buildDuplicateCatalogItem", () => {
  it("creates DRAFT copy with auto-generated uid (not _copy suffix)", () => {
    const dup = buildDuplicateCatalogItem(sampleItem, [sampleItem.rewardUid]);
    expect(dup.rewardUid).toMatch(/^reward_/);
    expect(dup.rewardUid).not.toBe(sampleItem.rewardUid);
    expect(dup.rewardUid).not.toContain("_copy");
    expect(dup.name).toBe("Free Coffee (copy)");
    expect(dup.status).toBe("DRAFT");
    expect(dup.pointsCost).toBe(500);
    expect(dup.metadataJson).toContain("COFFEE-001");
  });

  it("allows duplicating archived items as DRAFT", () => {
    const archived = { ...sampleItem, status: "ARCHIVED" as const };
    const dup = buildDuplicateCatalogItem(archived, [archived.rewardUid]);
    expect(dup.status).toBe("DRAFT");
  });
});
