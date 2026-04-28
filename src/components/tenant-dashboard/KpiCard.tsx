"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ResponsiveContainer, Line, LineChart } from "recharts";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

type StatusTone = "good" | "warn" | "critical" | "info";

const toneStyles: Record<
  StatusTone,
  { spark: string; trendUp: string; trendDown: string; trendNeutral: string }
> = {
  good: {
    spark: "var(--status-positive)",
    trendUp: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    trendDown: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    trendNeutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  warn: {
    spark: "var(--status-warning)",
    trendUp: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    trendDown: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    trendNeutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  critical: {
    spark: "var(--status-critical)",
    trendUp: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    trendDown: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    trendNeutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  info: {
    spark: "var(--accent-primary)",
    trendUp: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    trendDown: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    trendNeutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

type ValueType = "number" | "points" | "currency" | "percent";

function formatKpiValue(value: number, type: ValueType): string {
  if (!Number.isFinite(value)) return "-";
  if (type === "percent") return `${value.toFixed(1)}%`;

  const abs = Math.abs(value);
  const abbrev = (v: number) => {
    if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return Math.round(v).toLocaleString("en-US");
  };

  if (type === "currency") return `₹${abbrev(value)}`;
  if (type === "points") return `${abbrev(value)} pts`;
  return abbrev(value);
}

export function KpiCard({
  title,
  value,
  unit,
  tone,
  trendPct,
  sparkline,
  onClick,
  valueFormat,
}: {
  title: string;
  value: number;
  unit?: string;
  tone: StatusTone;
  trendPct: number;
  sparkline: { x: string; y: number }[];
  onClick?: () => void;
  valueFormat?: (v: number) => string;
}) {
  const isUp = trendPct >= 0;
  const isNeutral = Math.abs(trendPct) < 0.05;
  const trendLabel = isNeutral ? "→ 0%" : `${isUp ? "↑" : "↓"} ${Math.abs(trendPct).toFixed(1)}%`;
  const toneDef = toneStyles[tone];

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      transition={{ duration: 0.12 }}
      className={cn(onClick && "cursor-pointer")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      aria-label={onClick ? `${title} details` : undefined}
    >
      <div
        className={cn(
          "bg-[var(--surface-card)] rounded-2xl p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow duration-200 border-0",
          onClick && "cursor-pointer"
        )}
      >
        <div className="flex flex-col h-full min-h-[148px] min-w-0">
          <p className="metric-label text-muted-foreground truncate">{title}</p>

          <div className="mt-2">
            <p className="kpi-value whitespace-nowrap overflow-hidden text-ellipsis">
              <AnimatedNumber
                value={value}
                format={
                  valueFormat ??
                  ((v) =>
                    formatKpiValue(
                      v,
                      unit === "%"
                        ? "percent"
                        : unit === "₹"
                          ? "currency"
                          : unit === "pts"
                            ? "points"
                            : "number"
                    ))
                }
              />
            </p>

            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-2 whitespace-nowrap",
                isNeutral ? toneDef.trendNeutral : isUp ? toneDef.trendUp : toneDef.trendDown
              )}
            >
              {isNeutral ? null : isUp ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trendLabel}
            </span>
          </div>

          <div className="mt-auto pt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                type="monotone"
                dataKey="y"
                stroke={toneDef.spark}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

