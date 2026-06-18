"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

import { MerchantInviteLinkActions } from "@/components/dashboard/merchants/MerchantInviteLinkActions";
import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { merchantApi } from "@/lib/api/merchant";
import { useMerchantOnboarding } from "@/lib/merchants/onboarding-context";
import type { MerchantActivateResponse } from "@/types/merchant";

export default function MerchantActivateStepPage() {
  const { merchantUid, merchant, loading: merchantLoading, refreshMerchant } = useMerchantOnboarding();
  const [activateResult, setActivateResult] = useState<MerchantActivateResponse | null>(null);
  const [activating, setActivating] = useState(false);

  async function activate() {
    setActivating(true);
    try {
      const res = await merchantApi.activate(merchantUid);
      setActivateResult(res);
      await refreshMerchant();
      toast.success(
        res.inviteEmailSent
          ? "Merchant activated — invite email sent"
          : "Merchant activated — copy invite link below"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  }

  if (merchantLoading || !merchant) {
    return <p className="text-sm text-muted-foreground">Loading activation…</p>;
  }

  if (merchant.active || activateResult) {
    return (
      <Card className="border-emerald-500/30">
        <CardHeader>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <CardTitle>Merchant is live</CardTitle>
          </div>
          <CardDescription>
            Portal access has been provisioned for {merchant.contactEmail}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MerchantInviteLinkActions
            merchantUid={merchantUid}
            inviteUrl={activateResult?.inviteUrl}
            inviteExpiresAt={activateResult?.inviteExpiresAt}
            portalUsername={activateResult?.portalUsername ?? merchant.contactEmail}
          />
          <Link
            href="/dashboard/configure/merchants"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to merchant list
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Go live</CardTitle>
        <CardDescription>
          Activate this merchant for production. An invite email will be sent to{" "}
          <span className="font-medium">{merchant.contactEmail}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Authorize permission="merchants.approve">
          <Button
            type="button"
            className="rounded-full"
            disabled={activating || merchant.onboardingStage !== "INTEGRATION"}
            onClick={() => void activate()}
          >
            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate merchant & send invite"}
          </Button>
        </Authorize>
      </CardContent>
    </Card>
  );
}
