import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — LoyaltyOS",
  description: "Set up your loyalty programme in under 4 hours.",
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
