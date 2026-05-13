import Link from "next/link";
import { AnimatedSection } from "./animated-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Starter",
    price: "$499",
    caption: "/ month • illustrative packaging",
    blurb: "Prove structure with a pragmatic footprint before expanding rule complexity.",
    included: ["Up to ~100k active members footprint", "Core rules catalogue (five concurrent automations)", "Email support (targets 48h response)"],
    setup: ["5 onboarding hours included", "Additional delivery: billed at $150 / hr thereafter"],
    cta: { href: "#contact", label: "Discuss Starter" },
    emphasized: false,
  },
  {
    name: "Professional",
    badge: "Most teams land here first",
    price: "$1,499",
    caption: "/ month • illustrative packaging",
    blurb: "Full depth for marketers and operators juggling multiple banners or geographies.",
    included: ["Unlimited members in practical terms", "Unlimited rules iterations with guardrails", "Priority queues (targets 24h response)"],
    setup: ["20 onboarding hours included", "Additional delivery: billed at $125 / hr thereafter"],
    cta: { href: "#contact", label: "Scope Professional" },
    emphasized: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    caption: "Procurement-ready statements of work",
    blurb: "Dedicated partner coverage, customised training, tighter launch guarantees when prerequisites are met.",
    included: ["Account leader + named solutions engineer", "Workshops for franchise or partner councils", "Data migration playbook as applicable"],
    setup: ["Full implementation + optimisation window negotiated", "Blended milestone billing instead of opaque change orders"],
    cta: { href: "#contact", label: "Talk Enterprise" },
    emphasized: false,
  },
] as const;

export function SectionPricing() {
  return (
    <AnimatedSection id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-28 bg-white px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl mx-auto text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Transparent tiers—especially the unpaid hours nobody talks about
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Figures shown are directional until your order form is countersigned—they exist so internal champions can preview how we
            think about fairness between subscription and labour.
          </p>
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "flex flex-col rounded-2xl border p-8 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)] " +
                (t.emphasized
                  ? "border-brand-400 bg-gradient-to-b from-brand-50/70 to-white ring-2 ring-brand-200 lg:scale-[1.02]"
                  : "border-slate-200 bg-white")
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{t.name}</h3>
                {"badge" in t && t.badge ? <Badge variant="secondary">{t.badge}</Badge> : null}
              </div>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-brand-900">{t.price}</span>
                <span className="text-sm text-slate-500">{t.caption}</span>
              </p>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">{t.blurb}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-800">
                {t.included.map((line) => (
                  <li key={line} className="flex gap-2 leading-relaxed">
                    <span className="mt-1 text-emerald-500 font-bold">✓</span>
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-900">Setup fairness</p>
                {t.setup.map((line) => (
                  <p key={line} className="mt-2">
                    {line}
                  </p>
                ))}
              </div>
              <Link
                href={t.cta.href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-6 h-12 w-full rounded-xl border-0 bg-brand-500 font-semibold text-white hover:bg-brand-400 hover:text-white"
                )}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-3xl mx-auto text-center text-sm text-slate-500 leading-relaxed">
          Annual prepay typically attracts a modest discount—we model that during contract drafting. Change-tier anytime; uplift /
          downgrade paths stay straightforward so there is no punishment for learning.
        </p>
      </div>
    </AnimatedSection>
  );
}
