import { AnimatedSection } from "./animated-section";

const scenarios = [
  {
    vertical: "Multi-unit coffee chain",
    timeline:
      "Weeks 2–5: webhook alignment with refreshed POS payloads; weeks 5–8: phased regional launch; optimisation cycles through month 4.",
    stats: ["+26 pts repeat-week rate within six months post–soft launch ", "Finance-grade cohort exports by month 3"],
    quote:
      "Leadership stopped asking IF the programme worked once we correlated visits to explicit earn events instead of proxies.",
    role: "VP Operations • 132 locations • representative rollout",
  },
  {
    vertical: "Omnichannel speciality retail",
    timeline: "Six-week technical track with two integration spikes; ecommerce parity after week 8; loyalty A/B by month 2.",
    stats: ["AOV +9% directional lift in loyalty-identified baskets (months 4–7)", "Store associate training cut to two micro-modules"],
    quote:
      "We finally match how customers behave—not how channels want to slice them—and the breakage story is coherent with accounting.",
    role: "Head of CX • Domestic + DTC • illustrative scenario",
  },
  {
    vertical: "Franchised food service",
    timeline: "Franchisor template in week 2; twelve franchisees on sandbox by week 5; rollout waves through week 11.",
    stats: ["Churn wedge reduced for high-frequency guests (internal proxy metric)", "Support tickets trending down MoM once rules stabilised"],
    quote:
      "Franchisees saw the rollout calendar in plain language—they stopped assuming IT was deliberately blocking them.",
    role: "Programme Owner • illustrative scenario",
  },
] as const;

export function SectionCaseStudies() {
  return (
    <AnimatedSection id="proof" aria-labelledby="proof-heading" className="scroll-mt-28 bg-white px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl mx-auto text-center">
          <h2 id="proof-heading" className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Representative timelines & outcomes
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Composite stories based on how mixed retail and F&B teams actually implement—not guaranteed projections for any one tenant.
            Your programme economics stay yours; we expose levers cleanly.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {scenarios.map((s) => (
            <figure
              key={s.vertical}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-emerald-50/40 p-6 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)]"
            >
              <figcaption className="text-xs font-semibold uppercase tracking-widest text-emerald-800">{s.vertical}</figcaption>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Recorded cadence</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.timeline}</p>
              <ul className="mt-6 space-y-2 text-sm font-medium text-slate-800 flex-1">
                {s.stats.map((stat) => (
                  <li key={stat} className="rounded-lg bg-white/80 px-3 py-2 font-mono text-xs md:text-[13px] leading-snug shadow-sm">
                    {stat}
                  </li>
                ))}
              </ul>
              <blockquote className="mt-6 border-l-2 border-brand-400 pl-4 text-sm italic text-slate-700 leading-relaxed">
                “{s.quote}”
              </blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.role}</p>
            </figure>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
