"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { merchantApi } from "@/lib/api/merchant";
import { useMerchantOnboarding } from "@/lib/merchants/onboarding-context";
import { merchantOnboardingStepHref } from "@/lib/merchants/onboarding-steps";
import type { MerchantIntegrationTestRequest } from "@/types/merchant";

const DEFAULT_TEST: MerchantIntegrationTestRequest = {
  customerId: "sandbox-customer-1",
  eventType: "PURCHASE",
  amount: 100,
  channel: "sandbox",
};

export default function MerchantIntegrationStepPage() {
  const router = useRouter();
  const { merchantUid, refreshMerchant } = useMerchantOnboarding();
  const [test, setTest] = useState<MerchantIntegrationTestRequest>(DEFAULT_TEST);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await merchantApi.completeIntegration(merchantUid, test);
      toast.success("Integration test passed");
      await refreshMerchant();
      router.push(merchantOnboardingStepHref(merchantUid, "activate"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Integration test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <CardTitle>Integration test</CardTitle>
        </div>
        <CardDescription>
          Run a sandbox transaction with this merchant ID to verify POS/API connectivity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customer-id">Customer ID</Label>
            <Input
              id="customer-id"
              value={test.customerId}
              onChange={(e) => setTest({ ...test, customerId: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-type">Event type</Label>
            <Input
              id="event-type"
              value={test.eventType}
              onChange={(e) => setTest({ ...test, eventType: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              step={0.01}
              value={test.amount}
              onChange={(e) => setTest({ ...test, amount: Number(e.target.value) })}
            />
          </div>
        </div>
        <Button type="button" className="rounded-full" disabled={loading} onClick={() => void submit()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run test & continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
