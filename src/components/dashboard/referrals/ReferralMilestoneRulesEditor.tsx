"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ReferralRuleCriteriaFields } from "@/components/dashboard/referrals/ReferralRuleCriteriaFields";
import { ApiError, programmeApiV2 } from "@/lib/api/client";
import { buildReferralCriteriaFields } from "@/lib/referrals/referral-criteria-catalog";
import type {
  ReferralMilestoneRule,
  ReferralRuleCriteria,
  ReferralRuleSchemaResponse,
} from "@/lib/api/client";
import {
  buildMilestoneEventOptions,
  eventKeyToMilestoneRulePatch,
  milestoneRuleToEventKey,
  REFERRAL_LINK_EVENT_KEY,
} from "@/lib/referrals/milestone-event-options";
import { extractEventTypesFromProgrammeConfig } from "@/lib/programme/event-schema-merge";

type Props = {
  programmeUid: string;
  rules: ReferralMilestoneRule[];
  schema: ReferralRuleSchemaResponse | null;
  onChange: (rules: ReferralMilestoneRule[]) => void;
};

const emptyCriteria = (): ReferralRuleCriteria => ({});

const emptyRule = (index: number): ReferralMilestoneRule => ({
  key: `milestone_${index + 1}`,
  label: "New milestone rule",
  description: "",
  enabled: true,
  trigger: "LINK",
  criteria: emptyCriteria(),
});

/** Template keys use underscores; avoid colliding with an existing rule key. */
function uniqueRuleKey(baseKey: string, rules: ReferralMilestoneRule[]): string {
  const normalized = baseKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!rules.some((r) => r.key === normalized)) {
    return normalized;
  }
  let n = 2;
  while (rules.some((r) => r.key === `${normalized}_${n}`)) {
    n += 1;
  }
  return `${normalized}_${n}`;
}

function templateBaseKey(templateKey: string): string {
  return templateKey.includes("_") ? templateKey : `${templateKey}_1`;
}

