"use client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMerchantOnboarding } from "@/lib/merchants/onboarding-context";
import { merchantOnboardingStepHref } from "@/lib/merchants/onboarding-steps";

export default function MerchantRegisterStepPage() {
  const { merchantUid, merchant, loading } = useMerchantOnboarding();

  if (loading || !merchant) {
    return <p className="text-sm text-muted-foreground">Loading registration…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration</CardTitle>
        <CardDescription>Merchant profile created. Review details and continue to agreement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Legal name</p>
            <p className="font-medium">{merchant.legalName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium">{merchant.category}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contact email</p>
            <p className="font-medium">{merchant.contactEmail}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tax ID</p>
            <p className="font-medium">On file</p>
          </div>
        </div>
        <Link
          href={merchantOnboardingStepHref(merchantUid, "agreement")}
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Continue to agreement →
        </Link>
      </CardContent>
    </Card>
  );
}
