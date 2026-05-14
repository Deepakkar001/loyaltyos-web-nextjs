"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RuleStatusBadge } from "@/components/loyalty-rules/RuleStatusBadge";
import { loyaltyRulesAdminApi, onboardingApi } from "@/lib/api/client";
import type { EarnRuleDetailResponse, RuleStatus } from "@/types/rules";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { clearSandboxGate, getSandboxGate } from "@/lib/store/rule-sandbox-gate";
import { RuleConditionFlowPreview } from "@/components/loyalty-rules/condition-flow/RuleConditionFlowPreview";

export default function RuleDetailsPage() {
  const router = useRouter();
  const params = useParams<{ ruleUid: string }>();
  const search = useSearchParams();
  const programmeUid = search.get("programmeUid") || "default";
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const onboardingStatus = useOnboardingStore((s) => s.onboardingStatus);
  const syncStatusFromBackend = useOnboardingStore((s) => s.syncStatusFromBackend);

  const ruleUid = params.ruleUid;
  const [rule, setRule] = useState<EarnRuleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await loyaltyRulesAdminApi.getRule(ruleUid, programmeUid);
        if (!alive) return;
        setRule(r);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load rule");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ruleUid, programmeUid]);

  const sandboxGate = useMemo(() => {
    if (!tenantId || !ruleUid) return null;
    return getSandboxGate(tenantId, programmeUid, ruleUid);
  }, [tenantId, programmeUid, ruleUid]);

  const setStatus = async (next: RuleStatus) => {
    if (!rule) return;
    setWorking(true);
    try {
      const res = await loyaltyRulesAdminApi.patchStatus(rule.ruleUid, programmeUid, next);
      toast.success(`Status updated: ${res.status}`);
      // Clear sandbox gate when rule changes state away from draft-ish lifecycle.
      if (tenantId && (next === "ACTIVE" || next === "PAUSED")) {
        clearSandboxGate(tenantId, programmeUid, rule.ruleUid);
      }
      const refreshed = await loyaltyRulesAdminApi.getRule(rule.ruleUid, programmeUid);
      setRule(refreshed);

      // Guided onboarding: once the first rule is activated, advance to Integration.
      if (next === "ACTIVE" && onboardingStatus === "CONFIGURED") {
        try {
          await onboardingApi.completeRulesSetup();
          syncStatusFromBackend("RULES_CONFIGURED");
        } catch {
          // If backend rejects (already advanced), continue the UX flow anyway.
        }
        router.replace("/dashboard/integrate");
        return;
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setWorking(false);
    }
  };

  const archive = async () => {
    if (!rule) return;
    setWorking(true);
    try {
      await loyaltyRulesAdminApi.archiveRule(rule.ruleUid, programmeUid);
      toast.success("Rule archived");
      router.push("/dashboard/loyalty-rules/my-rules");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to archive rule");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  if (!rule) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <p className="text-sm font-semibold">Rule not found</p>
        <Button className="mt-4 rounded-full" onClick={() => router.push("/dashboard/loyalty-rules/my-rules")}>
          Back to My Rules
        </Button>
      </Card>
    );
  }

  const canEdit = rule.status === "DRAFT";
  const canActivate = rule.status === "DRAFT" && Boolean(sandboxGate?.passed);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <RuleStatusBadge status={rule.status} />
            <h1 className="text-2xl font-bold tracking-tight truncate">{rule.name}</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Rule UID: {rule.ruleUid}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(rule.ruleUid)}/change-history?programmeUid=${encodeURIComponent(programmeUid)}`}>
            <Button variant="outline" className="rounded-full">Change History</Button>
          </Link>
          <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(rule.ruleUid)}/simulate?programmeUid=${encodeURIComponent(programmeUid)}`}>
            <Button variant="outline" className="rounded-full">Test (Sandbox)</Button>
          </Link>
          <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(rule.ruleUid)}/edit?programmeUid=${encodeURIComponent(programmeUid)}`}>
            <Button variant="outline" className="rounded-full" disabled={!canEdit}>Edit</Button>
          </Link>
        </div>
      </div>

      {!sandboxGate?.passed && rule.status === "DRAFT" ? (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Sandbox test required before activation
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            Run a sandbox test from “Test (Sandbox)”. Activation stays disabled until a test passes.
          </p>
        </Card>
      ) : null}

      {sandboxGate?.passed && rule.status === "DRAFT" ? (
        <Card className="p-4 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Sandbox test passed
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            Passed at {new Date(sandboxGate.passedAt).toLocaleString()}. You can now activate.
          </p>
        </Card>
      ) : null}

      <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Rule Definition</p>
          <div className="flex flex-wrap gap-2">
            {rule.status === "DRAFT" ? (
              <Button className="rounded-full" onClick={() => setStatus("ACTIVE")} disabled={!canActivate || working}>
                Activate
              </Button>
            ) : null}
            {rule.status === "ACTIVE" ? (
              <Button variant="outline" className="rounded-full" onClick={() => setStatus("PAUSED")} disabled={working}>
                Pause
              </Button>
            ) : null}
            {rule.status === "PAUSED" ? (
              <Button className="rounded-full" onClick={() => setStatus("ACTIVE")} disabled={working}>
                Reactivate
              </Button>
            ) : null}
            {rule.status !== "ARCHIVED" ? (
              <Button variant="outline" className="rounded-full" onClick={archive} disabled={working}>
                Archive
              </Button>
            ) : null}
            {rule.status === "ARCHIVED" ? (
              <Button className="rounded-full" onClick={() => setStatus("DRAFT")} disabled={working}>
                Restore (as Draft)
              </Button>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Trigger Event Type</p>
            <p className="font-medium">{rule.triggerEventType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Execution Mode</p>
            <p className="font-medium">{rule.executionMode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Priority</p>
            <p className="font-medium">{rule.priority}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scheduling</p>
            <p className="font-medium">
              {rule.effectiveAt ? new Date(rule.effectiveAt).toLocaleString() : "Immediate / none"}{" "}
              →{" "}
              {rule.endAt ? new Date(rule.endAt).toLocaleString() : "No end"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Actions</p>
          {rule.actions?.length ? (
            <div className="space-y-2">
              {rule.actions.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">{a.actionType}</p>
                  {a.formula ? (
                    <p className="mt-1 text-xs text-muted-foreground">Formula: <span className="text-foreground font-medium">{a.formula}</span></p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No actions configured.</p>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Condition flow</p>
          <p className="text-xs text-muted-foreground">
            Same layout as the rule editor diagram. Pan and zoom to explore; this view is read-only.
          </p>
          <RuleConditionFlowPreview
            conditionTree={rule.conditionTree}
            eventType={rule.triggerEventType}
            actions={rule.actions}
          />
          <details className="rounded-xl border border-border/70 bg-[var(--surface-sunken)] px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
              Technical: condition tree (JSON)
            </summary>
            <pre className="text-xs overflow-auto mt-2 pb-1 max-h-64 border-t border-border/60 pt-2">
              {JSON.stringify(rule.conditionTree ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      </Card>

      <div>
        <Link href="/dashboard/loyalty-rules/my-rules">
          <Button variant="outline" className="rounded-full">← Back to My Rules</Button>
        </Link>
      </div>
    </div>
  );
}

