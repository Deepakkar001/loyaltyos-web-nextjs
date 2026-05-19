"use client";

import { useEffect, useState } from "react";

/**
 * Avoids loader flash on fast operations — only shows UI after `delayMs`.
 * Security and data flow are unchanged; this is presentation-only.
 */
export function useDelayedVisible(active: boolean, delayMs = 280): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  return visible;
}
