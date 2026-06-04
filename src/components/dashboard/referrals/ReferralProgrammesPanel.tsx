"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** @deprecated Use dedicated routes under /dashboard/referrals instead. */
export function ReferralProgrammesPanel() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/referrals/my-referrals");
  }, [router]);
  return null;
}
