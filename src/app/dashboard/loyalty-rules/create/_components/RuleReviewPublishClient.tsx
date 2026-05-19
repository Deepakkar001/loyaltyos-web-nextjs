"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "./CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "./rule-create-flow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { FieldHelp } from "@/components/ui/field-help";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { resolveSingleTriggerForCampaignRule } from "@/lib/campaigns/trigger-event-types";
import { clearRuleDraft, loadRuleDraft } from "@/lib/store/rule-draft-storage";
import { loyaltyRulesAdminApi } from "@/lib/api/client";
import type { RuleUpsertRequest } from "@/types/rules";

export function RuleReviewPublishClient() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { draftScope, listHref, basePath, kind } = useRuleCreateFlow();
  const schedulingPath = stepHref(basePath, "scheduling");
  const basicInfoPath = stepHref(basePath, kind === "campaign" ? "basic-info" : "basic-info");

  const draft = useMemo(() => {
    if (!tenantId) return null;
    return loadRuleDraft(tenantId, draftScope);
  }, [tenantId, draftScope]);

  const [ack, setAck] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const onPublish = async () => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!draft || !draft.name) {
      toast.error("Rule draft not found. Start from the first step.");
      router.push(basicInfoPath);
      return;
    }
    if (!ack) {
      toast.error("Please confirm you understand the rule is not live yet.");
      return;
    }
    if (kind === "campaign" && !draft.campaignUid) {
      toast.error("Campaign is required. Start from campaign selection.");
      router.push(stepHref(basePath, "campaign"));
      return;
    }

    setPublishing(true);
    try {
      let triggerEventType = draft.triggerEventType?.trim() || "PURCHASE";
      if (kind === "campaign") {
        try {
          triggerEventType = resolveSingleTriggerForCampaignRule(
            draft.campaignTriggerEventTypes ?? draft.triggerEventType,
            draft.triggerEventType
          );
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Invalid event type");
          router.push(stepHref(basePath, "event"));
          return;
        }
      }

      const payload: RuleUpsertRequest = {
        programmeUid: draft.programmeUid ?? "default",
        ruleType: draft.ruleType ?? (kind === "campaign" ? "CAMPAIGN" : "PROGRAMME"),
        campaignUid: draft.campaignUid,
        ruleUid: draft.ruleUid,
        name: draft.name,
        description: draft.description,
        priority: draft.priority ?? 0,
        triggerEventType,
        executionMode: draft.executionMode ?? "ALL_MATCHING",
        status: "DRAFT",
        conditionTree: draft.conditionTree ?? {},
        actions: (draft.actions ?? []).map((a) => ({
          actionUid: a.actionUid,
          actionType: a.actionType,
          formula: a.formula,
          config: a.config,
        })),
        effectiveAt: draft.effectiveAt,
        endAt: draft.endAt,
      };

      const res = draft.ruleUid
        ? await loyaltyRulesAdminApi.updateRule(draft.ruleUid, draft.programmeUid ?? "default", payload)
        : await loyaltyRulesAdminApi.createRule(payload);
      clearRuleDraft(tenantId, draftScope);
      toast.success(draft.ruleUid ? `Rule updated: ${res.ruleUid}` : `Rule created: ${res.ruleUid}`);
      router.push(listHref);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish rule");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateRuleShell title="Review & Publish">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        {!draft ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">No draft found</p>
            <p className="text-sm text-muted-foreground">Start creating a rule from the first step.</p>
            <Button className="rounded-full" onClick={() => router.push(basicInfoPath)}>
              Start
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Review your rule</p>
                <FieldHelp text="This step publishes the rule as DRAFT. It won't impact real customer earnings until you explicitly activate it after testing." />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Check everything before publishing as DRAFT.</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
              {kind === "campaign" && draft.campaignName ? (
                <section className="space-y-2">
                  <p className="text-sm font-semibold">Campaign</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{draft.campaignName}</span>
                    {draft.campaignUid ? ` · ${draft.campaignUid}` : null}
                  </p>
                </section>
              ) : null}
              <section className="space-y-2">
                <p className="text-sm font-semibold">Basic Info</p>
                <div className="text-sm text-muted-foreground">
                  <div>
                    Rule Name: <span className="text-foreground font-medium">{draft.name}</span>
                  </div>
                  <div>
                    Priority: <span className="text-foreground font-medium">{draft.priority}</span>
                  </div>
                  <div>
                    Event Type: <span className="text-foreground font-medium">{draft.triggerEventType}</span>
                  </div>
                  <div>
                    Execution Mode: <span className="text-foreground font-medium">{draft.executionMode}</span>
                  </div>
                </div>
              </section>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">Conditions</p>
                {(() => {
                  const ct = draft.conditionTree;
                  const isMissing = ct === undefined;
                  const isEveryone =
                    !isMissing &&
                    typeof ct === "object" &&
                    ct !== null &&
                    !Array.isArray(ct) &&
                    Object.keys(ct as Record<string, unknown>).length === 0;

                  if (isMissing) {
                    return (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                          Conditions step not completed
                        </p>
                      </div>
                    );
                  }
                  if (isEveryone) {
                    return (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Applies to everyone for event{" "}
                        <span className="font-mono">{draft.triggerEventType}</span>
                      </p>
                    );
                  }
                  return (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                        Preview condition tree JSON
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3 max-h-48">
                        {JSON.stringify(ct, null, 2)}
                      </pre>
                    </details>
                  );
                })()}
              </section>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">Actions</p>
                <p className="text-sm text-muted-foreground">
                  Award Points formula:{" "}
                  <span className="text-foreground font-medium">{draft.actions?.[0]?.formula ?? "—"}</span>
                </p>
              </section>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">Scheduling</p>
                <div className="text-sm text-muted-foreground">
                  <div>
                    Effective:{" "}
                    <span className="text-foreground font-medium">{draft.effectiveAt ?? "Immediate / none"}</span>
                  </div>
                  <div>
                    End: <span className="text-foreground font-medium">{draft.endAt ?? "No end date"}</span>
                  </div>
                </div>
              </section>
            </div>

            <label className="flex items-start gap-3">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} />
              <span className="text-sm">I understand the rule is not live yet</span>
            </label>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => router.push(schedulingPath)}
                disabled={publishing}
              >
                ← Back
              </Button>
              <Button type="button" className="rounded-full" onClick={onPublish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish as Draft"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </CreateRuleShell>
  );
}
