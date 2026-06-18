"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  REFERRAL_CREATE_BASE,
  REFERRAL_CREATE_STEPS,
} from "@/lib/referrals/referral-create-steps";

function ReferralCreateLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === REFERRAL_CREATE_BASE) return;
    const valid = REFERRAL_CREATE_STEPS.some((s) =>
      pathname.startsWith(`${REFERRAL_CREATE_BASE}/${s.slug}`)
    );
    if (!valid) {
      const q = searchParams.toString();
      router.replace(`${REFERRAL_CREATE_BASE}/basics${q ? `?${q}` : ""}`);
    }
  }, [pathname, router, searchParams]);

  return <>{children}</>;
}

export default function ReferralCreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ReferralCreateLayoutInner>{children}</ReferralCreateLayoutInner>
    </Suspense>
  );
}
