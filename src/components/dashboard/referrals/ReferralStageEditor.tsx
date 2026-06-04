"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ReferralMilestoneTypeInfo,
  ReferralPartyRewardConfig,
  ReferralStageConfig,
} from "@/lib/api/client";

type Props = {
  stages: ReferralStageConfig[];
  milestoneTypes: ReferralMilestoneTypeInfo[];
  /** Keys of enabled milestone rules (stage.type references rule.key). */
  enabledRuleKeys: string[];
  onChange: (stages: ReferralStageConfig[]) => void;
};

function partyReward(stage: ReferralStageConfig, party: "referrer" | "referee"): ReferralPartyRewardConfig {
  const legacy =
    party === "referrer"
      ? { type: "POINTS" as const, points: stage.referrerPoints ?? 0 }
      : { type: "POINTS" as const, points: stage.refereePoints ?? 0 };
  const cfg = party === "referrer" ? stage.referrerReward : stage.refereeReward;
  return cfg ?? legacy;
}

export function ReferralStageEditor({
  stages,
  milestoneTypes,
  enabledRuleKeys,
  onChange,
}: Props) {
  const allowed = milestoneTypes.filter((t) => enabledRuleKeys.includes(t.value));
  const defaultType = allowed[0]?.value ?? "";
  const update = (index: number, patch: Partial<ReferralStageConfig>) => {
    const next = stages.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const updatePartyReward = (
    index: number,
    party: "referrer" | "referee",
    patch: Partial<ReferralPartyRewardConfig>
  ) => {
    const stage = stages[index];
    const current = partyReward(stage, party);
    const merged = { ...current, ...patch };
    if (party === "referrer") {
      update(index, {
        referrerReward: merged,
        referrerPoints: merged.type === "POINTS" ? merged.points ?? 0 : 0,
      });
    } else {
      update(index, {
        refereeReward: merged,
        refereePoints: merged.type === "POINTS" ? merged.points ?? 0 : 0,
      });
    }
  };

  const addStage = () => {
    if (allowed.length === 0) {
      return;
    }
    const nextStage = stages.length > 0 ? Math.max(...stages.map((s) => s.stage)) + 1 : 1;
    onChange([
      ...stages,
      {
        stage: nextStage,
        type: defaultType,
        referrerPoints: 0,
        refereePoints: 0,
        referrerReward: { type: "POINTS", points: 0 },
        refereeReward: { type: "POINTS", points: 0 },
      },
    ]);
  };

  const removeStage = (index: number) => {
    onChange(stages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Reward stages</h3>
          <p className="text-xs text-muted-foreground">
            Points or voucher rewards per party. Per-stage referrer award caps limit how many times a referrer
            earns this stage across referees.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStage}
          disabled={allowed.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add stage
        </Button>
      </div>

      {allowed.length === 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Enable at least one milestone rule above before adding reward stages.
        </p>
      )}

      {stages.length === 0 && allowed.length > 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No stages yet. Add at least one stage to enable rewards.
        </p>
      )}

      {stages.map((stage, index) => (
        <div key={`${stage.stage}-${index}`} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Stage {stage.stage}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeStage(index)}
              disabled={stages.length <= 1}
              aria-label="Remove stage"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Stage #</Label>
              <Input
                type="number"
                min={1}
                value={stage.stage}
                onChange={(e) => update(index, { stage: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Milestone type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={
                  allowed.some((t) => t.value === stage.type) ? stage.type : defaultType
                }
                onChange={(e) => update(index, { type: e.target.value })}
              >
                {allowed.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                    {t.trigger ? ` · ${t.trigger}` : ""}
                  </option>
                ))}
              </select>
              {allowed.find((t) => t.value === stage.type)?.description && (
                <p className="text-xs text-muted-foreground">
                  {allowed.find((t) => t.value === stage.type)?.description}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max referrer awards (optional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Unlimited"
                value={stage.maxReferrerAwardsForStage ?? ""}
                onChange={(e) =>
                  update(index, {
                    maxReferrerAwardsForStage:
                      e.target.value === "" ? undefined : Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          <PartyRewardBlock
            label="Referrer reward"
            reward={partyReward(stage, "referrer")}
            onChange={(patch) => updatePartyReward(index, "referrer", patch)}
          />
          <PartyRewardBlock
            label="Referee reward"
            reward={partyReward(stage, "referee")}
            onChange={(patch) => updatePartyReward(index, "referee", patch)}
          />

          {allowed.find((t) => t.value === stage.type)?.trigger &&
            allowed.find((t) => t.value === stage.type)?.trigger !== "LINK" && (
            <p className="mt-2 text-xs text-muted-foreground">
              When this rule fires (purchase or integration event) is configured on the milestone rule
              above — not per stage.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function PartyRewardBlock({
  label,
  reward,
  onChange,
}: {
  label: string;
  reward: ReferralPartyRewardConfig;
  onChange: (patch: Partial<ReferralPartyRewardConfig>) => void;
}) {
  const type = reward.type ?? "POINTS";
  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Reward type</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(e) =>
              onChange({
                type: e.target.value as "POINTS" | "VOUCHER",
                points: e.target.value === "POINTS" ? reward.points ?? 0 : 0,
              })
            }
          >
            <option value="POINTS">Points</option>
            <option value="VOUCHER">Voucher (catalog)</option>
          </select>
        </div>
        {type === "POINTS" ? (
          <div className="space-y-1">
            <Label className="text-xs">Points</Label>
            <Input
              type="number"
              min={0}
              value={reward.points ?? 0}
              onChange={(e) => onChange({ points: Number(e.target.value) || 0 })}
            />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Catalog reward UID</Label>
              <Input
                value={reward.catalogRewardUid ?? ""}
                onChange={(e) => onChange({ catalogRewardUid: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Face value (optional)</Label>
              <Input
                type="number"
                min={0}
                value={reward.voucherFaceValue ?? ""}
                onChange={(e) =>
                  onChange({
                    voucherFaceValue: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points to fund redeem (optional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Award then redeem"
                value={reward.voucherPointsToRedeem ?? ""}
                onChange={(e) =>
                  onChange({
                    voucherPointsToRedeem: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
