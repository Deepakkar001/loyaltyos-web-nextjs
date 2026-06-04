"use client";

import { Suspense } from "react";

import { ReferralCreateShell } from "@/components/dashboard/referrals/create/ReferralCreateShell";
import { ReferralCreateReviewStep } from "@/components/dashboard/referrals/create/steps/ReferralCreateReviewStep";

export default function ReferralCreateReviewPage() {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-muted-foreground">Loading review…</p>}>
      <ReferralCreateShell stepIndex={4}>
        <div className="space-y-6">
          <ReferralCreateReviewStep />
        </div>
      </ReferralCreateShell>
    </Suspense>
  );
}
