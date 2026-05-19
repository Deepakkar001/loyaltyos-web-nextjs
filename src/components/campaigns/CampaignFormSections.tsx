"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { ChipInput } from "@/components/campaigns/ChipInput";
import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import {
  CAMPAIGN_APPROVAL_BUDGET_THRESHOLD,
  CAMPAIGN_FIELD_PLACEHOLDERS as P,
} from "@/lib/campaigns/campaign-form";
import {
  formatTriggerEventTypes,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 space-y-5 border-border/70 bg-[var(--surface-card)]">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function BudgetApprovalBanner({ budgetTotal }: { budgetTotal: string }) {
  const amount = Number(budgetTotal);
  if (!Number.isFinite(amount) || amount <= CAMPAIGN_APPROVAL_BUDGET_THRESHOLD) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <p>
        Total budget exceeds the approval threshold (
        {CAMPAIGN_APPROVAL_BUDGET_THRESHOLD.toLocaleString()}). This campaign may require additional
        approval before activation.
      </p>
    </div>
  );
}

export function CampaignBasicInfoSection() {
  const { form, patch } = useCampaignForm();

  return (
    <SectionCard title="Basic Info">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder={P.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-description">Description (optional)</Label>
        <Textarea
          id="campaign-description"
          value={form.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder={P.description}
          rows={3}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valid-from">Valid from</Label>
          <Input
            id="valid-from"
            type="datetime-local"
            value={form.validFromLocal}
            onChange={(e) => patch({ validFromLocal: e.target.value })}
            placeholder={P.validFrom}
            required
          />
          <p className="text-xs text-muted-foreground">{P.validFromHint}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="valid-until">Valid until</Label>
          <Input
            id="valid-until"
            type="datetime-local"
            value={form.validUntilLocal}
            min={form.validFromLocal || undefined}
            onChange={(e) => patch({ validUntilLocal: e.target.value })}
            placeholder={P.validUntil}
            required
          />
          <p className="text-xs text-muted-foreground">{P.validUntilHint}</p>
        </div>
      </div>

      <ChipInput
        label="Event types"
        placeholder={P.eventType}
        values={parseTriggerEventTypes(form.triggerEventType)}
        onChange={(values) => patch({ triggerEventType: formatTriggerEventTypes(values) })}
        normalize={(s) => s.trim().toUpperCase()}
      />
      <p className="text-xs text-muted-foreground">
        Add every event type this campaign should respond to (e.g. PURCHASE, ORDER_PLACED).
      </p>
    </SectionCard>
  );
}

export function CampaignBudgetSection() {
  const { form, patch } = useCampaignForm();

  return (
    <SectionCard title="Budget">
      <BudgetApprovalBanner budgetTotal={form.budgetTotal} />
      <div className="space-y-2">
        <Label htmlFor="budget-total">Total budget</Label>
        <Input
          id="budget-total"
          type="number"
          min={1}
          value={form.budgetTotal}
          onChange={(e) => patch({ budgetTotal: e.target.value })}
          placeholder={P.budgetTotal}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="alert-threshold">Alert threshold %</Label>
        <Input
          id="alert-threshold"
          type="number"
          min={1}
          max={100}
          value={form.alertThresholdPct}
          onChange={(e) => patch({ alertThresholdPct: e.target.value })}
          placeholder={P.alertThresholdPct}
        />
      </div>
    </SectionCard>
  );
}
