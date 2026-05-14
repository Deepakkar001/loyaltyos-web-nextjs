"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FieldHelp } from "@/components/ui/field-help";
import { NativeSelect } from "@/components/ui/native-select";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { cn } from "@/lib/utils";
import { programmeApiV2, ApiError } from "@/lib/api/client";
import {
  extractEventTypesFromProgrammeConfig,
  mergeProgrammeDropdownRows,
} from "@/lib/programme/programme-config-helpers";

const schema = z.object({
  programmeUid: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  priority: z.coerce.number().min(0).max(100),
  triggerEventType: z.string().min(1),
  executionMode: z.enum(["FIRST_MATCH", "ALL_MATCHING"]),
});

type FormData = z.input<typeof schema>;

export default function CreateRuleBasicInfoPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      programmeUid: "default",
      name: "",
      description: "",
      priority: 10,
      triggerEventType: "PURCHASE",
      executionMode: "ALL_MATCHING",
    },
  });

  const programmeUid = useWatch({ control: form.control, name: "programmeUid" });
  const triggerEventType = useWatch({ control: form.control, name: "triggerEventType" });

  const [programmeRows, setProgrammeRows] = useState<Array<{ programmeUid: string; name: string }>>([
    { programmeUid: "default", name: "Default programme" },
  ]);
  const [programmesLoading, setProgrammesLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState<string[]>(["PURCHASE"]);
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  /** Bumped when a stored draft is merged into the form so event-type options refetch for the loaded trigger. */
  const [draftBootstrapKey, setDraftBootstrapKey] = useState(0);

  const name = form.watch("name");
  const nameCount = useMemo(() => (name ?? "").length, [name]);

  const programmeSelectRows = useMemo(() => {
    const rows = [...programmeRows];
    if (programmeUid && !rows.some((r) => r.programmeUid === programmeUid)) {
      rows.push({ programmeUid, name: `${programmeUid} (saved rule)` });
    }
    return rows;
  }, [programmeRows, programmeUid]);

  const programmeSelectOptions = useMemo(
    () =>
      programmeSelectRows.map((p) => ({
        value: p.programmeUid,
        label: `${p.name} (${p.programmeUid})`,
      })),
    [programmeSelectRows]
  );

  const eventTypeSelectOptions = useMemo(
    () => eventTypes.map((t) => ({ value: t, label: t })),
    [eventTypes]
  );

  useEffect(() => {
    if (!tenantId) return;
    const existing = loadRuleDraft(tenantId);
    if (!existing) return;
    form.reset({
      programmeUid: existing.programmeUid ?? "default",
      name: existing.name ?? "",
      description: existing.description ?? "",
      priority: existing.priority ?? 10,
      triggerEventType: existing.triggerEventType ?? "PURCHASE",
      executionMode: existing.executionMode ?? "ALL_MATCHING",
    });
    setDraftBootstrapKey((k) => k + 1);
  }, [tenantId, form]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      setProgrammesLoading(true);
      try {
        const list = await programmeApiV2.listProgrammes();
        if (cancelled) return;
        setProgrammeRows(mergeProgrammeDropdownRows(list ?? []));
      } catch (e) {
        if (!cancelled && e instanceof ApiError) toast.error(e.message);
      } finally {
        if (!cancelled) setProgrammesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !programmeUid) return;
    let cancelled = false;
    const preserveTrigger = form.getValues("triggerEventType");
    (async () => {
      setEventTypesLoading(true);
      try {
        const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
        if (cancelled) return;
        const types = extractEventTypesFromProgrammeConfig(blob?.config, [preserveTrigger]);
        setEventTypes(types);
        const current = form.getValues("triggerEventType");
        if (!types.includes(current)) {
          form.setValue("triggerEventType", types[0] ?? "PURCHASE", { shouldValidate: true });
        }
      } catch (e) {
        if (cancelled) return;
        const types = extractEventTypesFromProgrammeConfig(null, [preserveTrigger]);
        setEventTypes(types);
        const current = form.getValues("triggerEventType");
        if (!types.includes(current)) {
          form.setValue("triggerEventType", types[0] ?? "PURCHASE", { shouldValidate: true });
        }
        if (e instanceof ApiError) toast.error(e.message);
      } finally {
        if (!cancelled) setEventTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, programmeUid, draftBootstrapKey, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    saveRuleDraftFields(tenantId, {
      programmeUid: data.programmeUid ?? "default",
      name: data.name,
      description: data.description,
      priority: Number(data.priority),
      triggerEventType: data.triggerEventType,
      executionMode: data.executionMode,
      status: "DRAFT",
    });
    router.push("/dashboard/loyalty-rules/create/conditions");
  });

  return (
    <CreateRuleShell title="Create Loyalty Rule">
      <Card className="overflow-visible p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">Basic Information</p>
            <p className="text-sm text-muted-foreground mt-1">
              Give your rule a clear, memorable name. Programme and trigger event type use your browser’s native
              dropdowns (lists from the API and your saved programme configuration).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  Rule Name *
                </Label>
                <FieldHelp text="A human-friendly name for this rule. You’ll see it in the rules list, analytics, and when troubleshooting." />
              </div>
              <Input id="name" placeholder='e.g. "Weekend 2x Bonus"' {...form.register("name")} />
              <p className="text-xs text-muted-foreground">{nameCount}/100 characters</p>
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="description" className="text-xs text-muted-foreground">
                  Description (optional)
                </Label>
                <FieldHelp text="Optional internal notes. Explain why the rule exists, who requested it, or any guardrails so your team can maintain it later." />
              </div>
              <Textarea
                id="description"
                placeholder="Help admins understand intent"
                rows={4}
                {...form.register("description")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="programmeUid" className="text-xs text-muted-foreground">
                  Programme *
                </Label>
                <FieldHelp text="Rules are scoped to one programme. The list matches Programmes under Configure; pick the same programmeUid your events send." />
              </div>
              <NativeSelect
                id="programmeUid"
                name="programmeUid"
                ariaLabel="Programme"
                value={programmeUid}
                disabled={programmesLoading || programmeSelectOptions.length === 0}
                onChange={(v) =>
                  form.setValue("programmeUid", v || "default", { shouldValidate: true, shouldDirty: true })
                }
                options={programmeSelectOptions}
              />
              {programmesLoading ? (
                <p className="text-xs text-muted-foreground">Loading programmes…</p>
              ) : null}
              {form.formState.errors.programmeUid && (
                <p className="text-xs text-red-600">{form.formState.errors.programmeUid.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="triggerEventType" className="text-xs text-muted-foreground">
                  Trigger Event Type *
                </Label>
                <FieldHelp text="Event types are loaded from Configure Programme → Events for the selected programme. If none are defined yet, common defaults are shown; add definitions there for full control." />
              </div>
              <NativeSelect
                id="triggerEventType"
                name="triggerEventType"
                ariaLabel="Trigger event type"
                value={triggerEventType}
                disabled={eventTypesLoading || eventTypeSelectOptions.length === 0}
                onChange={(v) => form.setValue("triggerEventType", v, { shouldValidate: true, shouldDirty: true })}
                options={eventTypeSelectOptions}
              />
              {eventTypesLoading ? (
                <p className="text-xs text-muted-foreground">Loading event types for this programme…</p>
              ) : null}
              {form.formState.errors.triggerEventType && (
                <p className="text-xs text-red-600">{form.formState.errors.triggerEventType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="priority" className="text-xs text-muted-foreground">
                  Rule Priority *
                </Label>
                <FieldHelp text="When multiple rules match the same event, higher priority is evaluated first. Use higher numbers for ‘must win’ rules; lower for optional bonuses." />
              </div>
              <Input id="priority" type="number" min={0} max={100} {...form.register("priority")} />
              <p className="text-xs text-muted-foreground">Higher priority evaluates first.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground">Execution Mode *</Label>
                <FieldHelp text="FIRST_MATCH stops after the first matching rule. ALL_MATCHING applies every matching rule. Choose FIRST_MATCH to avoid stacking rewards; choose ALL_MATCHING to allow bonuses to stack." />
              </div>
              <RadioGroup
                value={form.watch("executionMode")}
                onValueChange={(v) => form.setValue("executionMode", v as FormData["executionMode"])}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  onClick={() => form.setValue("executionMode", "FIRST_MATCH")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted/40 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                    form.watch("executionMode") === "FIRST_MATCH"
                      ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-200 dark:bg-brand-950/25 dark:ring-brand-500/30"
                      : "border-border"
                  )}
                >
                  <RadioGroupItem value="FIRST_MATCH" className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold">First Match</p>
                    <p className="text-xs text-muted-foreground">Stop after the first matched rule.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("executionMode", "ALL_MATCHING")}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted/40 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                    form.watch("executionMode") === "ALL_MATCHING"
                      ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-200 dark:bg-brand-950/25 dark:ring-brand-500/30"
                      : "border-border"
                  )}
                >
                  <RadioGroupItem value="ALL_MATCHING" className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold">All Matching</p>
                    <p className="text-xs text-muted-foreground">Accumulate rewards across all matched rules.</p>
                  </div>
                </button>
              </RadioGroup>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/dashboard/loyalty-rules/my-rules")}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={onNext}>
              Next: Conditions →
            </Button>
          </div>
        </div>
      </Card>
    </CreateRuleShell>
  );
}
