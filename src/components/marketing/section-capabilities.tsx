import { Gauge, Globe2, Webhook } from "lucide-react";
import { AnimatedSection } from "./animated-section";

const groups = [
  {
    icon: Webhook,
    title: "Integrations engineered for accountability",
    body: [
      "Sandbox credential flows and webhook verification you can automate in CI",
      "Event validation helpers so payloads match what finance expects downstream",
      "Separation between programme configuration JSON and transactional contracts",
    ],
  },
  {
    icon: Gauge,
    title: "Operational reality in the dashboard",
    body: [
      "Programme summaries with status suitable for onboarding and compliance reviews",
      "Go-live readiness thinking—not just flipping a boolean",
      "Space for rule iteration once live data arrives (months 3–4 signal)",
    ],
  },
  {
    icon: Globe2,
    title: "Multi-region thinking without mystery",
    body: [
      "Tenant governance patterns set during onboarding—not retrofitted mid-flight",
      "Identity posture choices surfaced early alongside data residency prompts",
      "Honest delineation between platform capabilities and bespoke engineering",
    ],
  },
] as const;

export function SectionCapabilities() {
  return (
    <AnimatedSection
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="scroll-mt-28 bg-slate-50 px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 id="capabilities-heading" className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Capabilities anchored in how we ship today
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            These align with active portal flows: onboarding, programme configuration, integration credentials and webhooks,
            dashboards, and deliberate go-live gating—not buzzword tiers or speculative AI vapourware.
          </p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)]"
            >
              <g.icon className="h-9 w-9 text-brand-500" aria-hidden />
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{g.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                {g.body.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-brand-400" aria-hidden>
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
