import { AnimatedSection } from "./animated-section";
import { ComparisonPaths } from "./comparison-paths";
import { HeroLoyaltyFlow } from "./hero-loyalty-flow";
import { HeroMetricsStrip } from "./hero-metrics-strip";

const pains = [
  {
    title: "Implementation drift",
    body: "Loyalty roadmaps stall when integrations are underspecified or owned part-time.",
  },
  {
    title: "Blurry ROI",
    body: "Leadership freezes budgets when uplift cannot be traced to programme mechanics and cohorts.",
  },
  {
    title: "Channel silos",
    body: "In-store and digital experiences diverge, so customers see inconsistent earning and breakage.",
  },
  {
    title: "Support gaps",
    body: "Vendors optimise for signup, not sustained engineering partnership through production cutover.",
  },
] as const;

const solves = [
  {
    title: "Guided delivery",
    body: "Named milestones from discovery through soft launch—we do not disappear after paperwork.",
  },
  {
    title: "Operational transparency",
    body: "Dashboards for issuance, breakage, tiers, and redemptions—not vanity charts disconnected from finance.",
  },
  {
    title: "Webhook-first integrations",
    body: "API keys, sandbox replay, webhook verification workflows aligned with how your engineers already ship.",
  },
  {
    title: "Capacity you can budget",
    body: "Packaged onboarding hours plus clear overage mechanics so procurement sees the full footprint.",
  },
] as const;

export function SectionDifferentiation() {
  return (
    <AnimatedSection
      id="differentiation"
      aria-labelledby="diff-heading"
      className="scroll-mt-28 bg-slate-50 px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl mx-auto text-center">
          <h2 id="diff-heading" className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            What operators actually face—and how LoyaltyOS answers
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Business owners do not fear loyalty conceptually; they fear late launches, watered-down experiences, and numbers that
            do not survive a finance review.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-raised)] md:p-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Field reality</h3>
            <ul className="mt-6 space-y-5">
              {pains.map((p) => (
                <li key={p.title}>
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-brand-950 p-6 text-white shadow-[var(--shadow-raised)] md:p-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">Inside LoyaltyOS</h3>
            <ul className="mt-6 space-y-5">
              {solves.map((s) => (
                <li key={s.title}>
                  <p className="font-semibold text-white">{s.title}</p>
                  <p className="mt-1 text-sm text-brand-100/90 leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl bg-brand-950 px-6 py-10 shadow-[var(--shadow-raised)] md:px-10 md:py-12">
          <HeroLoyaltyFlow />
          <HeroMetricsStrip />
        </div>

        <ComparisonPaths />
      </div>
    </AnimatedSection>
  );
}
