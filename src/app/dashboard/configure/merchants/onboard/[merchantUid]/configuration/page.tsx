"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ModulePill } from "@/components/modules/ModulePill";
import { merchantApi } from "@/lib/api/merchant";
import { onboardingApi } from "@/lib/api/client";
import { useMerchantOnboarding } from "@/lib/merchants/onboarding-context";
import { merchantOnboardingStepHref } from "@/lib/merchants/onboarding-steps";
import { resolveSettlementCycle } from "@/lib/merchants/resolve-settlement-cycle";
import { MERCHANT_SETTLEMENT_CYCLES } from "@/lib/merchants/settlement-cycles";
import type { MerchantAgreementResponse } from "@/types/merchant";

export default function MerchantConfigurationStepPage() {
  const router = useRouter();
  const { merchantUid, merchant, loading: merchantLoading, refreshMerchant } = useMerchantOnboarding();
  const [earnRate, setEarnRate] = useState("");
  const [settlementCycle, setSettlementCycle] = useState("MONTHLY");
  const [commissionType, setCommissionType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [commissionRate, setCommissionRate] = useState("");
  const [useAgreementDefaults, setUseAgreementDefaults] = useState(true);
  const [agreement, setAgreement] = useState<MerchantAgreementResponse | null>(null);
  const [eligibleCategories, setEligibleCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [capabilities, setCapabilities] = useState<string[]>(["campaigns", "settlement", "integration"]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void onboardingApi.getMetadata().then((meta) => {
      setCategoryOptions(meta.businessCategories ?? []);
    });
  }, []);

  useEffect(() => {
    if (!merchant) return;
    setEarnRate(String(merchant.earnRateMultiplier ?? 1.5));
    setSettlementCycle(resolveSettlementCycle(merchant.settlementCycle));
    if (merchant.eligibleCategoriesJson) {
      try {
        const parsed = JSON.parse(merchant.eligibleCategoriesJson) as unknown;
        if (Array.isArray(parsed)) {
          setEligibleCategories(parsed.filter((v): v is string => typeof v === "string"));
        }
      } catch {
        setEligibleCategories([]);
      }
    }
    if (merchant.capabilities && merchant.capabilities.length > 0) {
      setCapabilities(merchant.capabilities);
    }
    setHydrated(true);
  }, [merchant]);

  useEffect(() => {
    void merchantApi.getAgreement(merchantUid).then(setAgreement).catch(() => setAgreement(null));
  }, [merchantUid]);

  useEffect(() => {
    if (!agreement || !useAgreementDefaults) return;
    if (agreement.proposedEarnRateMultiplier != null) {
      setEarnRate(String(agreement.proposedEarnRateMultiplier));
    }
    if (agreement.settlementCycle) {
      setSettlementCycle(resolveSettlementCycle(agreement.settlementCycle));
    }
    if (agreement.revenueSharePct != null) {
      setCommissionType("PERCENT");
      setCommissionRate(String(agreement.revenueSharePct));
    }
  }, [agreement, useAgreementDefaults]);

  async function submit() {
    setSaving(true);
    try {
      const commissionConfigJson =
        commissionRate.trim() !== ""
          ? JSON.stringify({ type: commissionType, rate: Number(commissionRate) })
          : undefined;
      await merchantApi.configure(merchantUid, {
        earnRateMultiplier: Number(earnRate) || 1,
        settlementCycle,
        commissionConfigJson,
        eligibleCategoriesJson: JSON.stringify(eligibleCategories),
        capabilitiesJson: JSON.stringify(capabilities),
      });
      toast.success("Configuration saved");
      await refreshMerchant();
      router.push(merchantOnboardingStepHref(merchantUid, "integration"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  if (merchantLoading || !hydrated) {
    return <p className="text-sm text-muted-foreground">Loading configuration…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme configuration</CardTitle>
        <CardDescription>
          Set earn multiplier, commission rules, and settlement preferences for this merchant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {agreement && (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Agreement summary</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAgreementDefaults}
                  onChange={(e) => setUseAgreementDefaults(e.target.checked)}
                />
                Use agreement values
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-muted-foreground">Revenue share</span>
                <p className="font-medium">{agreement.revenueSharePct}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Proposed earn</span>
                <p className="font-medium">{agreement.proposedEarnRateMultiplier ?? "—"}×</p>
              </div>
              <div>
                <span className="text-muted-foreground">Settlement</span>
                <p className="font-medium">{agreement.settlementCycle}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="earn-rate">Earn rate multiplier</Label>
          <Input
            id="earn-rate"
            type="number"
            min={0.5}
            max={10}
            step={0.1}
            value={earnRate}
            disabled={useAgreementDefaults && !!agreement?.proposedEarnRateMultiplier}
            onChange={(e) => setEarnRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Allowed range: 0.5× – 10×</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="commission-type">Commission type</Label>
            <NativeSelect
              id="commission-type"
              ariaLabel="Commission type"
              value={commissionType}
              onChange={(v) => setCommissionType(v as "PERCENT" | "FIXED")}
              options={[
                { value: "PERCENT", label: "Percent of transaction" },
                { value: "FIXED", label: "Fixed amount" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission-rate">Commission rate</Label>
            <Input
              id="commission-rate"
              type="number"
              min={0}
              step={0.01}
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder={commissionType === "PERCENT" ? "e.g. 2.5" : "e.g. 10"}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settlement">Settlement cycle</Label>
          <NativeSelect
            id="settlement"
            ariaLabel="Settlement cycle"
            value={settlementCycle}
            disabled={useAgreementDefaults && !!agreement?.settlementCycle}
            onChange={setSettlementCycle}
            options={[...MERCHANT_SETTLEMENT_CYCLES]}
          />
        </div>

        <div className="space-y-2">
          <Label>Eligible categories</Label>
          <p className="text-xs text-muted-foreground">
            Select product categories this merchant may fund campaigns for.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
            {categoryOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground col-span-2">Loading categories…</p>
            ) : (
              categoryOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eligibleCategories.includes(opt.value)}
                    onChange={(e) => {
                      setEligibleCategories((prev) =>
                        e.target.checked
                          ? [...prev, opt.value]
                          : prev.filter((v) => v !== opt.value)
                      );
                    }}
                  />
                  {opt.label}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Merchant capabilities</Label>
          <p className="text-xs text-muted-foreground">
            Choose which portal sections this merchant can access. Funded campaigns are always enabled.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              {
                key: "campaigns",
                label: "Funded campaigns",
                description: "Merchant can create and manage funded campaigns.",
                locked: true,
              },
              {
                key: "settlement",
                label: "Settlement & statements",
                description: "Merchant can view settlement cycles and statements.",
                locked: false,
              },
              {
                key: "integration",
                label: "POS integration & API keys",
                description: "Merchant can access API credentials and test integrations.",
                locked: false,
              },
            ].map((cap, idx) => (
              <ModulePill
                key={cap.key}
                label={cap.label}
                description={cap.description}
                selected={capabilities.includes(cap.key)}
                locked={cap.locked}
                index={idx}
                variant="admin"
                onToggle={() => {
                  setCapabilities((prev) =>
                    prev.includes(cap.key)
                      ? prev.filter((c) => c !== cap.key)
                      : [...prev, cap.key]
                  );
                }}
              />
            ))}
          </div>
        </div>

        <Button type="button" className="rounded-full" disabled={saving} onClick={() => void submit()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue to integration"}
        </Button>
      </CardContent>
    </Card>
  );
}
