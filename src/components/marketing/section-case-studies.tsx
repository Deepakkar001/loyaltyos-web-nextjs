import { AnimatedSection } from "./animated-section";
import { ProofScenarios } from "./proof-scenarios";

export function SectionCaseStudies() {
  return (
    <AnimatedSection
      id="proof"
      aria-labelledby="proof-heading"
      className="scroll-mt-28 overflow-hidden bg-white px-6 py-16 md:py-24"
    >
      <ProofScenarios />
    </AnimatedSection>
  );
}
