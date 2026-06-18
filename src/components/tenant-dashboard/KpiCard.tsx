"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  Coins,
  Gift,
  IndianRupee,
  Percent,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { KpiSparkline, type KpiChartType } from "./KpiSparkline";

type StatusTone = "good" | "warn" | "critical" | "info";
export type KpiVariant = "royal" | "emerald" | "amber" | "sky" | "violet";

type ValueType = "number" | "points" | "currency" | "percent";

const KPI_PALETTES: Record<
  KpiVariant,
  { gradient: string; glow: string; chartType: KpiChartType }
> = {
  royal: {
    gradient: "from-[#4A90E2] via-[#3D7FD6] to-[#2E6BBF]",
    glow: "rgba(46, 107, 191, 0.45)",
    chartType: "line",
  },
  emerald: {
    gradient: "from-[#10c2c5] via-[#06b3c3] to-[#00ccb4]",
    glow: "rgba(39, 174, 96, 0.45)",
    chartType: "area",
  },
  amber: {
    gradient: "from-[#F5B041] via-[#F39C12] to-[#D68910]",
    glow: "rgba(243, 156, 18, 0.45)",
    chartType: "bar",
  },
  sky: {
    gradient: "from-[#00A8FF] via-[#0097E6] to-[#0080CC]",
    glow: "rgba(0, 151, 230, 0.45)",
    chartType: "line",
  },
  violet: {
    gradient: "from-[#8B83F4] via-[#5B4FE8] to-[#4f56e3]",
    glow: "rgba(91, 79, 232, 0.45)",
    chartType: "area",
  },
};

const TONE_DEFAULT_VARIANT: Record<StatusTone, KpiVariant> = {
  good: "emerald",
  warn: "amber",
  critical: "amber",
  info: "sky",
};

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

function resolveKpiIcon(title: string): LucideIcon {
  const label = title.toLowerCase();

  if (label.includes("at-risk") || label.includes("risk")) return AlertTriangle;
  if (label.includes("conversion") || label.includes("rate")) return Percent;
  if (label.includes("referral") && label.includes("reward")) return Award;
  if (label.includes("referral")) return UserPlus;
  if (label.includes("customer") || label.includes("member") || label.includes("user")) return Users;
  if (label.includes("redemption")) return Gift;
  if (label.includes("order") || label.includes("revenue") || label.includes("avg")) return IndianRupee;
  if (label.includes("point")) return Coins;

  return TrendingUp;
}

function resolveValueType(unit?: string): ValueType {
  if (unit === "%") return "percent";
  if (unit === "₹") return "currency";
  if (unit === "pts") return "points";
  return "number";
}

export function KpiCard({
  title,
  value,
  unit,
  tone,
  variant,
  trendPct,
  sparkline,
  onClick,
  valueFormat,
  trendLabel = "from previous period",
}: {
  title: string;
  value: number;
  unit?: string;
  tone: StatusTone;
  variant?: KpiVariant;
  trendPct: number;
  sparkline: { x: string; y: number }[];
  onClick?: () => void;
  valueFormat?: (v: number) => string;
  trendLabel?: string;
}) {
  const palette = KPI_PALETTES[variant ?? TONE_DEFAULT_VARIANT[tone]];
  const Icon = resolveKpiIcon(title);
  const isUp = trendPct >= 0;
  const isNeutral = Math.abs(trendPct) < 0.05;
  const trendPrefix = isNeutral ? "→ 0%" : `${isUp ? "↑" : "↓"} ${Math.abs(trendPct).toFixed(1)}%`;
  const valueType = resolveValueType(unit);

  return (
    <motion.div
      className={cn("group/kpi", onClick && "cursor-pointer")}
      whileHover={onClick ? { y: -4 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
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
          "relative min-h-[156px] overflow-hidden rounded-2xl p-[1px] transition-[transform,box-shadow] duration-300",
          "shadow-[0_2px_0_rgba(255,255,255,0.35)_inset,0_12px_28px_-8px_rgba(0,0,0,0.35),0_4px_12px_-4px_rgba(0,0,0,0.2)]",
          "group-hover/kpi:shadow-[0_2px_0_rgba(255,255,255,0.42)_inset,0_22px_44px_-10px_rgba(0,0,0,0.38),0_8px_18px_-6px_rgba(0,0,0,0.22)]",
          onClick && "cursor-pointer"
        )}
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 40%, rgba(0,0,0,0.12) 100%)`,
          boxShadow: `0 18px 36px -14px ${palette.glow}, 0 8px 16px -8px rgba(0,0,0,0.28)`,
        }}
      >
        <div className="relative min-h-[154px] overflow-hidden rounded-[calc(1rem-1px)]">
          {/* Base gradient — unchanged palette */}
          <div className={cn("absolute inset-0 bg-gradient-to-br", palette.gradient)} />

          {/* Depth + glass sheen layers (card only, not chart) */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
          <div className="absolute inset-x-3 bottom-0 h-px bg-black/15" />
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-black/15 blur-2xl" />

          <div className="relative z-10 flex min-h-[154px] flex-col gap-3 p-4 sm:p-5">
            {/* Glass header strip */}
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 ">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_6px_rgba(0,0,0,0.12)]">
                <Icon className="h-4 w-4 text-white drop-shadow-sm" aria-hidden />
              </span>
              <p className="min-w-0 text-xs font-semibold leading-tight tracking-wide text-white drop-shadow-sm whitespace-nowrap sm:text-sm">
                {title}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 items-end gap-2">
              {/* Glass metrics panel — no glass on chart side */}
              <div className="min-w-0 flex-1 rounded-xl px-3 py-2.5">
                <p className="text-[1.75rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0, 0, 0, 0.333)]">
                  <AnimatedNumber
                    value={value}
                    format={valueFormat ?? ((v) => formatKpiValue(v, valueType))}
                  />
                </p>

                <div className="mt-2.5 inline-flex max-w-full items-center gap-1 rounded-full border border-white/15 bg-black/15 px-2 py-0.5 text-[11px] font-medium text-white/90 sm:text-xs">
                  {isNeutral ? null : isUp ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-green-500" aria-hidden />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
                  )}
                  <span className="truncate">
                    {trendPrefix} {trendLabel}
                  </span>
                </div>
              </div>

              {/* Sparkline — direct on gradient, no glass wrapper */}
              <div className="relative h-[72px] w-[38%] max-w-[7.5rem] shrink-0 min-[480px]:w-[42%]">
                <KpiSparkline sparkline={sparkline} chartType={palette.chartType} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
