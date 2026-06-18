"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Building2, TrendingUp, Zap } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const METRICS = [
  { icon: Building2, value: 120, suffix: "+", label: "Enterprises onboarded", decimals: 0 },
  { icon: Zap, value: 4, suffix: " wks", label: "Avg. programme launch", decimals: 0 },
  { icon: TrendingUp, value: 99.9, suffix: "%", label: "Platform uptime", decimals: 1 },
] as const;

function MetricValue({
  value,
  suffix,
  decimals = 0,
  reduce,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  reduce: boolean;
}) {
  const count = useMotionValue(reduce ? value : 0);
  const display = useTransform(count, (v) =>
    decimals > 0 ? `${v.toFixed(decimals)}${suffix}` : `${Math.round(v).toLocaleString()}${suffix}`
  );

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.6,
    });
    return controls.stop;
  }, [count, reduce, value]);

  return <motion.span className="tabular-nums">{display}</motion.span>;
}

export function HeroMetricsStrip() {
  const reduce = usePrefersReducedMotion();

  return (
    <motion.div
      className="relative mt-8 border-t border-white/10 pt-8 md:mt-10 md:pt-10"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {METRICS.map(({ icon: Icon, value, suffix, label, decimals }, i) => (
          <motion.div
            key={label}
            className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: i * 0.1, duration: 0.4 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
              <Icon className="h-5 w-5 text-brand-400" aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                <MetricValue value={value} suffix={suffix} reduce={reduce} decimals={decimals} />
              </p>
              <p className="mt-0.5 text-xs text-white/50">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
