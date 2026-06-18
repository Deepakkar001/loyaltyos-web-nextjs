"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Coffee, Quote, ShoppingBag, TrendingUp, UtensilsCrossed } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ScenarioPhase = { label: string; detail: string };

type Scenario = {
  vertical: string;
  descriptor: string;
  phases: ScenarioPhase[];
  stats: string[];
  quote: string;
  role: string;
  icon: LucideIcon;
  bar: string;
  badge: string;
  phaseDot: string;
  phaseLine: string;
};

const scenarios: Scenario[] = [
  {
    vertical: "Multi-unit coffee chain",
    descriptor: "132 locations · phased regional rollout",
    phases: [
      { label: "Wk 2–5", detail: "Webhook alignment with refreshed POS payloads" },
      { label: "Wk 5–8", detail: "Phased regional soft launch" },
      { label: "Mo 4", detail: "Optimisation cycles on live cohorts" },
    ],
    stats: [
      "+26 pts repeat-week rate within six months post–soft launch",
      "Finance-grade cohort exports by month 3",
    ],
    quote:
      "Leadership stopped asking IF the programme worked once we correlated visits to explicit earn events instead of proxies.",
    role: "VP Operations • representative rollout",
    icon: Coffee,
    bar: "from-emerald-400 via-emerald-500 to-teal-600",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200/80",
    phaseDot: "bg-emerald-500 ring-emerald-100",
    phaseLine: "from-emerald-200 to-emerald-400",
  },
  {
    vertical: "Omnichannel speciality retail",
    descriptor: "Domestic + DTC · six-week technical track",
    phases: [
      { label: "Wk 1–6", detail: "Integration spikes and sandbox validation" },
      { label: "Wk 8", detail: "Ecommerce parity with in-store earn" },
      { label: "Mo 2–7", detail: "Loyalty A/B and basket analysis" },
    ],
    stats: [
      "AOV +9% directional lift in loyalty-identified baskets (months 4–7)",
      "Associate training cut to two micro-modules",
    ],
    quote:
      "We finally match how customers behave—not how channels want to slice them—and the breakage story is coherent with accounting.",
    role: "Head of CX • illustrative scenario",
    icon: ShoppingBag,
    bar: "from-brand-400 via-indigo-500 to-violet-600",
    badge: "bg-brand-100 text-brand-900 border-brand-200/80",
    phaseDot: "bg-brand-500 ring-brand-100",
    phaseLine: "from-brand-200 to-indigo-300",
  },
  {
    vertical: "Franchised food service",
    descriptor: "12 franchisees · templated franchisor rollout",
    phases: [
      { label: "Wk 2", detail: "Franchisor programme template locked" },
      { label: "Wk 5", detail: "Twelve franchisees on sandbox" },
      { label: "Wk 11", detail: "Rollout waves complete" },
    ],
    stats: [
      "Churn wedge reduced for high-frequency guests (internal proxy)",
      "Support tickets trending down MoM once rules stabilised",
    ],
    quote:
      "Franchisees saw the rollout calendar in plain language—they stopped assuming IT was deliberately blocking them.",
    role: "Programme Owner • illustrative scenario",
    icon: UtensilsCrossed,
    bar: "from-amber-400 via-orange-500 to-amber-600",
    badge: "bg-amber-100 text-amber-900 border-amber-200/80",
    phaseDot: "bg-amber-500 ring-amber-100",
    phaseLine: "from-amber-200 to-orange-300",
  },
];

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

function TimelineRail({
  phases,
  dotClass,
  lineClass,
}: {
  phases: ScenarioPhase[];
  dotClass: string;
  lineClass: string;
}) {
  return (
    <ol className="relative mt-6 space-y-0">
      {phases.map((phase, i) => (
        <li key={phase.label} className="relative flex gap-4 pb-6 last:pb-0">
          {i < phases.length - 1 ? (
            <span
              className={`absolute left-[0.4375rem] top-3 h-[calc(100%-0.25rem)] w-px bg-gradient-to-b ${lineClass}`}
              aria-hidden
            />
          ) : null}
          <span
            className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ${dotClass}`}
            aria-hidden
          />
          <div className="min-w-0 pt-0.5">
            <p className="font-mono text-xs font-semibold tabular-nums text-slate-500">{phase.label}</p>
            <p className="mt-0.5 text-sm leading-snug text-slate-700">{phase.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProofScenarios() {
  const reduce = usePrefersReducedMotion();

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-x-6 top-0 h-72 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(16,185,129,0.1),transparent_60%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center lg:max-w-4xl">
          <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
            Representative outcomes
          </span>
          <h2
            id="proof-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            Timelines teams actually run
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Composite stories from mixed retail and F&B implementations—not guaranteed projections for any one tenant.
            Your programme economics stay yours; we expose levers cleanly.
          </p>
        </div>

        {/* Cards */}
        <motion.div
          className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-5 xl:gap-6"
          variants={reduce ? undefined : listVariants}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={{ once: true, margin: "-56px" }}
        >
          {scenarios.map((s, index) => (
            <motion.figure
              key={s.vertical}
              variants={reduce ? undefined : cardVariants}
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:border-slate-300 hover:shadow-[var(--shadow-hover)] ${
                index === 1 ? "lg:-translate-y-1 lg:shadow-[var(--shadow-raised)]" : ""
              }`}
            >
              <div className={`h-1.5 w-full bg-gradient-to-r ${s.bar}`} aria-hidden />

              <div className="flex flex-1 flex-col p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm ${s.badge}`}
                    >
                      <s.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                    <div>
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${s.badge}`}
                      >
                        {s.vertical}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{s.descriptor}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Recorded cadence
                  </p>
                  <TimelineRail phases={s.phases} dotClass={s.phaseDot} lineClass={s.phaseLine} />
                </div>

                <ul className="mt-2 space-y-2">
                  {s.stats.map((stat) => (
                    <li
                      key={stat}
                      className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-sm font-medium leading-snug text-slate-800"
                    >
                      <TrendingUp
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{stat}</span>
                    </li>
                  ))}
                </ul>

                <blockquote className="relative mt-6 flex-1 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                  <Quote
                    className="absolute right-3 top-3 h-8 w-8 text-slate-200"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="relative text-sm italic leading-relaxed text-slate-700">
                    &ldquo;{s.quote}&rdquo;
                  </p>
                </blockquote>

                <figcaption className="mt-4 border-t border-slate-100 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {s.role}
                </figcaption>
              </div>
            </motion.figure>
          ))}
        </motion.div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
          Metrics shown are directional and illustrative. Validate against your baseline, regions, and earn mechanics
          before board or investor circulation.
        </p>
      </div>
    </div>
  );
}
