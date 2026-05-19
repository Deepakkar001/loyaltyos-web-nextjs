import { tenantConfigApi } from "@/lib/api/client";

export type TenantTierOption = { tierUid: string; tierName: string };

/** Tiers from `tier_definitions` via tenant config API (tier_uid + name). */
export async function fetchTenantTierOptions(): Promise<TenantTierOption[]> {
  const cfg = (await tenantConfigApi.getMyConfig()) as {
    tiers?: Array<{ tierUid?: string; name?: string; tierName?: string }>;
  };
  return (cfg?.tiers ?? [])
    .filter((t): t is { tierUid: string; name?: string; tierName?: string } =>
      Boolean(t.tierUid?.trim())
    )
    .map((t) => {
      const tierUid = t.tierUid.trim();
      const tierName = (t.tierName ?? t.name ?? "").trim() || tierUid;
      return { tierUid, tierName };
    });
}
