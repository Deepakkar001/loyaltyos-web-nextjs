import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "./animated-section";

export function SectionContact() {
  return (
    <AnimatedSection id="contact" aria-labelledby="contact-heading" className="scroll-mt-28 bg-brand-950 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 id="contact-heading" className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Schedule a strategy call
        </h2>
        <p className="mt-6 text-lg text-brand-100/95 leading-relaxed">
          Anchor on what your leadership needs to approve: phased calendar, staffing asks, instrumentation checklist, forecastable labour.
          Plug your booking workflow here later—today this section is the honest stopping point buyers asked for (#contact).
        </p>
        <p className="mt-6 text-sm text-brand-200/80">
          Prefer email for now? Use{" "}
          <span className="font-mono text-white/90">
            {/* Placeholder inline—replace via env when ready */}
            sales@loyaltyos.com
          </span>
          {' '}with subject <em className="not-italic text-brand-50">Strategy call – LoyaltyOS</em>.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex h-14 items-center justify-center rounded-xl border-0 bg-white px-8 text-base font-semibold text-brand-950 hover:bg-brand-50 hover:text-brand-950"
            )}
          >
            Continue to onboarding
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-14 rounded-xl border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/35"
            )}
          >
            Sign in to existing workspace
          </Link>
        </div>
      </div>
    </AnimatedSection>
  );
}
