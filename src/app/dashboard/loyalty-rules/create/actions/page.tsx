"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldHelp } from "@/components/ui/field-help";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";

const schema = z.object({
  formula: z.string().min(1, "Formula is required").max(512, "Formula is too long"),
});

type FormData = z.infer<typeof schema>;

export default function CreateRuleActionsPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { formula: "event.amount * 0.01" },
  });

  useEffect(() => {
    if (!tenantId) return;
    const existing = loadRuleDraft(tenantId);
    if (!existing) return;
    const first = existing.actions?.[0];
    if (first?.formula) {
      form.reset({ formula: first.formula });
    }
  }, [tenantId, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    const existing = loadRuleDraft(tenantId);
    if (!existing || !existing.name) {
      toast.error("Rule draft not found. Start from Basic Info.");
      router.push("/dashboard/loyalty-rules/create/basic-info");
      return;
    }
    saveRuleDraftFields(tenantId, {
      actions: [
        {
          actionType: "AWARD_POINTS",
          formula: data.formula,
        },
      ],
    });
    router.push("/dashboard/loyalty-rules/create/scheduling");
  });

  return (
    <CreateRuleShell title="Actions">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">What Happens When Conditions Match</p>
            <p className="text-sm text-muted-foreground mt-1">
              MVP supports awarding points via a formula. (Badges/vouchers/webhooks can be added next.)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="formula" className="text-xs text-muted-foreground">
                Points Formula *
              </Label>
              <FieldHelp text="This formula calculates how many points to award when the rule matches. Example: `event.amount * 0.01` gives 1% of spend as points. Use only fields your event schema sends." />
            </div>
            <Input id="formula" placeholder="e.g. event.amount * 0.01" {...form.register("formula")} />
            {form.formState.errors.formula && (
              <p className="text-xs text-red-600">{form.formState.errors.formula.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Tip: Use `event.amount`, `event.channel`, `customer.tierUid` and other schema fields.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/dashboard/loyalty-rules/create/conditions")}
            >
              ← Back
            </Button>
            <Button type="button" className="rounded-full" onClick={onNext}>
              Next: Scheduling →
            </Button>
          </div>
        </div>
      </Card>
    </CreateRuleShell>
  );
}

