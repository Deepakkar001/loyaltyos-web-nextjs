"use client";

import { Suspense } from "react";

import { ReferralCreateShell } from "./ReferralCreateShell";
import { ReferralCreateStepNav } from "./ReferralCreateStepNav";

export function ReferralCreateStepPage({
  stepIndex,
  children,
}: {
  stepIndex: number;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-muted-foreground">Loading step…</p>}>
      <ReferralCreateShell stepIndex={stepIndex}>
        <div className="space-y-6">{children}</div>
        <ReferralCreateStepNav stepIndex={stepIndex} />
      </ReferralCreateShell>
    </Suspense>
  );
}
