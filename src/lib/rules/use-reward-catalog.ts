import { useCallback, useEffect, useState } from "react";

import { programmeApiV2, ensureAuthSession } from "@/lib/api/client";
import {
  activeCatalogItems,
  rewardCatalogDraftFromConfigRoot,
  type RewardCatalogDraft,
  type RewardCatalogItemDraft,
} from "@/lib/programme/reward-catalog-merge";

export function useRewardCatalog(programmeUid: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RewardCatalogDraft | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureAuthSession();
      const res = await programmeApiV2.getProgrammeConfig(programmeUid || "default");
      const catalog = rewardCatalogDraftFromConfigRoot(res.config ?? {});
      setDraft(catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reward catalog");
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [programmeUid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeItems: RewardCatalogItemDraft[] = draft ? activeCatalogItems(draft) : [];

  return { loading, error, draft, activeItems, reload };
}
