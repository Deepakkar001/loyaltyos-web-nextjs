"use client";

import { cn } from "@/lib/utils";

export function CampaignBudgetProgress({
  consumedPct,
  className,
}: {
  consumedPct: number;
  className?: string;
}) {
  const pct = Number.isFinite(consumedPct) ? Math.min(100, Math.max(0, consumedPct)) : 0;

  return (
    <div className={cn("min-w-[120px] space-y-1", className)}>
      <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
        <span>Budget</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
