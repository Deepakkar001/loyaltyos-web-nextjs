import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  return window.matchMedia(QUERY);
}

function subscribe(onStoreChange: () => void) {
  const mq = getMediaQuery();
  if (!mq) return () => {};
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return getMediaQuery()?.matches ?? false;
}

/**
 * `false` during SSR and on the first hydrated client pass so markup matches
 * server output that assumes motion is allowed; then the real preference applies.
 */
function getServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
