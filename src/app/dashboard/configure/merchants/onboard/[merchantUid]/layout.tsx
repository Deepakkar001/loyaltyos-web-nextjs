"use client";

import { MerchantOnboardingShell } from "@/components/dashboard/merchants/MerchantOnboardingShell";
import {
  MerchantOnboardingProvider,
  useMerchantOnboarding,
} from "@/lib/merchants/onboarding-context";

function MerchantOnboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { merchant, loading } = useMerchantOnboarding();

  if (loading || !merchant) {
    return <div className="p-8 text-sm text-muted-foreground">Loading merchant…</div>;
  }

  return (
    <MerchantOnboardingShell
      merchantUid={merchant.merchantUid}
      stage={merchant.onboardingStage}
      merchantName={merchant.displayName ?? merchant.legalName}
    >
      {children}
    </MerchantOnboardingShell>
  );
}

export default function MerchantOnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MerchantOnboardingProvider>
      <MerchantOnboardLayoutInner>{children}</MerchantOnboardLayoutInner>
    </MerchantOnboardingProvider>
  );
}
