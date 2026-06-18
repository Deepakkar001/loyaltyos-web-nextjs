"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";

import { MerchantInviteLinkActions } from "@/components/dashboard/merchants/MerchantInviteLinkActions";

import { MerchantOnboardingStepper } from "@/components/dashboard/merchants/MerchantOnboardingStepper";
import { MerchantStageBadge } from "@/components/dashboard/merchants/MerchantStageBadge";
import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { merchantApi } from "@/lib/api/merchant";
import { merchantContinueHref } from "@/lib/merchants/onboarding-steps";
import { cn } from "@/lib/utils";
import type { CampaignResponse } from "@/types/campaigns";
import type {
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantOnboardingAudit,
  MerchantOpsSummary,
  MerchantResponse,
  MerchantSettlementCycle,
} from "@/types/merchant";

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadTenantSettlement(
  merchantUid: string,
  cycleUid: string,
  periodLabel: string,
  format: "csv" | "pdf" | "xlsx"
) {
  try {
    const blob = await merchantApi.downloadSettlementExport(merchantUid, cycleUid, format);
    const ext = format === "xlsx" ? "xlsx" : format;
    downloadBlob(blob, `settlement-${periodLabel}.${ext}`);
    toast.success(`Downloaded ${format.toUpperCase()}`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Download failed");
  }
}

type Props = {
  merchant: MerchantResponse;
  activateResult: MerchantActivateResponse | null;
  pendingCampaigns?: CampaignResponse[];
  merchantCampaigns?: CampaignResponse[];
  opsSummary?: MerchantOpsSummary | null;
  settlements?: MerchantSettlementCycle[];
  onApproveCampaign?: (campaignUid: string) => Promise<void>;
  onRejectCampaign?: (campaignUid: string) => Promise<void>;
  onGenerateSettlement?: () => Promise<void>;
  onFinalizeSettlement?: (cycleUid: string) => Promise<void>;
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
  /** sidebar = compressed list panel; page = full merchant detail route */
  layout?: "sidebar" | "page";
};

export function MerchantDetailPanel({
  merchant,
  activateResult,
  pendingCampaigns = [],
  merchantCampaigns = [],
  opsSummary = null,
  settlements = [],
  onApproveCampaign,
  onRejectCampaign,
  onGenerateSettlement,
  onFinalizeSettlement,
  auditTrail,
  apiKeys,
  newApiKey,
  onNewApiKey,
  onApiKeysChange,
  onRunStep,
  actionLoading,
  layout = "sidebar",
}: Props) {
  const isPage = layout === "page";
  const infoGridClass = isPage
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm"
    : "grid grid-cols-2 gap-3 text-sm";
  const statsGridClass = isPage
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm"
    : "grid grid-cols-2 gap-2 text-sm";
  const listScrollClass = isPage ? "" : "max-h-64 overflow-y-auto";

  const header = (
    <>
      <div className="flex items-start justify-between gap-4">
        {!isPage ? (
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{merchant.legalName}</CardTitle>
            <CardDescription className="font-mono text-xs mt-1 truncate">
              {merchant.merchantUid}
            </CardDescription>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <MerchantStageBadge stage={merchant.onboardingStage} />
      </div>
      <div className={cn("mt-4", isPage && "max-w-4xl")}>
        <MerchantOnboardingStepper stage={merchant.onboardingStage} compact={!isPage} />
      </div>
      {!merchant.active && merchant.onboardingStage !== "SUSPENDED" && (
        <Link
          href={merchantContinueHref(merchant.merchantUid, merchant.onboardingStage)}
          className={cn(
            "mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            isPage ? "w-auto" : "w-full"
          )}
        >
          Continue onboarding wizard →
        </Link>
      )}
    </>
  );

  const body = (
    <div className="space-y-6">
      {pendingCampaigns.length > 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-3">
          <p className="text-sm font-semibold">Pending campaign approvals</p>
          <ul className="space-y-2">
            {pendingCampaigns.map((c) => (
              <li
                key={c.campaignUid}
                className="flex flex-wrap items-center justify-between gap-3 text-sm rounded-lg bg-background/60 px-4 py-3"
              >
                <span className="font-medium">{c.name}</span>
                <div className="flex gap-2 shrink-0">
                  <Authorize permission="merchants.approve">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onRejectCampaign?.(c.campaignUid)}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void onApproveCampaign?.(c.campaignUid)}
                    >
                      Approve
                    </Button>
                  </Authorize>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={infoGridClass}>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Contact</p>
          <p className="font-medium mt-1 break-all">{merchant.contactEmail ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Earn multiplier</p>
          <p className="font-medium mt-1">{merchant.earnRateMultiplier ?? 1}×</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Category</p>
          <p className="font-medium mt-1">{merchant.category ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Settlement</p>
          <p className="font-medium mt-1">{merchant.settlementCycle ?? "—"}</p>
        </div>
      </div>

      {activateResult ? (
        <div
          className={cn(
            "rounded-xl border p-5 space-y-3",
            activateResult.inviteEmailSent !== false
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          )}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">
              {activateResult.inviteEmailSent !== false
                ? "Merchant activated — invite emailed"
                : "Merchant activated — email not delivered"}
            </p>
          </div>
          <MerchantInviteLinkActions
            merchantUid={merchant.merchantUid}
            inviteUrl={activateResult.inviteUrl}
            inviteExpiresAt={activateResult.inviteExpiresAt}
            portalUsername={activateResult.portalUsername ?? merchant.contactEmail}
          />
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList
          className={cn(
            "w-full h-auto gap-1",
            isPage
              ? "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
              : "flex flex-wrap"
          )}
        >
          <TabsTrigger value="overview" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="operations" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Operations
          </TabsTrigger>
          <TabsTrigger value="onboarding" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Onboarding
          </TabsTrigger>
          <TabsTrigger
            value="keys"
            className={cn(!isPage && "flex-1 min-w-[4.5rem]")}
            disabled={!merchant.active}
          >
            API Keys
          </TabsTrigger>
          <TabsTrigger value="settlement" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Settlement
          </TabsTrigger>
          <TabsTrigger value="audit" className={cn(!isPage && "flex-1 min-w-[4.5rem]")}>
            Audit
          </TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            {opsSummary && (
              <div className={statsGridClass}>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Active campaigns</p>
                  <p className="font-semibold tabular-nums mt-1">{opsSummary.activeCampaigns}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Participations</p>
                  <p className="font-semibold tabular-nums mt-1">{opsSummary.totalParticipations}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Budget consumed</p>
                  <p className="font-semibold tabular-nums mt-1">
                    {Number(opsSummary.totalBudgetConsumed).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Integration</p>
                  <p className="font-semibold mt-1">
                    {opsSummary.integrationTestPassed ? "Passed" : "Pending"}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4 space-y-2">
            {merchantCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No campaigns for this merchant.</p>
            ) : (
              <ul
                className={cn(
                  "divide-y divide-border rounded-lg border border-border overflow-hidden",
                  listScrollClass
                )}
              >
                {merchantCampaigns.map((c) => (
                  <li key={c.campaignUid} className="px-3 py-2.5 text-sm bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/campaigns/${encodeURIComponent(c.campaignUid)}`}
                        className="font-medium truncate hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0">{c.status}</span>
                    </div>
                    {c.pendingMerchantApproval && (
                      <p className="text-xs text-amber-600 mt-1">Pending approval</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="operations" className="mt-4">
            {opsSummary ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total campaigns</span>
                  <span className="font-medium">{opsSummary.totalCampaigns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending approvals</span>
                  <span className="font-medium">{opsSummary.pendingApprovalCampaigns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget allocated</span>
                  <span className="font-medium tabular-nums">
                    {Number(opsSummary.totalBudgetAllocated).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget consumed</span>
                  <span className="font-medium tabular-nums">
                    {Number(opsSummary.totalBudgetConsumed).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading operations data…</p>
            )}
          </TabsContent>

          <TabsContent value="settlement" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Authorize permission="merchants.approve">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onGenerateSettlement?.()}
                >
                  Generate statement
                </Button>
              </Authorize>
            </div>
            {settlements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No settlement statements yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {settlements.map((s) => (
                  <li key={s.cycleUid} className="px-3 py-2.5 text-sm bg-background space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {s.periodStart} – {s.periodEnd}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Number(s.totalMonetaryValue).toLocaleString()} · {s.lineItemCount} line items
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(["csv", "pdf", "xlsx"] as const).map((format) => (
                        <Button
                          key={format}
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            void downloadTenantSettlement(
                              merchant.merchantUid,
                              s.cycleUid,
                              `${s.periodStart}_${s.periodEnd}`,
                              format
                            )
                          }
                        >
                          {format.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                    {s.status === "PENDING_FINANCE" && (
                      <Authorize permission="merchants.approve">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-1"
                          onClick={() => void onFinalizeSettlement?.(s.cycleUid)}
                        >
                          Finance approve
                        </Button>
                      </Authorize>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="onboarding" className="mt-4 space-y-4">
            {!merchant.active && merchant.onboardingStage !== "SUSPENDED" && (
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Complete onboarding in the guided wizard — agreement, configuration, integration
                  test, and go-live are handled step by step.
                </p>
                <Link
                  href={merchantContinueHref(merchant.merchantUid, merchant.onboardingStage)}
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Open onboarding wizard →
                </Link>
              </div>
            )}

            {merchant.active && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Merchant is live
                  </span>
                  <Authorize permission="merchants.edit">
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
                  </Authorize>
                </div>
                <MerchantInviteLinkActions
                  merchantUid={merchant.merchantUid}
                  portalUsername={merchant.contactEmail}
                />
              </div>
            )}

            {merchant.suspended && (
              <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Merchant is suspended
                </span>
                <Authorize permission="merchants.edit">
                  <Button
                    type="button"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() =>
                      void onRunStep(
                        () => merchantApi.unsuspend(merchant.merchantUid),
                        "Merchant unsuspended"
                      )
                    }
                  >
                    Unsuspend
                  </Button>
                </Authorize>
              </div>
            )}
          </TabsContent>

          <TabsContent value="keys" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">POS API keys</p>
              </div>
              <Authorize permission="merchants.edit">
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
              </Authorize>
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
                        <Authorize permission="merchants.edit">
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
                        </Authorize>
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
              <ul
                className={cn(
                  "space-y-0 divide-y divide-border rounded-lg border border-border overflow-hidden",
                  listScrollClass
                )}
              >
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
        Merchant portal sign-in: <span className="font-mono">/login</span>
      </p>
    </div>
  );

  if (isPage) {
    return (
      <div className="space-y-6">
        <Card className="border-border/70 bg-[var(--surface-card)]">
          <CardHeader className="border-b border-border/60 pb-4">{header}</CardHeader>
        </Card>
        <Card className="border-border/70 bg-[var(--surface-card)]">
          <CardContent className="pt-6">{body}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/70 bg-[var(--surface-card)] lg:sticky lg:top-6">
      <CardHeader className="border-b border-border/60 pb-4">{header}</CardHeader>
      <CardContent className="pt-4">{body}</CardContent>
    </Card>
  );
}
