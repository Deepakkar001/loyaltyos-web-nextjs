"use client";

import { useMemo } from "react";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { CAMPAIGN_FIELD_PLACEHOLDERS as P } from "@/lib/campaigns/campaign-form";
import {
  CAMPAIGN_AWARD_TYPE_OPTIONS,
  validateOfferFormState,
} from "@/lib/campaigns/campaign-offer-helpers";
import type { CampaignAwardType } from "@/types/campaigns";
import { Card } from "@/components/ui/card";
import { FieldHelp } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function CampaignOfferSection({ className }: { className?: string }) {
  const { form, patch } = useCampaignForm();
  const offerError = useMemo(() => validateOfferFormState(form), [form]);

  const onAwardTypeChange = (next: string) => {
    patch({ awardType: next as CampaignAwardType });
  };

  return (
    <Card className={cn("p-6 space-y-5 border-border/70 bg-[var(--surface-card)]", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Reward</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how much to give customers when they qualify. Each redemption deducts from your campaign
          budget.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="award-type">Reward type</Label>
        <NativeSelect
          id="award-type"
          name="awardType"
          ariaLabel="Reward type"
          value={form.awardType}
          onChange={onAwardTypeChange}
          options={CAMPAIGN_AWARD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>

      {form.awardType === "POINTS_BONUS" ? (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="bonus-points">Bonus points</Label>
              <FieldHelp text="Fixed points credited per qualifying event, in addition to base programme earning when stackable." />
            </div>
            <Input
              id="bonus-points"
              type="number"
              min={1}
              value={form.bonusPoints}
              onChange={(e) => patch({ bonusPoints: e.target.value })}
              placeholder={P.bonusPoints}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-expiry">Points expiry (days, optional)</Label>
            <Input
              id="offer-expiry"
              type="number"
              min={1}
              value={form.offerExpiryDays}
              onChange={(e) => patch({ offerExpiryDays: e.target.value })}
              placeholder="Leave blank for programme default"
            />
          </div>
        </>
      ) : null}

      {form.awardType === "MULTIPLIER_ON_RULE_POINTS" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="multiplier">Multiplier</Label>
            <FieldHelp text="Multiplies points earned from loyalty rules on the same event (e.g. 2× doubles rule points)." />
          </div>
          <Input
            id="multiplier"
            type="number"
            min={0.01}
            step={0.1}
            value={form.multiplierOnRulePoints}
            onChange={(e) => patch({ multiplierOnRulePoints: e.target.value })}
            placeholder={P.multiplier}
          />
        </div>
      ) : null}

      {form.awardType === "FLAT_CASHBACK" || form.awardType === "PERCENT_CASHBACK" ? (
        <div className="space-y-2">
          <Label htmlFor="cashback-value">
            {form.awardType === "PERCENT_CASHBACK" ? "Cashback percent" : "Cashback amount"}
          </Label>
          <Input
            id="cashback-value"
            type="number"
            min={0.01}
            max={form.awardType === "PERCENT_CASHBACK" ? 100 : undefined}
            step={form.awardType === "PERCENT_CASHBACK" ? 0.1 : 1}
            value={form.cashbackValue}
            onChange={(e) => patch({ cashbackValue: e.target.value })}
            placeholder={P.cashbackValue}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Stack with loyalty rules</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When enabled, customers still earn base programme points on the same event.
          </p>
        </div>
        <Switch
          checked={form.stackableWithRules}
          onCheckedChange={(checked) => patch({ stackableWithRules: checked })}
          aria-label="Stack with loyalty rules"
        />
      </div>

      {offerError ? <p className="text-xs text-amber-600 dark:text-amber-400">{offerError}</p> : null}
    </Card>
  );
}
