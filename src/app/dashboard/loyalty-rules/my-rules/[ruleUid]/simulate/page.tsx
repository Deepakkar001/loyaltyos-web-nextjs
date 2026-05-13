"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { integrationApi, loyaltyRulesAdminApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { markSandboxPassed } from "@/lib/store/rule-sandbox-gate";

/** Must match `FIELD_METADATA["event.channel"].options` — sandbox `#event['channel']` is compared case-sensitively. */
const CHANNEL_OPTIONS = [
  { value: "mobile", label: "mobile" },
  { value: "web", label: "web" },
  { value: "instore", label: "instore" },
] as const;

/**
 * Condition builder / diagram leaf values use lowercase event types (purchase, login, referral).
 * Basic Info / integrations may use uppercase. Sandbox payload must match your `event.eventType`
 * condition **exactly** (case-sensitive).
 */
const EVENT_TYPE_SUGGESTIONS = ["purchase", "login", "referral", "PURCHASE", "LOGIN", "REFERRAL"] as const;

type RuleEval = {
  tenantId?: string;
  programmeUid?: string;
  customerId?: string;
  eventId?: string;
  message?: string;
  basePointsCalculated?: number;
  tierMultiplier?: number;
  finalPointsAwarded?: number;
  dailyCapRemaining?: number;
  monthlyCapRemaining?: number;
  matchedRules?: Array<{ ruleUid?: string; ruleName?: string; pointsFromThisRule?: number }>;
  suppressedRules?: Array<{ ruleUid?: string; reason?: string }>;
  rewardCommands?: Array<{ actionType?: string; pointsToAward?: number; sourceRuleUid?: string; idempotencyKey?: string }>;
  evaluationTrace?: unknown;
};

type SandboxValidateResponse = {
  status?: string;
  tenantId?: string;
  payload?: unknown;
  schemaPresent?: boolean;
  ruleEvaluation?: RuleEval;
  ruleEvaluationError?: string;
};

