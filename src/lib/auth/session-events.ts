/** Dispatched after a successful silent token refresh (e.g. SESSION_STALE recovery). */
export const SESSION_REFRESHED_EVENT = "loyaltyos:session-refreshed";

export function dispatchSessionRefreshed(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_REFRESHED_EVENT));
}
