"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { cn } from "@/lib/utils";

const schema = z.object({
  programmeUid: z.string().default("default"),
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

  const name = form.watch("name");
  const nameCount = useMemo(() => (name ?? "").length, [name]);

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
  }, [tenantId, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    // Only write the fields this step owns. conditionTree, actions, and
    // scheduling are preserved by saveRuleDraftFields' merge semantics so
    // revisiting Basic Info never clobbers progress in later steps.
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
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">Basic Information</p>
            <p className="text-sm text-muted-foreground mt-1">
              Give your rule a clear, memorable name. You can refine conditions and actions in the next steps.
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
                <Label htmlFor="priority" className="text-xs text-muted-foreground">
                  Rule Priority *
                </Label>
                <FieldHelp text="When multiple rules match the same event, higher priority is evaluated first. Use higher numbers for ‘must win’ rules; lower for optional bonuses." />
              </div>
              <Input id="priority" type="number" min={0} max={100} {...form.register("priority")} />
              <p className="text-xs text-muted-foreground">Higher priority evaluates first.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="triggerEventType" className="text-xs text-muted-foreground">
                  Trigger Event Type *
                </Label>
                <FieldHelp text="The event name that triggers this rule (must match what your integration sends). Example: PURCHASE, ORDER_PAID, CHECKIN." />
              </div>
              <Input id="triggerEventType" placeholder="e.g. PURCHASE" {...form.register("triggerEventType")} />
              {form.formState.errors.triggerEventType && (
                <p className="text-xs text-red-600">{form.formState.errors.triggerEventType.message}</p>
              )}
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

