"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { integrationApi, loyaltyRulesAdminApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { markSandboxPassed } from "@/lib/store/rule-sandbox-gate";
import {
  buildLegacySandboxPayload,
  buildSandboxPayloadFromFields,
  defaultSandboxInputForField,
  resolveSandboxFormFields,
  type SandboxFormField,
} from "@/lib/rules/rule-simulate-schema";
import { useRuleSimulateEventSchema } from "@/lib/rules/use-rule-simulate-event-schema";

/** Legacy fallback — sandbox `#event['channel']` is compared case-sensitively. */
const CHANNEL_OPTIONS = [
  { value: "mobile", label: "mobile" },
  { value: "web", label: "web" },
  { value: "instore", label: "instore" },
] as const;

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

function fieldsIdentity(fields: SandboxFormField[]): string {
  return fields.map((f) => `${f.name}:${f.source}:${f.widget}`).join("|");
}

function readTransactionIdFromPayloadJson(payloadJson: string, fallback: string): string {
  try {
    const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
    const t = parsed.transactionId ?? parsed.transaction_id;
    if (typeof t === "string" && t.trim()) return t;
  } catch {
    /* ignore */
  }
  return fallback;
}

export default function RuleSimulatePage() {
  const params = useParams<{ ruleUid: string }>();
  const search = useSearchParams();
  const programmeUid = search.get("programmeUid") || "default";
  const ruleUid = params.ruleUid;
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";

  const [campaignUid, setCampaignUid] = useState<string | undefined>(undefined);

  const [customerId, setCustomerId] = useState("cust_123");
  const [amount, setAmount] = useState("500");
  const [eventType, setEventType] = useState("purchase");
  const [transactionId, setTransactionId] = useState(`txn_${Date.now()}`);
  const [channel, setChannel] = useState("mobile");
  const [payloadOverride, setPayloadOverride] = useState("");

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const [result, setResult] = useState<SandboxValidateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    loading: schemaLoading,
    error: schemaError,
    draft,
    programmeConfigRoot,
    suggestedEventTypes,
  } = useRuleSimulateEventSchema({ programmeUid, campaignUid });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rule = await loyaltyRulesAdminApi.getRule(ruleUid, programmeUid);
        if (cancelled || !rule) return;
        if (rule.triggerEventType) {
          setEventType(rule.triggerEventType);
        }
        setCampaignUid(rule.campaignUid?.trim() || undefined);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ruleUid, programmeUid]);

  const { eventDefinitionMatched, fields } = useMemo(() => {
    if (!draft) {
      return { eventDefinitionMatched: false, fields: [] as SandboxFormField[] };
    }
    return resolveSandboxFormFields({
      draft,
      eventType,
      programmeConfigRoot: programmeConfigRoot ?? null,
    });
  }, [draft, eventType, programmeConfigRoot]);

  const useDynamicForm = Boolean(draft && fields.length > 0);

  const fieldsKey = fieldsIdentity(fields);
  useEffect(() => {
    if (!useDynamicForm) {
      setFieldValues({});
      return;
    }
    const next: Record<string, string> = {};
    for (const f of fields) {
      next[f.name] = defaultSandboxInputForField(f);
    }
    setFieldValues(next);
  }, [eventType, fieldsKey, useDynamicForm]);

  const payloadObject = useMemo(() => {
    if (useDynamicForm) {
      return buildSandboxPayloadFromFields({
        programmeUid,
        eventType,
        fields,
        fieldValues,
      });
    }
    return buildLegacySandboxPayload({
      programmeUid,
      eventType,
      transactionId,
      customerId,
      amount,
      channel,
    });
  }, [
    useDynamicForm,
    programmeUid,
    eventType,
    fields,
    fieldValues,
    transactionId,
    customerId,
    amount,
    channel,
  ]);

  const payloadJson = useMemo(() => {
    if (payloadOverride.trim()) return payloadOverride.trim();
    return JSON.stringify(payloadObject, null, 2);
  }, [payloadOverride, payloadObject]);

  const eventTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (t: string) => {
      const s = t.trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      out.push(s);
    };
    for (const t of suggestedEventTypes) push(t);
    for (const t of EVENT_TYPE_SUGGESTIONS) push(t);
    return out;
  }, [suggestedEventTypes]);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = (await integrationApi.validateSandboxEvent(payloadJson, ruleUid)) as SandboxValidateResponse;
      setResult(res);

      const ruleEval = res.ruleEvaluation;
      const matchedRules = Array.isArray(ruleEval?.matchedRules) ? ruleEval.matchedRules : [];
      const didMatch = matchedRules.some((m) => String(m?.ruleUid ?? "") === ruleUid);
      const finalPoints = typeof ruleEval?.finalPointsAwarded === "number" ? ruleEval.finalPointsAwarded : undefined;

      const gateTxnId = readTransactionIdFromPayloadJson(
        payloadJson,
        useDynamicForm ? (fieldValues.transactionId ?? "") : transactionId
      );

      if (tenantId && didMatch) {
        markSandboxPassed(tenantId, programmeUid, ruleUid, {
          passed: true,
          passedAt: new Date().toISOString(),
          lastTxnId: gateTxnId,
          lastPoints: finalPoints,
        });
        toast.success("Sandbox test passed for this rule. Activation is now enabled.");
      } else if (didMatch && !tenantId) {
        toast("Rule matched. Sign in to record the sandbox pass for activation.");
      } else if (!didMatch) {
        toast(
          "No match for this rule. Set event type / amounts / channels to the same values your conditions use (case-sensitive).",
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

  const setField = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
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
            equal the <b>Event type</b> string below). When an event schema exists, fields match your programme or campaign definition;{" "}
            otherwise the simple field set is used.
          </p>
          {campaignUid ? (
            <p className="text-xs text-muted-foreground mt-2">
              Campaign rule — event schema loads from the campaign, falling back to the programme template when the campaign has no
              schema.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Programme rule — event schema comes from programme configuration.</p>
          )}
        </div>
        <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(ruleUid)}/details?programmeUid=${encodeURIComponent(programmeUid)}`}>
          <Button variant="outline" className="rounded-full">
            Back to Details
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
          <p className="text-sm font-semibold">Create Test Event</p>

          {schemaError ? (
            <p className="text-xs text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
              {schemaError} — using basic fields below.
            </p>
          ) : null}

          {schemaLoading ? <p className="text-xs text-muted-foreground">Loading event schema…</p> : null}

          {!schemaLoading && useDynamicForm && !eventDefinitionMatched && fields.length > 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-border bg-[var(--surface-sunken)] px-3 py-2">
              This event type is not listed in the schema’s event definitions; only custom fields appear. Choose a defined event type
              for the full core field set, or use the JSON override.
            </p>
          ) : null}

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
              {eventTypeOptions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          {useDynamicForm ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={`${f.source}-${f.name}`} className={`space-y-2 ${f.widget === "object" ? "sm:col-span-2" : ""}`}>
                  <Label className="text-xs text-muted-foreground" htmlFor={`sf-${f.name}`}>
                    {f.name}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      ({f.type}
                      {f.required ? ", required" : ""})
                    </span>
                  </Label>
                  {f.widget === "boolean" ? (
                    <NativeSelect
                      id={`sf-${f.name}`}
                      ariaLabel={`${f.name} boolean`}
                      value={fieldValues[f.name] ?? "false"}
                      onChange={(v) => setField(f.name, v)}
                      options={[
                        { value: "false", label: "false" },
                        { value: "true", label: "true" },
                      ]}
                    />
                  ) : f.widget === "channel" ? (
                    f.channelOptions?.length ? (
                      <NativeSelect
                        id={`sf-${f.name}`}
                        ariaLabel={`${f.name} channel`}
                        value={fieldValues[f.name] ?? ""}
                        onChange={(v) => setField(f.name, v)}
                        options={f.channelOptions.map((v) => ({ value: v, label: v }))}
                      />
                    ) : (
                      <Input
                        id={`sf-${f.name}`}
                        value={fieldValues[f.name] ?? ""}
                        onChange={(e) => setField(f.name, e.target.value)}
                        placeholder="channel"
                        autoComplete="off"
                      />
                    )
                  ) : f.widget === "integer" ? (
                    <Input
                      id={`sf-${f.name}`}
                      type="number"
                      step={1}
                      value={fieldValues[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                  ) : f.widget === "number" ? (
                    <Input
                      id={`sf-${f.name}`}
                      type="number"
                      step="any"
                      value={fieldValues[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                  ) : f.widget === "datetime" ? (
                    <Input
                      id={`sf-${f.name}`}
                      type="datetime-local"
                      value={fieldValues[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                  ) : f.widget === "object" ? (
                    <Textarea
                      id={`sf-${f.name}`}
                      value={fieldValues[f.name] ?? "{}"}
                      onChange={(e) => setField(f.name, e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <Input
                      id={`sf-${f.name}`}
                      value={fieldValues[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      autoComplete="off"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" htmlFor="customerId">
                  Customer ID
                </Label>
                <Input id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground" htmlFor="amount">
                  Amount
                </Label>
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
                <Label className="text-xs text-muted-foreground" htmlFor="transactionId">
                  Transaction ID
                </Label>
                <Input id="transactionId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
              </div>
            </div>
          )}

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
                      <span className="text-foreground font-semibold">{result.ruleEvaluation.finalPointsAwarded ?? "-"}</span>
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
