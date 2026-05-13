"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Layers, Cpu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const pills = [
  { icon: Layers, label: "4–6 week guided launch" },
  { icon: Cpu, label: "API expertise on your side" },
  { icon: Shield, label: "Enterprise-grade ops" },
] as const;

export function SectionHero() {
  const reduce = usePrefersReducedMotion();

  return (
    <section aria-labelledby="hero-heading" className="bg-brand-950 px-6 pb-16 pt-10 md:pb-24 md:pt-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-brand-300 text-sm font-semibold uppercase tracking-widest mb-4">
            Loyalty that ships on a real calendar
          </p>
          <h1 id="hero-heading" className="text-balance text-4xl font-bold tracking-tight text-white md:text-5xl">
            Loyalty programmes that launch in{" "}
            <span className="text-brand-200">4–6 weeks</span>, with our support.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-200/95 leading-relaxed mx-auto lg:mx-0">
            From strategy through integration and go-live—we work with your team. Expect API and webhook work with a developer
            who knows your stack; we provide documentation, sandbox keys, and hands-on guidance.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="#contact"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-14 rounded-xl border-0 bg-brand-500 px-8 text-base font-semibold text-white hover:bg-brand-400 hover:text-white"
              )}
            >
              Schedule strategy call
            </Link>
            <Link
              href="#timeline"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/25"
              )}
            >
              See what to expect
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pills.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left shadow-[var(--shadow-card)]"
              >
                <Icon className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                <span className="text-sm font-medium text-white/85">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduce ? { duration: 0 } : { duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-300/90">Honest timelines</p>
          <ul className="mt-6 space-y-4 text-sm text-white/85">
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>
                <strong className="text-white">Discovery & integration planning:</strong> weeks 1–2 (scopes vary by POS / stack).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>
                <strong className="text-white">Configuration & API testing:</strong> weeks 2–4 alongside your engineer.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>
                <strong className="text-white">Soft launch → full rollout:</strong> typically by week 4–6 after sign-off.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
              <span>
                <strong className="text-white">ROI you can defend:</strong> clearer leading indicators around months 3–4; sharper
                board-ready narrative by months 6+.
              </span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-white/45 leading-relaxed">
            Dedicated champions and predictable approval cycles compress schedules. Passive stakeholders extend them—we surface that
            early.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
