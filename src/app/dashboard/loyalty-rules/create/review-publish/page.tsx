"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { FieldHelp } from "@/components/ui/field-help";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { clearRuleDraft, loadRuleDraft } from "@/lib/store/rule-draft-storage";
import { loyaltyRulesAdminApi } from "@/lib/api/client";
import type { RuleUpsertRequest } from "@/types/rules";

export default function CreateRuleReviewPublishPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";

  const draft = useMemo(() => {
    if (!tenantId) return null;
    return loadRuleDraft(tenantId);
  }, [tenantId]);

  const [ack, setAck] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const onPublish = async () => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!draft || !draft.name) {
      toast.error("Rule draft not found. Start from Basic Info.");
      router.push("/dashboard/loyalty-rules/create/basic-info");
      return;
    }
    if (!ack) {
      toast.error("Please confirm you understand the rule is not live yet.");
      return;
    }
    setPublishing(true);
    try {
      const payload: RuleUpsertRequest = {
        programmeUid: draft.programmeUid ?? "default",
        ruleUid: draft.ruleUid,
        name: draft.name,
        description: draft.description,
        priority: draft.priority ?? 0,
        triggerEventType: draft.triggerEventType ?? "PURCHASE",
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
      clearRuleDraft(tenantId);
      toast.success(draft.ruleUid ? `Rule updated: ${res.ruleUid}` : `Rule created: ${res.ruleUid}`);
      router.push("/dashboard/loyalty-rules/my-rules");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to publish rule";
      toast.error(msg);
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
            <p className="text-sm text-muted-foreground">Start creating a rule from Basic Info.</p>
            <Button className="rounded-full" onClick={() => router.push("/dashboard/loyalty-rules/create/basic-info")}>
              Start
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Review your rule</p>
                <FieldHelp text="This step publishes the rule as DRAFT. It won’t impact real customer earnings until you explicitly activate it after testing." />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Check everything before publishing as DRAFT.</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
              <section className="space-y-2">
                <p className="text-sm font-semibold">Basic Info</p>
                <div className="text-sm text-muted-foreground">
                  <div>Rule Name: <span className="text-foreground font-medium">{draft.name}</span></div>
                  <div>Priority: <span className="text-foreground font-medium">{draft.priority}</span></div>
                  <div>Event Type: <span className="text-foreground font-medium">{draft.triggerEventType}</span></div>
                  <div>Execution Mode: <span className="text-foreground font-medium">{draft.executionMode}</span></div>
                </div>
              </section>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">Conditions</p>
                {(() => {
                  const ct = draft.conditionTree;
                  // Three states:
                  // 1. conditionTree is undefined  → user never visited the Conditions step.
                  // 2. conditionTree is {}         → user explicitly chose "Applies to everyone".
                  // 3. conditionTree is a tree     → show JSON preview.
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
                          ⚠ Conditions step not completed
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          Go back to the Conditions step and either build a filter or explicitly choose
                          &ldquo;Applies to everyone&rdquo; before publishing.
                        </p>
                      </div>
                    );
                  }
                  if (isEveryone) {
                    return (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950">
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          Applies to everyone (no filter)
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                          This rule will match every event of type{" "}
                          <span className="font-mono">{draft.triggerEventType}</span>.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                        Preview condition tree JSON ▶
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
                <div className="text-sm text-muted-foreground">
                  Award Points formula:{" "}
                  <span className="text-foreground font-medium">
                    {draft.actions?.[0]?.formula ?? "-"}
                  </span>
                </div>
              </section>
              <Separator />
              <section className="space-y-2">
                <p className="text-sm font-semibold">Scheduling</p>
                <div className="text-sm text-muted-foreground">
                  <div>Effective: <span className="text-foreground font-medium">{draft.effectiveAt ?? "Immediate / none"}</span></div>
                  <div>End: <span className="text-foreground font-medium">{draft.endAt ?? "No end date"}</span></div>
                </div>
              </section>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Note: This rule will be published as DRAFT.
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                You must test it in sandbox and explicitly activate it before it affects real customer earnings.
              </p>
            </div>

            <label className="flex items-start gap-3">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} />
              <span className="text-sm">
                I understand the rule is not live yet
              </span>
              <span className="ml-auto">
                <FieldHelp text="Publishing as DRAFT lets you validate the rule safely. After publishing, test with sandbox events and then activate when ready." />
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => router.push("/dashboard/loyalty-rules/create/scheduling")}
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

