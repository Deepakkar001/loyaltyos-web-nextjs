"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedSection } from "./animated-section";

const items = [
  {
    q: "How long does implementation really take?",
    a: "Most production launches land between four and six weeks once your engineering partner is allocated. Webhook and identity alignment usually consume the first two integration weeks; stakeholder reviews and phased rollouts stretch or compress the tail.",
  },
  {
    q: "Do we need developers?",
    a: "Yes—at minimum a backend or integration engineer familiar with HTTPS, JSON payloads, and secret rotation. LoyaltyOS provides documentation, sandbox keys, and replay tooling. When bandwidth is scarce, we can advise on implementation partners scoped under a separate statement of work.",
  },
  {
    q: "When will ROI be credible?",
    a: "Expect directional signals once healthy traffic flows through audited events — often around months three to four. Board-grade storytelling typically firms up between months six and nine when seasonality washes out.",
  },
  {
    q: "What happens after launch if something drifts?",
    a: "Support stays tiered exactly like pricing: pooled email for Starter, faster queues for Professional, named coverage for Enterprise. Production incidents escalate through webhook status signals you already inspect during onboarding—not a hidden black hole.",
  },
  {
    q: "Can we migrate from another vendor?",
    a: "Yes, with disciplined data mapping—members, tiers, dormant liabilities, issuance history. Migration windows routinely take two to four additional weeks depending on export cleanliness and legal sign-off—not something we gloss over.",
  },
] as const;

export function MarketingFaq() {
  return (
    <AnimatedSection id="faq" aria-labelledby="faq-heading" className="scroll-mt-28 bg-slate-50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl text-center">
          FAQ — objections worth answering upfront
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 leading-relaxed">
          If something below does not fit your organisational reality yet, flag it during the strategy conversation—we tailor the rollout
          choreography instead of insisting on fiction.
        </p>
        <Accordion type="single" collapsible className="mt-12 w-full">
          {items.map((item, idx) => (
            <AccordionItem key={item.q} value={`item-${idx + 1}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AnimatedSection>
  );
}
