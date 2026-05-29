export type RewardCatalogItemStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type RewardCatalogTypeDraft = {
  typeCode: string;
  label: string;
  description: string;
};

export type RewardCatalogItemDraft = {
  rewardUid: string;
  name: string;
  rewardType: string;
  status: RewardCatalogItemStatus;
  pointsCost: number;
  displayOrder: number;
  description: string;
  metadataJson: string;
};

export type RewardCatalogDraft = {
  version: number;
  rewardTypes: RewardCatalogTypeDraft[];
  items: RewardCatalogItemDraft[];
};

export const DEFAULT_REWARD_TYPES: RewardCatalogTypeDraft[] = [
  { typeCode: "VOUCHER", label: "Voucher", description: "Discount or gift voucher" },
  { typeCode: "DISCOUNT", label: "Discount", description: "Percentage or fixed discount" },
  { typeCode: "PHYSICAL", label: "Physical gift", description: "Shipped or in-store item" },
  { typeCode: "EXPERIENCE", label: "Experience", description: "Event or service reward" },
  { typeCode: "CUSTOM", label: "Custom", description: "Tenant-defined fulfillment" },
];

export function defaultRewardCatalogDraft(): RewardCatalogDraft {
  return {
    version: 1,
    rewardTypes: DEFAULT_REWARD_TYPES.map((t) => ({ ...t })),
    items: [],
  };
}

/** Reassigns displayOrder 0..n-1 to match list order (after drag-and-drop or delete). */
export function reindexCatalogItemDisplayOrder(items: RewardCatalogItemDraft[]): RewardCatalogItemDraft[] {
  return items.map((item, idx) => ({ ...item, displayOrder: idx }));
}

export function sortCatalogItemsByDisplayOrder(items: RewardCatalogItemDraft[]): RewardCatalogItemDraft[] {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.rewardUid.localeCompare(b.rewardUid));
}

const REWARD_UID_MAX_LEN = 64;