export function ReferralMilestoneRulesEditor({ programmeUid, rules, schema, onChange }: Props) {
  const [programmeConfigRoot, setProgrammeConfigRoot] = useState<unknown>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const programmeEventTypes = useMemo(
    () => extractEventTypesFromProgrammeConfig(programmeConfigRoot ?? {}),
    [programmeConfigRoot]
  );

  const loadProgrammeConfig = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await programmeApiV2.getProgrammeConfig(programmeUid);
      setProgrammeConfigRoot(res.config ?? {});
    } catch (e) {
      setProgrammeConfigRoot(null);
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setEventsLoading(false);
    }
  }, [programmeUid]);

  useEffect(() => {
    void loadProgrammeConfig();
  }, [loadProgrammeConfig]);

  const eventOptions = useMemo(() => {
    const seen = new Set(programmeEventTypes.map((t) => t.toUpperCase()));
    const merged = [...programmeEventTypes];
    for (const rule of rules) {
      if (rule.trigger === "PURCHASE" && !seen.has("PURCHASE")) {
        seen.add("PURCHASE");
        merged.push("PURCHASE");
      }
      for (const et of rule.criteria?.eventTypes ?? []) {
        const key = et.trim().toUpperCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          merged.push(et.trim());
        }
      }
    }
    return buildMilestoneEventOptions(merged);
  }, [programmeEventTypes, rules]);

  const update = (index: number, patch: Partial<ReferralMilestoneRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const setRuleEvent = (index: number, eventKey: string) => {
    const rule = rules[index];
    const patch = eventKeyToMilestoneRulePatch(eventKey, rule);
    update(index, patch);
  };

  const addRule = () => {
    onChange([...rules, emptyRule(rules.length)]);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) {
      toast.error("Keep at least one milestone rule");
      return;
    }
    onChange(rules.filter((_, i) => i !== index));
  };

  const applyTemplate = (templateKey: string) => {
    const t = schema?.templates?.find((x) => x.key === templateKey);
    if (!t) return;
    const baseKey = templateBaseKey(t.key);
    const key = uniqueRuleKey(baseKey, rules);
    if (key !== baseKey) {
      toast(
        `Added as "${key}" — a rule with key "${baseKey}" is already in your list. Rename it or remove the duplicate if you only need one.`,
        { icon: "ℹ️" }
      );
    }
    onChange([
      ...rules,
      {
        key,
        label: t.label,
        description: t.description,
        enabled: true,
        trigger: (t.trigger as ReferralMilestoneRule["trigger"]) ?? "LINK",
        criteria: { ...(t.criteriaDefaults as ReferralRuleCriteria) },
      },
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Milestone rules</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Choose when each rule runs from your programme&apos;s event schema (plus referral link).
            Criteria below refine purchase or event filters.
          </p>
        </div>
        <Button type="button" onClick={addRule} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
      </div>

      {schema?.templates && schema.templates.length > 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Quick start templates
          </p>
          <div className="flex flex-wrap gap-2">
            {schema.templates.map((t) => {
              const baseKey = templateBaseKey(t.key);
              const inUse = rules.some((r) => r.key === baseKey);
              return (
                <Button
                  key={t.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  title={
                    inUse
                      ? `Rule "${baseKey}" already exists — click to add another copy with a new key`
                      : undefined
                  }
                  onClick={() => applyTemplate(t.key)}
                >
                  {t.label}
                  {inUse ? " +" : ""}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {programmeEventTypes.length === 0 && !eventsLoading && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No integration events found for this programme. Add event types in{" "}
          <Link href="/dashboard/setup/event-schema" className="font-medium underline">
            Event schema setup
          </Link>{" "}
          to offer more than referral link and purchase.
        </p>
      )}

      {rules.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Add a rule or pick a template to get started.
        </p>
      )}

      <div className="space-y-4">
        {rules.map((rule, index) => {
          const eventKey = milestoneRuleToEventKey(rule);
          const selectedEvent = eventOptions.find((o) => o.value === eventKey);
          return (
            <article
              key={`${rule.key}-${index}`}
              className="rounded-xl border bg-card shadow-sm ring-1 ring-border/60"
            >
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={rule.enabled !== false}
                    onChange={(e) => update(index, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRule(index)}
                  disabled={rules.length <= 1}
                  aria-label="Remove rule"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rule key (saved in config)</Label>
                  <Input
                    value={rule.key}
                    onChange={(e) =>
                      update(index, {
                        key: e.target.value.trim().toLowerCase().replace(/\s+/g, "_"),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display name</Label>
                  <Input
                    value={rule.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    value={rule.description ?? ""}
                    onChange={(e) => update(index, { description: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">When does this rule run?</Label>
                  <NativeSelect
                    ariaLabel={`When rule ${rule.key} runs`}
                    value={
                      eventOptions.some((o) => o.value === eventKey)
                        ? eventKey
                        : eventKey === REFERRAL_LINK_EVENT_KEY
                          ? REFERRAL_LINK_EVENT_KEY
                          : eventOptions[0]?.value ?? REFERRAL_LINK_EVENT_KEY
                    }
                    onChange={(key) => setRuleEvent(index, key)}
                    options={
                      eventOptions.length > 0
                        ? eventOptions.map((o) => ({ value: o.value, label: o.label }))
                        : [
                            {
                              value: REFERRAL_LINK_EVENT_KEY,
                              label: "When referee links referral code",
                            },
                          ]
                    }
                    disabled={eventsLoading}
                  />
                  {selectedEvent?.description && (
                    <p className="text-xs text-muted-foreground">{selectedEvent.description}</p>
                  )}
                  {!eventOptions.some((o) => o.value === eventKey) &&
                    eventKey !== REFERRAL_LINK_EVENT_KEY &&
                    rule.trigger === "INTEGRATION_EVENT" && (
                      <p className="text-xs text-amber-700">
                        Saved event <code className="rounded bg-muted px-1">{eventKey}</code> is not in
                        this programme&apos;s schema; add it in Event schema or pick another event.
                      </p>
                    )}
                </div>
              </div>

              {rule.trigger !== "LINK" && (
                <ReferralRuleCriteriaFields
                  fields={buildReferralCriteriaFields({
                    rule,
                    configRoot: programmeConfigRoot,
                    ruleSchema: schema,
                  })}
                  criteria={rule.criteria}
                  onCriteriaChange={(criteria) => update(index, { criteria })}
                />
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
