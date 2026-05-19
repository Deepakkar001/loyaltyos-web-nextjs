"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "@/app/dashboard/loyalty-rules/create/_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "@/app/dashboard/loyalty-rules/create/_components/rule-create-flow";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  priority: z.coerce.number().min(0).max(100),
  executionMode: z.enum(["FIRST_MATCH", "ALL_MATCHING"]),
});

type FormData = z.input<typeof schema>;

export default function CreateCampaignRuleBasicInfoPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { basePath } = useRuleCreateFlow();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", priority: 10, executionMode: "ALL_MATCHING" },
  });

  useEffect(() => {
    if (!tenantId) return;
    const draft = loadRuleDraft(tenantId, "campaign");
    if (!draft?.campaignUid) {
      router.replace(stepHref(basePath, "campaign"));
      return;
    }
    if (!draft.triggerEventType?.trim()) {
      router.replace(stepHref(basePath, "event"));
      return;
    }
    form.reset({
      name: draft.name ?? "",
      description: draft.description ?? "",
      priority: draft.priority ?? 10,
      executionMode: draft.executionMode ?? "ALL_MATCHING",
    });
  }, [tenantId, form, router, basePath]);

  const draft = tenantId ? loadRuleDraft(tenantId, "campaign") : null;

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!draft?.campaignUid) {
      toast.error("Select a campaign first.");
      router.push(stepHref(basePath, "campaign"));
      return;
    }
    if (!draft.triggerEventType) {
      toast.error("Select an event type first.");
      router.push(stepHref(basePath, "event"));
      return;
    }
    saveRuleDraftFields(
      tenantId,
      {
        ruleType: "CAMPAIGN",
        programmeUid: draft.programmeUid ?? "default",
        campaignUid: draft.campaignUid,
        campaignName: draft.campaignName,
        triggerEventType: draft.triggerEventType,
        name: data.name,
        description: data.description,
        priority: Number(data.priority),
        executionMode: data.executionMode,
        status: "DRAFT",
      },
      "campaign"
    );
    router.push(stepHref(basePath, "conditions"));
  });

  return (
    <CreateRuleShell title="Campaign rule">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-[var(--surface-sunken)] px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground mb-2">Step 3 — Configure the earn rule for:</p>
            <p>
              <span className="text-muted-foreground">Campaign:</span>{" "}
              <span className="font-medium">{draft?.campaignName ?? "—"}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Event:</span>{" "}
              <span className="font-mono font-medium">{draft?.triggerEventType ?? "—"}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule name</Label>
            <Input id="rule-name" placeholder="e.g. Double points on campaign purchases" {...form.register("name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule-description">Description (optional)</Label>
            <Textarea id="rule-description" rows={3} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input id="priority" type="number" min={0} max={100} {...form.register("priority")} />
          </div>

          <div className="space-y-2">
            <Label>Execution mode</Label>
            <RadioGroup
              value={form.watch("executionMode")}
              onValueChange={(v) => form.setValue("executionMode", v as FormData["executionMode"])}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ALL_MATCHING" id="all-matching" />
                <Label htmlFor="all-matching">All matching rules</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="FIRST_MATCH" id="first-match" />
                <Label htmlFor="first-match">First match only</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push(stepHref(basePath, "event"))}
            >
              ← Back to events
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
