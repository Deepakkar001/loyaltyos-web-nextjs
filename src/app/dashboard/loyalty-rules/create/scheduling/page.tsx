"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "../_components/rule-create-flow";
import { RuleWizardStepNav, useRequireRuleDraft } from "../_components/RuleWizardStepNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldHelp } from "@/components/ui/field-help";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";

const schema = z.object({
  effectiveAt: z.string().optional(),
  noEndDate: z.boolean(),
  endAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateRuleSchedulingPage() {
  const router = useRouter();
  const { basePath } = useRuleCreateFlow();
  const { tenantId, draftScope, redirectIfMissing } = useRequireRuleDraft();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { effectiveAt: "", noEndDate: true, endAt: "" },
  });

  useEffect(() => {
    if (!tenantId) return;
    const existing = loadRuleDraft(tenantId, draftScope);
    if (!existing) return;
    form.reset({
      effectiveAt: existing.effectiveAt ? existing.effectiveAt.slice(0, 16) : "",
      noEndDate: !existing.endAt,
      endAt: existing.endAt ? existing.endAt.slice(0, 16) : "",
    });
  }, [tenantId, draftScope, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!redirectIfMissing()) return;

    const effectiveAtIso = data.effectiveAt ? new Date(data.effectiveAt).toISOString() : undefined;
    const endAtIso = data.noEndDate ? undefined : data.endAt ? new Date(data.endAt).toISOString() : undefined;
    saveRuleDraftFields(tenantId, { effectiveAt: effectiveAtIso, endAt: endAtIso }, draftScope);
    router.push(stepHref(basePath, "review-publish"));
  });

  const noEnd = form.watch("noEndDate");

  return (
    <CreateRuleShell title="Scheduling">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">When Should This Rule Be Active?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Set an optional activation window. If you leave this blank, the rule can be activated anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="effectiveAt" className="text-xs text-muted-foreground">
                  Effective date/time (optional)
                </Label>
                <FieldHelp text="If set, the rule won't match events before this time." />
              </div>
              <Input id="effectiveAt" type="datetime-local" {...form.register("effectiveAt")} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="noEndDate"
                  checked={noEnd}
                  onCheckedChange={(v) => form.setValue("noEndDate", Boolean(v))}
                />
                <Label htmlFor="noEndDate" className="text-sm">
                  No end date (runs forever)
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt" className="text-xs text-muted-foreground">
                  End date/time (optional)
                </Label>
                <Input id="endAt" type="datetime-local" disabled={noEnd} {...form.register("endAt")} />
              </div>
            </div>
          </div>

          <RuleWizardStepNav
            backSlug="actions"
            nextLabel="Next: Review & Publish →"
            onNext={onNext}
          />
        </div>
      </Card>
    </CreateRuleShell>
  );
}
