"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Copy, KeyRound, Loader2, ShieldCheck, Zap } from "lucide-react";

import { MerchantOnboardingStepper } from "@/components/dashboard/merchants/MerchantOnboardingStepper";
import { MerchantStageBadge } from "@/components/dashboard/merchants/MerchantStageBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { merchantApi } from "@/lib/api/merchant";
import { cn } from "@/lib/utils";
import type {
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantIntegrationTestRequest,
  MerchantOnboardingAudit,
  MerchantResponse,
} from "@/types/merchant";

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

type Props = {
  merchant: MerchantResponse;
  activateResult: MerchantActivateResponse | null;
  integrationTest: MerchantIntegrationTestRequest;
  onIntegrationTestChange: (next: MerchantIntegrationTestRequest) => void;
  auditTrail: MerchantOnboardingAudit[];
  apiKeys: MerchantApiKeyResponse[];
  newApiKey: string | null;
  onNewApiKey: (key: string | null) => void;
  onApiKeysChange: (keys: MerchantApiKeyResponse[]) => void;
  onRunStep: (
    action: () => Promise<MerchantResponse | MerchantActivateResponse>,
    label: string
  ) => Promise<void>;
  actionLoading: boolean;
};

export function MerchantDetailPanel({
  merchant,
  activateResult,
  integrationTest,
  onIntegrationTestChange,
  auditTrail,
  apiKeys,
  newApiKey,
  onNewApiKey,
  onApiKeysChange,
  onRunStep,
  actionLoading,
}: Props) {
  const [earnRate, setEarnRate] = useState("1.5");

  return (
    <Card className="border-border/70 bg-[var(--surface-card)] lg:sticky lg:top-6">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{merchant.legalName}</CardTitle>
            <CardDescription className="font-mono text-xs mt-1 truncate">
              {merchant.merchantUid}
            </CardDescription>
          </div>
          <MerchantStageBadge stage={merchant.onboardingStage} />
        </div>
        <div className="mt-4">
          <MerchantOnboardingStepper stage={merchant.onboardingStage} />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Contact</p>
            <p className="font-medium truncate mt-0.5">{merchant.contactEmail ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Earn multiplier</p>
            <p className="font-medium mt-0.5">{merchant.earnRateMultiplier ?? 1}×</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="font-medium mt-0.5">{merchant.category ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Settlement</p>
            <p className="font-medium mt-0.5">{merchant.settlementCycle ?? "—"}</p>
          </div>
        </div>

        {activateResult?.temporaryPassword && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold">Portal credentials — share securely</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2">
                <span>
                  <span className="text-muted-foreground">Username: </span>
                  {activateResult.portalUsername}
                </span>
                {activateResult.portalUsername && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void copyText(activateResult.portalUsername!, "Username")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2 font-mono">
                <span className="truncate">
                  <span className="text-muted-foreground font-sans">Password: </span>
                  {activateResult.temporaryPassword}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void copyText(activateResult.temporaryPassword!, "Password")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="onboarding">
          <TabsList className="w-full">
            <TabsTrigger value="onboarding" className="flex-1">
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex-1" disabled={!merchant.active}>
              API Keys
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1">
              Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="mt-4 space-y-4">
            {merchant.onboardingStage === "REGISTRATION" && (
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Record the signed partner agreement to advance to configuration.
                </p>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={actionLoading}
                  onClick={() =>
                    void onRunStep(
                      () =>
                        merchantApi.submitAgreement(
                          merchant.merchantUid,
                          `agreement://${merchant.merchantUid}.pdf`
                        ),
                      "Agreement submitted"
                    )
                  }
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit agreement"}
                </Button>
              </div>
            )}

            {merchant.onboardingStage === "AGREEMENT" && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm font-medium">Programme configuration</p>
                <div className="space-y-1.5">
                  <Label htmlFor="earn-rate">Earn rate multiplier</Label>
                  <Input
                    id="earn-rate"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={earnRate}
                    onChange={(e) => setEarnRate(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={actionLoading}
                  onClick={() =>
                    void onRunStep(
                      () =>
                        merchantApi.configure(merchant.merchantUid, {
                          earnRateMultiplier: Number(earnRate) || 1,
                          settlementCycle: "MONTHLY",
                        }),
                      "Configuration saved"
                    )
                  }
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save configuration"}
                </Button>
              </div>
            )}

            {merchant.onboardingStage === "CONFIGURATION" && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">Sandbox integration test</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sends a test event through your integration pipeline with this merchant&apos;s ID.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="test-customer">Customer ID</Label>
                    <Input
                      id="test-customer"
                      value={integrationTest.customerId}
                      onChange={(e) =>
                        onIntegrationTestChange({ ...integrationTest, customerId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="test-event">Event type</Label>
                    <Input
                      id="test-event"
                      value={integrationTest.eventType}
                      onChange={(e) =>
                        onIntegrationTestChange({ ...integrationTest, eventType: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="test-amount">Amount</Label>
                    <Input
                      id="test-amount"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={integrationTest.amount}
                      onChange={(e) =>
                        onIntegrationTestChange({
                          ...integrationTest,
                          amount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={actionLoading}
                  onClick={() =>
                    void onRunStep(
                      () => merchantApi.completeIntegration(merchant.merchantUid, integrationTest),
                      "Integration test passed"
                    )
                  }
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Run test & complete integration"
                  )}
                </Button>
              </div>
            )}

            {merchant.onboardingStage === "INTEGRATION" && (
              <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Integration verified. Activate to issue portal credentials and enable live events.
                </p>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={actionLoading}
                  onClick={() =>
                    void onRunStep(() => merchantApi.activate(merchant.merchantUid), "Merchant activated")
                  }
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate merchant"}
                </Button>
              </div>
            )}

            {merchant.active && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Merchant is live
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() =>
                    void onRunStep(
                      () => merchantApi.suspend(merchant.merchantUid, "Manual suspension"),
                      "Merchant suspended"
                    )
                  }
                >
                  Suspend
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="keys" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">POS API keys</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  try {
                    const created = await merchantApi.createApiKey(merchant.merchantUid, "POS integration");
                    onNewApiKey(created.apiKey ?? null);
                    onApiKeysChange(await merchantApi.listApiKeys(merchant.merchantUid));
                    toast.success("API key created");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Create key failed");
                  }
                }}
              >
                Create key
              </Button>
            </div>
            {newApiKey && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">Copy now — shown once</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono">{newApiKey}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void copyText(newApiKey, "API key")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {apiKeys.map((k) => (
                  <li
                    key={k.keyUid}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm bg-background"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{k.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {k.keyPrefix}… · {k.environment}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          k.active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {k.active ? "Active" : "Revoked"}
                      </span>
                      {k.active && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            await merchantApi.revokeApiKey(merchant.merchantUid, k.keyUid);
                            onApiKeysChange(await merchantApi.listApiKeys(merchant.merchantUid));
                            toast.success("Key revoked");
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            {auditTrail.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No audit events yet.</p>
            ) : (
              <ul className="space-y-0 divide-y divide-border rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
                {auditTrail.map((a) => (
                  <li key={a.auditUid} className="px-3 py-3 text-sm bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.fromStage} → {a.toStage} · {a.actorEmail}
                    </p>
                    {a.reason && <p className="text-xs mt-1">{a.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <p className="text-xs text-muted-foreground text-center">
          Merchant portal: <span className="font-mono">/merchant/login</span>
        </p>
      </CardContent>
    </Card>
  );
}
