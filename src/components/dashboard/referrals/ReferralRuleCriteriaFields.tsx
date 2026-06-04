"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ReferralRuleCriteria } from "@/lib/api/client";
import type { ReferralCriteriaFieldDef } from "@/lib/referrals/referral-criteria-catalog";
import {
  getCriteriaFieldValue,
  setCriteriaFieldValue,
} from "@/lib/referrals/referral-criteria-values";

type Props = {
  fields: ReferralCriteriaFieldDef[];
  criteria: ReferralRuleCriteria | undefined;
  onCriteriaChange: (criteria: ReferralRuleCriteria) => void;
};

export function ReferralRuleCriteriaFields({ fields, criteria, onCriteriaChange }: Props) {
  if (fields.length === 0) {
    return null;
  }

  const purchaseEngine = fields.filter((f) => f.group === "purchase_engine");
  const eventFilters = fields.filter((f) => f.group === "event_filter");

  const renderField = (def: ReferralCriteriaFieldDef) => {
    const value = getCriteriaFieldValue(criteria, def.storageKey);

    if (def.type === "boolean") {
      return (
        <div key={def.storageKey} className="flex items-end pb-1 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) =>
                onCriteriaChange(
                  setCriteriaFieldValue(criteria, def.storageKey, e.target.checked)
                )
              }
            />
            {def.label}
          </label>
        </div>
      );
    }

    if (def.enumOptions && def.enumOptions.length > 0) {
      return (
        <div key={def.storageKey} className="space-y-1">
          <Label className="text-xs">{def.label}</Label>
          <NativeSelect
            ariaLabel={def.label}
            value={value != null ? String(value) : ""}
            onChange={(v) =>
              onCriteriaChange(
                setCriteriaFieldValue(criteria, def.storageKey, v || undefined)
              )
            }
            options={[
              { value: "", label: "Any" },
              ...def.enumOptions.map((o) => ({ value: o.value, label: o.label })),
            ]}
          />
        </div>
      );
    }

    return (
      <div key={def.storageKey} className="space-y-1">
        <Label className="text-xs">{def.label}</Label>
        <Input
          type={def.type === "number" ? "number" : "text"}
          min={def.type === "number" ? 0 : undefined}
          placeholder={def.hint ?? "Leave empty to ignore"}
          value={value != null && value !== false ? String(value) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            const next =
              def.type === "number"
                ? raw === ""
                  ? undefined
                  : Number(raw)
                : raw || undefined;
            onCriteriaChange(setCriteriaFieldValue(criteria, def.storageKey, next));
          }}
        />
      </div>
    );
  };

  return (
    <div className="border-t bg-muted/10 px-4 py-4 space-y-4">
      {purchaseEngine.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Purchase milestones (counts and spend across qualifying purchases)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {purchaseEngine.map(renderField)}
          </div>
        </div>
      )}
      {eventFilters.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Event filters (optional — must match incoming event payload)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventFilters.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
