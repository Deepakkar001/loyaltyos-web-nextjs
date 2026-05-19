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
import { FieldHelp } from "@/components/ui/field-help";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";

const schema = z.object({
  formula: z.string().min(1, "Formula is required").max(512, "Formula is too long"),
});

type FormData = z.infer<typeof schema>;

export default function CreateRuleActionsPage() {
  const router = useRouter();
  const { basePath } = useRuleCreateFlow();
  const { tenantId, draftScope, redirectIfMissing } = useRequireRuleDraft();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { formula: "event.amount * 0.01" },
  });

  useEffect(() => {
    if (!tenantId) return;
    const existing = loadRuleDraft(tenantId, draftScope);
    if (!existing) return;
    const first = existing.actions?.[0];
    if (first?.formula) {
      form.reset({ formula: first.formula });
    }
  }, [tenantId, draftScope, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!redirectIfMissing()) return;
    saveRuleDraftFields(
      tenantId,
      { actions: [{ actionType: "AWARD_POINTS", formula: data.formula }] },
      draftScope
    );
    router.push(stepHref(basePath, "scheduling"));
  });

  return (
    <CreateRuleShell title="Actions">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">What Happens When Conditions Match</p>
            <p className="text-sm text-muted-foreground mt-1">
              MVP supports awarding points via a formula.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="formula" className="text-xs text-muted-foreground">
                Points Formula *
              </Label>
              <FieldHelp text="Example: event.amount * 0.01 awards 1% of spend as points." />
            </div>
            <Input id="formula" placeholder="e.g. event.amount * 0.01" {...form.register("formula")} />
            {form.formState.errors.formula && (
              <p className="text-xs text-red-600">{form.formState.errors.formula.message}</p>
            )}
          </div>

          <RuleWizardStepNav backSlug="conditions" nextLabel="Next: Scheduling →" onNext={onNext} />
        </div>
      </Card>
    </CreateRuleShell>
  );
}
