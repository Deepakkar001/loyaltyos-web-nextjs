"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, Building2, Check, Code2, Puzzle } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ComparisonPath = {
  lane: string;
  tagline: string;
  pain: string;
  us: string;
  icon: LucideIcon;
  accent: string;
  iconWrap: string;
  bar: string;
};

const paths: ComparisonPath[] = [
  {
    lane: "Typical storefront plugin",
    tagline: "Fast start, narrow ceiling",
    pain: "Works for a single stack; fractures when franchises, custom POS, or multi-brand logic appear.",
    us: "LoyaltyOS maps to your owned channels and transactional reality—not one monolith SKU list.",
    icon: Puzzle,
    accent: "text-violet-700",
    iconWrap: "bg-violet-100 text-violet-700",
    bar: "from-violet-400 via-violet-500 to-violet-600",
  },
  {
    lane: "Legacy enterprise rollout",
    tagline: "Heavy process, slow signal",
    pain: "Multi-quarter deployments, change boards, and brittle custom code paths before value shows up.",
    us: "A modern SaaS core with repeatable onboarding—you steer scope instead of restarting annually.",
    icon: Building2,
    accent: "text-amber-800",
    iconWrap: "bg-amber-100 text-amber-800",
    bar: "from-amber-400 via-amber-500 to-orange-500",
  },
  {
    lane: "In-house-only build",
    tagline: "Full control, full carry",
    pain: "High talent cost and opportunity cost while product priorities compete for the same squad.",
    us: "Offload loyalty infrastructure; keep differentiated experiences in your product layer.",
    icon: Code2,
    accent: "text-sky-800",
    iconWrap: "bg-sky-100 text-sky-800",
    bar: "from-sky-400 via-sky-500 to-cyan-500",
  },
];

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export function ComparisonPaths() {
  const reduce = usePrefersReducedMotion();

  return (
    <div className="relative mt-12">
      {/* Ambient backdrop */}
      <div
        className="pointer-events-none absolute -inset-x-4 -inset-y-6 rounded-[2rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl border border-white/60 bg-gradient-to-b from-white via-slate-50/90 to-slate-100/50 shadow-[var(--shadow-raised)]"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-8 backdrop-blur-sm md:p-10 lg:p-12">
        {/* Header */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
              Alternative approaches
            </span>
            <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Compared with common paths
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
              Illustrative lanes—not a dated feature matrix claiming live parity with named vendors on every knob.
              Use this to frame trade-offs with finance and engineering, not as a competitive scorecard.
            </p>
          </div>

          <div
            className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 text-xs font-medium text-slate-600"
            role="presentation"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
              Typical friction
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              LoyaltyOS angle
            </span>
          </div>
        </div>

        {/* Cards */}
        <motion.div
          className="mt-10 grid gap-6 lg:grid-cols-3"
          variants={reduce ? undefined : listVariants}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={{ once: true, margin: "-48px" }}
        >
          {paths.map((row, index) => (
            <motion.article
              key={row.lane}
              variants={reduce ? undefined : cardVariants}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-card)] transition-shadow duration-300 hover:border-slate-300 hover:shadow-[var(--shadow-hover)]"
            >
              <div className={`h-1 w-full bg-gradient-to-r ${row.bar}`} aria-hidden />

              <div className="flex flex-1 flex-col p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${row.iconWrap}`}
                  >
                    <row.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="font-mono text-xs font-medium tabular-nums text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h4 className="mt-5 text-lg font-bold leading-snug text-slate-900">{row.lane}</h4>
                <p className={`mt-1 text-sm font-medium ${row.accent}`}>{row.tagline}</p>

                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/90 p-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Typical friction
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{row.pain}</p>
                </div>

                <div className="my-4 flex justify-center" aria-hidden>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors group-hover:border-brand-200 group-hover:text-brand-600">
                    <ArrowDown className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-auto rounded-xl border border-brand-100/90 bg-gradient-to-br from-brand-50/90 via-white to-white p-4 ring-1 ring-inset ring-brand-100/50">
                  <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-brand-800">
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" strokeWidth={2.5} aria-hidden />
                    LoyaltyOS angle
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-800">{row.us}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
