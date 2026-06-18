"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ProgressBarItem = {
  key: string;
  label: ReactNode;
  /** Bar fill percentage (0–100). */
  value: number;
  /** Right-side value (e.g. `80%` or member count). */
  suffix?: ReactNode;
  /** Optional secondary line under the label (detailed layout). */
  leadingMeta?: ReactNode;
};

export type ProgressBarProps = {
  items: ProgressBarItem[];
  className?: string;
  /**
   * `compact` — label | bar | suffix (Retention Rate tier strip).
   * `detailed` — label + meta | bar | suffix (Member Tier Distribution).
   */
  variant?: "compact" | "detailed";
  animate?: boolean;
  emptyMessage?: ReactNode;
};

function ProgressBarTrack({
  value,
  animate,
  delay = 0,
}: {
  value: number;
  animate?: boolean;
  delay?: number;
}) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  const fillClass = "h-9 rounded-md bg-[var(--accent-primary)]";

  if (animate) {
    return (
      <div className="flex-1 overflow-hidden rounded-md bg-gray-200 h-9 dark:bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.6, delay }}
          className={fillClass}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-md bg-gray-200 h-9 dark:bg-white/10">
      <div className={cn(fillClass, "transition-all")} style={{ width }} />
    </div>
  );
}

export function ProgressBar({
  items,
  className,
  variant = "compact",
  animate = false,
  emptyMessage,
}: ProgressBarProps) {
  if (items.length === 0) {
    if (emptyMessage) {
      return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
    }
    return null;
  }

  return (
    <div className={cn(variant === "compact" ? "space-y-2" : "space-y-3", className)}>
      {items.map((item, index) => (
        <div
          key={item.key}
          className={cn("flex items-center", variant === "compact" ? "gap-3" : "gap-4")}
        >
          {variant === "compact" ? (
            <span className="w-16 truncate text-xs text-muted-foreground">{item.label}</span>
          ) : (
            <div className="w-28">
              <p className="text-xs font-medium">{item.label}</p>
              {item.leadingMeta ? (
                <p className="text-[11px] text-muted-foreground tabular-nums">{item.leadingMeta}</p>
              ) : null}
            </div>
          )}
          <ProgressBarTrack value={item.value} animate={animate} delay={index * 0.08} />
          {item.suffix != null ? (
            <span
              className={cn(
                "shrink-0 tabular-nums",
                variant === "compact"
                  ? "w-10 text-right text-xs font-semibold"
                  : "w-20 text-right text-sm font-semibold",
              )}
            >
              {item.suffix}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
