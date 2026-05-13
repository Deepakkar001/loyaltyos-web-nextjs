import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — LoyaltyOS",
  description:
    "Complete LoyaltyOS onboarding—from agreement through programme configuration, integration, and go-live—with support-aligned timelines.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use theme-aware surface tokens so text/input colors stay consistent
  // in both light and dark mode.
  return <div className="min-h-screen bg-[var(--surface-page)] text-foreground">{children}</div>;
}