export default function RuleSimulatePage() {
  const params = useParams<{ ruleUid: string }>();
  const search = useSearchParams();
  const programmeUid = search.get("programmeUid") || "default";
  const ruleUid = params.ruleUid;
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";

  const [customerId, setCustomerId] = useState("cust_123");
  const [amount, setAmount] = useState("500");
  /** Default aligns with condition-builder literals; may be overwritten from saved rule below. */
  const [eventType, setEventType] = useState("purchase");
  const [transactionId, setTransactionId] = useState(`txn_${Date.now()}`);
  const [channel, setChannel] = useState("mobile");
  const [payloadOverride, setPayloadOverride] = useState("");

  const [result, setResult] = useState<SandboxValidateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rule = await loyaltyRulesAdminApi.getRule(ruleUid, programmeUid);
        if (cancelled || !rule?.triggerEventType) return;
        setEventType(rule.triggerEventType);
      } catch {
        // non-blocking: keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ruleUid, programmeUid]);

  const payloadJson = useMemo(() => {
    if (payloadOverride.trim()) return payloadOverride.trim();
    const payload = {
      programmeUid,
      eventType,
      timestamp: new Date().toISOString(),
      transactionId,
      customerId,
      amount: Number(amount),
      channel,
    };
    return JSON.stringify(payload, null, 2);
  }, [payloadOverride, programmeUid, eventType, transactionId, customerId, amount, channel]);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = (await integrationApi.validateSandboxEvent(payloadJson, ruleUid)) as SandboxValidateResponse;
      setResult(res);

      // Best-effort: determine if this specific rule matched by checking ruleEvaluation.matchedRules.
      const ruleEval = res.ruleEvaluation;
      const matchedRules = Array.isArray(ruleEval?.matchedRules) ? ruleEval.matchedRules : [];
      const didMatch = matchedRules.some((m) => String(m?.ruleUid ?? "") === ruleUid);
      const finalPoints = typeof ruleEval?.finalPointsAwarded === "number" ? ruleEval.finalPointsAwarded : undefined;

      if (tenantId && didMatch) {
        markSandboxPassed(tenantId, programmeUid, ruleUid, {
          passed: true,
          passedAt: new Date().toISOString(),
          lastTxnId: transactionId,
          lastPoints: finalPoints,
        });
        toast.success("Sandbox test passed for this rule. Activation is now enabled.");
      } else if (didMatch && !tenantId) {
        toast("Rule matched. Sign in to record the sandbox pass for activation.");
      } else if (!didMatch) {
        toast(
          "No match for this rule. Set event type / amount / channel to the same values your conditions use (case-sensitive).",
          { duration: 5000 }
        );
      } else {
        toast("Sandbox test completed.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sandbox test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Rule Before Activation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run a sandbox validation event. If this rule matches, we’ll unlock activation.
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Conditions compare <b>case-sensitively</b> with this payload (e.g. <code className="text-xs">event.eventType</code> must
            equal the <b>Event type</b> string below — use <code className="text-xs">purchase</code> if your condition uses that, or{" "}
            <code className="text-xs">PURCHASE</code> if that is what you saved on Basic Info). Channel must match condition literals (
            <code className="text-xs">mobile</code>, not <code className="text-xs">MOBILE_APP</code>).
          </p>
        </div>
        <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(ruleUid)}/details?programmeUid=${encodeURIComponent(programmeUid)}`}>
          <Button variant="outline" className="rounded-full">Back to Details</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
          <p className="text-sm font-semibold">Create Test Event</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" htmlFor="eventType">
                Event type (must match condition literals)
              </Label>
              <Input
                id="eventType"
                list="sandbox-event-type-suggestions"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="purchase or PURCHASE"
                autoComplete="off"
              />
              <datalist id="sandbox-event-type-suggestions">
                {EVENT_TYPE_SUGGESTIONS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" htmlFor="customerId">Customer ID</Label>
              <Input id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" htmlFor="amount">Amount</Label>
              <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground" htmlFor="channel">
                Channel (must match <code className="text-[10px]">event.channel</code> in conditions)
              </Label>
              <Input
                id="channel"
                list="sandbox-channel-suggestions"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="mobile"
                autoComplete="off"
              />
              <datalist id="sandbox-channel-suggestions">
                {CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} />
                ))}
                <option value="MOBILE_APP" />
              </datalist>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs text-muted-foreground" htmlFor="transactionId">Transaction ID</Label>
              <Input id="transactionId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground" htmlFor="payloadOverride">
              Payload JSON (optional override)
            </Label>
            <Textarea
              id="payloadOverride"
              value={payloadOverride}
              onChange={(e) => setPayloadOverride(e.target.value)}
              placeholder="Leave empty to auto-generate from fields above"
              rows={10}
            />
            {!payloadOverride.trim() ? (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">Preview generated payload</summary>
                <pre className="mt-2 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
                  {payloadJson}
                </pre>
              </details>
            ) : null}
          </div>

          <div className="flex items-center justify-end">
            <Button className="rounded-full" onClick={runTest} disabled={loading}>
              {loading ? "Testing…" : "Test This Event"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
          <p className="text-sm font-semibold">Test Results</p>
          {!result ? (
            <p className="text-sm text-muted-foreground">Run a test to see evaluation output.</p>
          ) : (
            <div className="space-y-3">
              {result.ruleEvaluationError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  {result.ruleEvaluationError}
                </div>
              ) : null}

              {result.ruleEvaluation ? (
                <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                  <p className="text-sm font-semibold">Outcome</p>
                  {result.ruleEvaluation.message ? (
                    <p className="text-sm text-foreground rounded-lg border border-border bg-[var(--surface-sunken)] px-3 py-2">
                      {result.ruleEvaluation.message}
                    </p>
                  ) : null}
                  <div className="text-sm text-muted-foreground">
                    <div>
                      Final points:{" "}
                      <span className="text-foreground font-semibold">
                        {result.ruleEvaluation.finalPointsAwarded ?? "-"}
                      </span>
                    </div>
                    <div>Matched rules: {result.ruleEvaluation.matchedRules?.length ?? 0}</div>
                    <div>Suppressed rules: {result.ruleEvaluation.suppressedRules?.length ?? 0}</div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-semibold">Matched rules</p>
                    {result.ruleEvaluation.matchedRules?.length ? (
                      <div className="mt-2 space-y-2">
                        {result.ruleEvaluation.matchedRules.map((m, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-[var(--surface-sunken)] p-3 text-sm">
                            <div className="font-medium">{m.ruleName ?? m.ruleUid}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ruleUid: {m.ruleUid ?? "-"} · points: {m.pointsFromThisRule ?? "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No matched rules.</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-semibold">Reward commands</p>
                    {result.ruleEvaluation.rewardCommands?.length ? (
                      <div className="mt-2 space-y-2">
                        {result.ruleEvaluation.rewardCommands.map((c, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-[var(--surface-sunken)] p-3 text-sm">
                            <div className="font-medium">{c.actionType ?? "ACTION"}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              points: {c.pointsToAward ?? "-"} · sourceRule: {c.sourceRuleUid ?? "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No commands generated.</p>
                    )}
                  </div>

                  <details className="pt-2">
                    <summary className="text-sm font-semibold cursor-pointer">Raw trace</summary>
                    <pre className="mt-2 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
                      {JSON.stringify(result.ruleEvaluation.evaluationTrace ?? {}, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : null}

              <details>
                <summary className="text-sm font-semibold cursor-pointer">Raw response</summary>
                <pre className="mt-2 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

