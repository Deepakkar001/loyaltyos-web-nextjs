"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearMerchantToken, getMerchantToken, merchantProfile } from "@/lib/api/merchant";
import type { MerchantResponse } from "@/types/merchant";
import { Button } from "@/components/ui/button";

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MerchantResponse | null>(null);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace("/merchant/login");
      return;
    }
    merchantProfile()
      .then(setProfile)
      .catch(() => router.replace("/merchant/login"));
  }, [router]);

  function logout() {
    clearMerchantToken();
    router.push("/merchant/login");
  }

  if (!profile) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{profile.legalName}</h1>
        <Button variant="outline" onClick={logout}>
          Log out
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Merchant {profile.merchantUid} · Stage {profile.onboardingStage}
      </p>
      <p className="text-sm">Earn multiplier: {profile.earnRateMultiplier ?? 1}</p>
      <Link href="/merchant/campaigns" className="text-sm text-primary underline">
        My campaigns
      </Link>
    </div>
  );
}
