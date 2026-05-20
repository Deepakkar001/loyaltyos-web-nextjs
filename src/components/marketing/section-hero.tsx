"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Gift,
  Layers,
  Megaphone,
  Settings2,
  Webhook,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { HeroAmbientEffects } from "./hero-ambient-effects";
import { HeroLoyaltyVisual } from "./hero-loyalty-visual";
import { HeroMatrixSpotlight } from "./hero-matrix-spotlight";

const platformPills = [
  { icon: Megaphone, label: "Campaign management" },
  { icon: Gift, label: "Rewards & offers" },
  { icon: Settings2, label: "Loyalty rules engine" },
  { icon: BarChart3, label: "Member analytics" },
  { icon: Webhook, label: "POS & API integrations" },
] as const;

const stagger = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function HeroBackground({ reduce }: { reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(98,114,241,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_50%,rgba(139,92,246,0.12),transparent_50%)]" />
      <motion.div
        className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]"
        animate={reduce ? undefined : { x: [0, 30, 0], y: [0, -20, 0] }}
        transition={reduce ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-violet-600/15 blur-[90px]"
        animate={reduce ? undefined : { x: [0, -25, 0], y: [0, 15, 0] }}
        transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <HeroMatrixSpotlight />
      <HeroAmbientEffects />
    </div>
  );
}

export function SectionHero() {
  const reduce = usePrefersReducedMotion();

  const container = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.07 } },
      };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-brand-950 px-6 pb-20 pt-12 md:pb-28 md:pt-16"
    >
      <HeroBackground reduce={reduce} />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-14 lg:flex-row lg:items-center lg:gap-12">
        <motion.div
          className="flex-1 text-center lg:text-left"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div
            custom={0}
            variants={stagger}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              {!reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <Layers className="h-4 w-4 text-brand-300" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-200">
              Loyalty management platform
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            custom={1}
            variants={stagger}
            className="text-balance text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
          >
            Everything you need to{" "}
            <span className="hero-text-shimmer bg-gradient-to-r from-brand-200 via-white to-brand-300 bg-clip-text text-transparent">
              run, measure, and grow
            </span>{" "}
            customer loyalty
          </motion.h1>

          <motion.p
            custom={2}
            variants={stagger}
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-brand-100/90 lg:mx-0"
          >
            LoyaltyOS is a complete loyalty management system—launch campaigns, configure reward rules,
            track member behaviour, and connect to your POS and apps from one operator-ready platform.
          </motion.p>

          <motion.div
            custom={3}
            variants={stagger}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group relative h-14 overflow-hidden rounded-xl border-0 bg-brand-500 px-8 text-base font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:text-white"
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              Start your programme
            </Link>
            <Link
              href="#capabilities"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 rounded-xl border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white dark:border-white/25"
              )}
            >
              Explore the platform
            </Link>
          </motion.div>

          <motion.div custom={4} variants={stagger} className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400/80">
              What the platform provides
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              {platformPills.map(({ icon: Icon, label }, i) => (
                <motion.li
                  key={label}
                  initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduce ? { duration: 0 } : { delay: 0.45 + i * 0.06, duration: 0.35 }
                  }
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/85">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden />
                    {label}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 lg:pl-4"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroLoyaltyVisual />
          <p className="mt-4 text-center text-xs text-white/40 lg:text-left">
            Illustrative programme view—campaigns, rules, members, and analytics in one workspace.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
