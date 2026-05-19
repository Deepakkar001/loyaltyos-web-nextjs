import type { OnboardingMetadataResponse } from "@/types/onboarding";

const CACHE_KEY = "loyaltyos:onboarding-metadata:v1";
const TTL_MS = 60 * 60 * 1000; // 1 hour — public dropdown data only (no secrets)

type Cached = {
  savedAt: number;
  data: OnboardingMetadataResponse;
};

export function readMetadataCache(): OnboardingMetadataResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.data || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeMetadataCache(data: OnboardingMetadataResponse): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { savedAt: Date.now(), data };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore
  }
}
