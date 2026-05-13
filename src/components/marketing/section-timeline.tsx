import { AnimatedSection } from "./animated-section";

const phases = [
  {
    title: "Weeks 1–2",
    name: "Discovery & planning",
    items: ["Strategy intake and success criteria", "Template selection for your vertical", "Integration plan: APIs, webhooks, identifiers"],
  },
  {
    title: "Weeks 2–4",
    name: "Setup & onboarding",
    items: ["Tenant onboarding and governance checks", "Programme rules, tiers, rewards configuration", "Developer pairing: sandbox keys and event validation"],
  },
  {
    title: "Weeks 4–6",
    name: "Launch & go-live",
    items: ["Pilot cohort or regional soft launch", "Monitoring, adjustments, escalation paths", "Full rollout after stakeholder sign-off"],
  },
  {
    title: "Months 2–3",
    name: "Optimization",
    items: ["Behavior-based tuning of earn / burn mechanics", "Offer experiments with measured guardrails", "Operations training on dashboard workflows"],
  },
  {
    title: "Months 3–6",
    name: "Measure & prove",
    items: ["Repeat visit and cohort trends", "AOV movement with confidence intervals", "ROI narrative tailored for finance and marketing leadership"],
  },
] as const;

export function SectionTimeline() {
  return (
    <AnimatedSection
      id="timeline"
      aria-labelledby="timeline-heading"
      className="scroll-mt-28 bg-gradient-to-b from-white via-slate-50/50 to-white px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Delivery roadmap</p>
          <h2 id="timeline-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            What to expect
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            A phased model you can share internally—no vapourware. Pace depends on approvals, catalogue complexity, and integration
            surface area.
          </p>
        </div>

        <div className="mt-14 md:mt-16 rounded-2xl border border-slate-200/90 bg-white p-7 shadow-[var(--shadow-raised)] md:p-10 md:pb-11">
          <ol className="m-0 list-none p-0">
            {phases.map((phase, idx) => {
              const isLast = idx === phases.length - 1;
              const stepNum = idx + 1;

              return (
                <li
                  key={phase.title}
                  aria-label={`Phase ${stepNum}: ${phase.title}, ${phase.name}`}
                  className="relative m-0 flex gap-5 pb-14 last:pb-0 md:gap-8 md:pb-[4.25rem]"
                >
                  {/* Left rail: marker + spine that stretches with row height */}
                  <div className="flex w-[52px] shrink-0 flex-col items-center pt-1 md:w-14">
                    <div className="relative z-[1] size-[22px] shrink-0 rounded-full bg-brand-500 shadow-[0_0_0_4px_white,0_0_0_5px_rgb(229,231,235),0_6px_20px_rgba(98,114,241,0.38)] md:size-6" />

                    {/* Connector grows to bottom of phase so the line visibly links milestones */}
                    {!isLast ? (
                      <div
                        className="mt-5 w-[3px] flex-1 min-h-[3.5rem] rounded-full md:min-h-[4rem]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgb(165 180 252) 0%, rgb(203 213 225) 45%, rgb(226 232 240) 100%)",
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 -mt-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="inline-flex rounded-md bg-brand-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-900 ring-1 ring-brand-200/80">
                        {phase.title}
                      </span>
                      <span className="text-xs font-medium text-slate-500 tabular-nums">Phase {stepNum} of {phases.length}</span>
                    </div>

                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 md:text-[1.375rem] leading-snug">
                      {phase.name}
                    </h3>

                    <ul className="mt-6 space-y-3.5 pl-0">
                      {phase.items.map((item) => (
                        <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-slate-800 md:text-base">
                          <span
                            className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full bg-brand-500 shadow-sm ring-2 ring-brand-100"
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {isLast ? (
                      <div className="mt-9 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4 text-sm leading-relaxed text-slate-600 shadow-[var(--shadow-card)]">
                        <p className="text-sm font-semibold text-slate-900">Reality check</p>
                        <p className="mt-2">
                          Faster when your developer is allocated ≥1 day/week through integration. Longer when legal or procurement
                          gates add pauses—we plan buffer for both.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </AnimatedSection>
  );
}
