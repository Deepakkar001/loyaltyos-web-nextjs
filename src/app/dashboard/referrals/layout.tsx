"use client";

import { Suspense } from "react";
import { ReferralProgrammeProvider } from "@/lib/referrals/use-referral-programme";

function ReferralsLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <ReferralProgrammeProvider>
      <div className="p-6 md:p-8">{children}</div>
    </ReferralProgrammeProvider>
  );
}

export default function ReferralsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-6 md:p-8 text-sm text-muted-foreground">Loading referrals…</div>
      }
    >
      <ReferralsLayoutInner>{children}</ReferralsLayoutInner>
    </Suspense>
  );
}
