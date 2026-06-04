"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { REFERRAL_CREATE_BASE } from "@/lib/referrals/referral-create-steps";

function ReferralCreateRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`${REFERRAL_CREATE_BASE}/basics${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return (
    <p className="text-sm text-muted-foreground py-8">Loading referral setup…</p>
  );
}

/** /dashboard/referrals/create → first wizard step */
export default function ReferralCreatePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground py-8">Loading…</p>}>
      <ReferralCreateRedirectInner />
    </Suspense>
  );
}
