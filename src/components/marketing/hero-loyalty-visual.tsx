"use client";

import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

// Floating feature pills behind the dashboard card (disabled)
// const FEATURES = [
//   { icon: Megaphone, label: "Campaigns", color: "text-violet-300", bg: "bg-violet-500/20" },
//   { icon: Coins, label: "Points & rewards", color: "text-amber-300", bg: "bg-amber-500/20" },
//   { icon: Gift, label: "Offers", color: "text-emerald-300", bg: "bg-emerald-500/20" },
//   { icon: Users, label: "Members", color: "text-sky-300", bg: "bg-sky-500/20" },
//   { icon: BarChart3, label: "Analytics", color: "text-rose-300", bg: "bg-rose-500/20" },
//   { icon: Webhook, label: "Integrations", color: "text-brand-300", bg: "bg-brand-500/25" },
// ] as const;

const ACTIVITY_FEED = [
  { highlight: "Rule triggered", rest: "2× points on weekend purchases" },
  { highlight: "Campaign", rest: "Summer Rewards reached 18k members" },
  { highlight: "Webhook", rest: "points.balance.updated delivered" },
  { highlight: "Tier upgrade", rest: "142 members moved to Gold" },
] as const;

const SPARKLINE_HEIGHTS = [40, 55, 45, 70, 62, 85, 78, 92, 88, 100] as const;

function AnimatedCounter({
  target,
  reduce,
  suffix = "",
}: {
  target: number;
  reduce: boolean;
  suffix?: string;
}) {
  const count = useMotionValue(reduce ? target : 0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (reduce) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 });
    return controls.stop;
  }, [count, reduce, target]);

  return (
    <span className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

function MiniSparkline({ reduce }: { reduce: boolean }) {
  return (
    <div className="mt-3 flex h-8 items-end gap-0.5" aria-hidden>
      {SPARKLINE_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-sm bg-brand-400/70"
          initial={reduce ? { height: `${h}%` } : { height: "20%" }}
          animate={{ height: `${h}%` }}
          transition={
            reduce
              ? { duration: 0 }
              : { delay: 0.6 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          }
        />
      ))}
    </div>
  );
}

function ActivityTicker({ reduce }: { reduce: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % ACTIVITY_FEED.length), 4000);
    return () => clearInterval(id);
  }, [reduce]);

  const item = ACTIVITY_FEED[index];

  return (
    <div className="mt-4 flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5">
      <motion.div
        animate={reduce ? undefined : { rotate: [0, 8, -8, 0] }}
        transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${item.highlight}-${item.rest}`}
          className="text-xs text-white/70"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          <span className="font-medium text-white">{item.highlight}:</span> {item.rest}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function ShimmerBorder({ children, reduce }: { children: ReactNode; reduce: boolean }) {
  if (reduce) {
    return (
      <div className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-1 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        {children}
      </div>
    );
  }

  return (
    <div className="hero-shimmer-border shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
      <div className="relative rounded-[15px] bg-brand-950/95 backdrop-blur-sm">{children}</div>
    </div>
  );
}

function FloatingOrb({
  className,
  delay = 0,
  reduce,
}: {
  className: string;
  delay?: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-full blur-3xl", className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={
        reduce
          ? { opacity: 0.5, scale: 1 }
          : {
              opacity: [0.35, 0.55, 0.35],
              scale: [1, 1.08, 1],
              y: [0, -12, 0],
            }
      }
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 8, repeat: Infinity, ease: "easeInOut", delay }
      }
    />
  );
}

export function HeroLoyaltyVisual() {
  const reduce = usePrefersReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 6);
    rotateX.set(-y * 6);
  };

  const handleMouseLeave = () => {
    if (reduce) return;
    animate(rotateX, 0, { duration: 0.4 });
    animate(rotateY, 0, { duration: 0.4 });
  };

  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1200 }}
    >
      <FloatingOrb reduce={reduce} className="left-1/4 top-0 h-40 w-40 bg-brand-500/30" delay={0} />
      <FloatingOrb reduce={reduce} className="right-0 bottom-8 h-32 w-32 bg-violet-500/25" delay={1.2} />

      <motion.div
        className="relative"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <ShimmerBorder reduce={reduce}>
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                  L
                </span>
                <div>
                  <p className="text-xs font-medium text-white/50">Programme dashboard</p>
                  <p className="text-sm font-semibold text-white">Summer Rewards 2026</p>
                </div>
              </div>
              <motion.span
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
                animate={reduce ? undefined : { opacity: [1, 0.7, 1] }}
                transition={reduce ? undefined : { duration: 2.5, repeat: Infinity }}
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={reduce ? undefined : { scale: [1, 1.35, 1] }}
                  transition={reduce ? undefined : { duration: 1.5, repeat: Infinity }}
                />
                Live
              </motion.span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <motion.div
                className="col-span-2 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.35, duration: 0.45 }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-300/90">
                  Active members
                </p>
                <p className="mt-1 text-2xl font-bold text-white md:text-3xl">
                  <AnimatedCounter target={24850} reduce={reduce} />
                </p>
                <p className="mt-1 text-xs text-emerald-400/90">+12.4% vs last month</p>
                <MiniSparkline reduce={reduce} />
              </motion.div>

              <motion.div
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.5, duration: 0.4 }}
              >
                <p className="text-[10px] font-medium text-white/45">Points issued</p>
                <p className="mt-1 text-lg font-bold text-amber-200">
                  <AnimatedCounter target={1842000} reduce={reduce} suffix="+" />
                </p>
              </motion.div>

              <motion.div
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { delay: 0.58, duration: 0.4 }}
              >
                <p className="text-[10px] font-medium text-white/45">Redemptions</p>
                <p className="mt-1 text-lg font-bold text-violet-200">
                  <AnimatedCounter target={3420} reduce={reduce} />
                </p>
              </motion.div>
            </div>

            <ActivityTicker reduce={reduce} />
          </div>
        </ShimmerBorder>
      </motion.div>

      {/* Floating feature pills behind the dashboard card — disabled (see FEATURES above to re-enable) */}
    </div>
  );
}
