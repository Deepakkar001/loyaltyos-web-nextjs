import { MarketingNav } from "./marketing-nav";
import { SectionHero } from "./section-hero";
import { SectionTimeline } from "./section-timeline";
import { SectionDifferentiation } from "./section-differentiation";
import { SectionCaseStudies } from "./section-case-studies";
import { SectionCapabilities } from "./section-capabilities";
import { SectionPricing } from "./section-pricing";
import { MarketingFaq } from "./marketing-faq";
import { SectionContact } from "./section-contact";

function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-brand-950 px-6 py-12 text-brand-100/85">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between md:items-start">
        <div>
          <p className="font-semibold text-white">LoyaltyOS</p>
          <p className="mt-3 max-w-sm text-sm text-brand-200/80 leading-relaxed">
            Honest timelines, disciplined integrations, dashboards your finance peers will not dissect for sport.
          </p>
          <p className="mt-8 text-xs text-white/35">© {new Date().getFullYear()} LoyaltyOS</p>
        </div>
        <nav aria-label="Footer" className="grid gap-10 text-sm sm:grid-cols-2 md:gap-16">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400/90">Product</p>
            <ul className="space-y-2">
              <li>
                <a href="#capabilities" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Pricing framing
                </a>
              </li>
              <li>
                <a href="/onboarding" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Onboarding
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400/90">Access</p>
            <ul className="space-y-2">
              <li>
                <a href="/login" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Sign in
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Strategy call
                </a>
              </li>
              <li>
                <a href="/onboarding" className="hover:text-white focus-visible:outline-none focus-visible:underline">
                  Start onboarding
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main id="main-content">
        <SectionHero />
        <SectionTimeline />
        <SectionDifferentiation />
        <SectionCaseStudies />
        <SectionCapabilities />
        <SectionPricing />
        <MarketingFaq />
        <SectionContact />
      </main>
      <MarketingFooter />
    </>
  );
}
