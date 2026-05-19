import { createExpiringLocalStorage } from "@/lib/store/expiring-storage";
import type { CampaignFormState } from "@/lib/campaigns/campaign-form";
import { defaultCreateFormState } from "@/lib/campaigns/campaign-form";

const storage =
  typeof window === "undefined" ? null : createExpiringLocalStorage(7 * 24 * 60 * 60 * 1000);

function draftKey(tenantId: string) {
  return `campaign-create-draft:${tenantId}`;
}

function safeParse(raw: string | null): CampaignFormState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as CampaignFormState) : null;
  } catch {
    return null;
  }
}

export function loadCampaignCreateDraft(tenantId: string | null | undefined): CampaignFormState | null {
  if (!storage || !tenantId) return null;
  return safeParse(storage.getItem(draftKey(tenantId)));
}

export function saveCampaignCreateDraft(tenantId: string | null | undefined, form: CampaignFormState) {
  if (!storage || !tenantId) return;
  storage.setItem(draftKey(tenantId), JSON.stringify(form));
}

export function clearCampaignCreateDraft(tenantId: string | null | undefined) {
  if (!storage || !tenantId) return;
  storage.removeItem(draftKey(tenantId));
}

/** True when the current page load is a browser refresh (F5), not client-side routing. */
export function isBrowserPageReload(): boolean {
  if (typeof window === "undefined") return false;
  const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (entries[0]?.type === "reload") return true;
  const legacy = performance as Performance & { navigation?: { type?: number } };
  return legacy.navigation?.type === 1;
}

export function mergeCampaignCreateDraft(
  tenantId: string | null | undefined,
  partial: Partial<CampaignFormState>
): CampaignFormState {
  const base = loadCampaignCreateDraft(tenantId) ?? defaultCreateFormState();
  const merged = { ...base, ...partial };
  saveCampaignCreateDraft(tenantId, merged);
  return merged;
}