/** Generates a unique catalog reward UID (same pattern as “Add reward” in the admin UI). */
export function newCatalogRewardUid(existingUids: Iterable<string> = []): string {
  const taken = new Set(Array.from(existingUids, (u) => u.trim()).filter(Boolean));
  for (let attempt = 0; attempt < 100; attempt++) {
    const uid =
      attempt === 0
        ? `reward_${Date.now().toString(36)}`
        : `reward_${Date.now().toString(36)}_${attempt}`;
    const trimmed = uid.slice(0, REWARD_UID_MAX_LEN);
    if (!taken.has(trimmed)) return trimmed;
  }
  const fallback = `reward_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return fallback.slice(0, REWARD_UID_MAX_LEN);
}

/** Deep-clones a catalog item; metadata JSON is re-serialized so edits on the copy stay isolated. */
export function cloneCatalogItemDraft(source: RewardCatalogItemDraft): RewardCatalogItemDraft {
  let metadataJson = "{}";
  try {
    const parsed = JSON.parse(source.metadataJson || "{}");
    metadataJson = JSON.stringify(parsed, null, 2);
  } catch {
    metadataJson = source.metadataJson || "{}";
  }
  return {
    rewardUid: source.rewardUid,
    name: source.name,
    rewardType: source.rewardType,
    status: source.status,
    pointsCost: source.pointsCost,
    displayOrder: source.displayOrder,
    description: source.description,
    metadataJson,
  };
}

/** Builds a DRAFT duplicate inserted below the source item in catalogue order. */
export function buildDuplicateCatalogItem(
  source: RewardCatalogItemDraft,
  existingUids: Iterable<string>
): RewardCatalogItemDraft {
  const copy = cloneCatalogItemDraft(source);
  copy.rewardUid = newCatalogRewardUid(existingUids);
  const baseName = source.name.trim();
  copy.name = baseName ? `${baseName} (copy)` : "New reward (copy)";
  copy.status = "DRAFT";
  return copy;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function rewardCatalogDraftFromConfigRoot(configRoot: unknown): RewardCatalogDraft {
  const root = asObject(configRoot);
  const catalog = asObject(root?.rewardCatalog);
  if (!catalog) {
    return defaultRewardCatalogDraft();
  }

  const typesRaw = Array.isArray(catalog.rewardTypes) ? catalog.rewardTypes : [];
  const rewardTypes: RewardCatalogTypeDraft[] = typesRaw
    .map((t) => {
      const row = asObject(t);
      if (!row) return null;
      const typeCode = String(row.typeCode ?? "").trim();
      if (!typeCode) return null;
      return {
        typeCode,
        label: String(row.label ?? typeCode),
        description: String(row.description ?? ""),
      };
    })
    .filter((t): t is RewardCatalogTypeDraft => Boolean(t));

  const itemsRaw = Array.isArray(catalog.items) ? catalog.items : [];
  const items: RewardCatalogItemDraft[] = itemsRaw
    .map((it) => {
      const row = asObject(it);
      if (!row) return null;
      const rewardUid = String(row.rewardUid ?? "").trim();
      if (!rewardUid) return null;
      const status = String(row.status ?? "DRAFT").toUpperCase();
      const metadata = row.metadata;
      return {
        rewardUid,
        name: String(row.name ?? rewardUid),
        rewardType: String(row.rewardType ?? "CUSTOM"),
        status: (status === "ACTIVE" || status === "ARCHIVED" ? status : "DRAFT") as RewardCatalogItemStatus,
        pointsCost: typeof row.pointsCost === "number" ? row.pointsCost : Number(row.pointsCost) || 0,
        displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : 0,
        description: String(row.description ?? ""),
        metadataJson:
          metadata && typeof metadata === "object"
            ? JSON.stringify(metadata, null, 2)
            : "{}",
      };
    })
    .filter((i): i is RewardCatalogItemDraft => Boolean(i));

  return {
    version: typeof catalog.version === "number" ? catalog.version : 1,
    rewardTypes: rewardTypes.length ? rewardTypes : DEFAULT_REWARD_TYPES.map((t) => ({ ...t })),
    items: sortCatalogItemsByDisplayOrder(items),
  };
}

export function buildRewardCatalogJsonNode(draft: RewardCatalogDraft): Record<string, unknown> {
  return {
    version: draft.version,
    rewardTypes: draft.rewardTypes.map((t) => ({
      typeCode: t.typeCode.trim(),
      label: t.label.trim() || t.typeCode.trim(),
      description: t.description.trim(),
    })),
    items: draft.items.map((item, idx) => {
      let metadata: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(item.metadataJson || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, unknown>;
        }
      } catch {
        metadata = {};
      }
      return {
        rewardUid: item.rewardUid.trim(),
        name: item.name.trim() || item.rewardUid.trim(),
        rewardType: item.rewardType.trim() || "CUSTOM",
        status: item.status,
        pointsCost: item.pointsCost,
        displayOrder: item.displayOrder ?? idx,
        description: item.description.trim(),
        metadata,
      };
    }),
  };
}

export function mergeRewardCatalogIntoProgrammeConfig(
  configRoot: Record<string, unknown>,
  draft: RewardCatalogDraft
): Record<string, unknown> {
  return {
    ...configRoot,
    rewardCatalog: buildRewardCatalogJsonNode(draft),
  };
}

export function validateRewardCatalogDraft(draft: RewardCatalogDraft): string[] {
  const errors: string[] = [];
  const seenUids = new Set<string>();
  const typeCodes = new Set(draft.rewardTypes.map((t) => t.typeCode.trim()).filter(Boolean));

  for (const item of draft.items) {
    const uid = item.rewardUid.trim();
    if (!uid) {
      errors.push("Each reward needs a reward UID.");
      continue;
    }
    if (seenUids.has(uid)) {
      errors.push(`Duplicate reward UID: ${uid}`);
    }
    seenUids.add(uid);
    if (!item.name.trim()) {
      errors.push(`Reward ${uid}: name is required.`);
    }
    if (item.pointsCost <= 0) {
      errors.push(`Reward ${uid}: points cost must be greater than 0.`);
    }
    if (item.rewardType.trim() && typeCodes.size > 0 && !typeCodes.has(item.rewardType.trim())) {
      errors.push(`Reward ${uid}: reward type "${item.rewardType}" is not in your type list.`);
    }
    try {
      JSON.parse(item.metadataJson || "{}");
    } catch {
      errors.push(`Reward ${uid}: metadata must be valid JSON.`);
    }
  }
  return errors;
}

export function activeCatalogItems(draft: RewardCatalogDraft): RewardCatalogItemDraft[] {
  return draft.items.filter((i) => i.status === "ACTIVE");
}
