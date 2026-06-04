"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { REFERRAL_CREATE_BASE } from "@/lib/referrals/referral-create-steps";

/** Redirects legacy single-page create URL to the step wizard. */
export function ReferralProgrammeSetupPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`${REFERRAL_CREATE_BASE}/basics${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return (
    <p className="text-sm text-muted-foreground py-8">Opening referral setup wizard…</p>
  );
}
