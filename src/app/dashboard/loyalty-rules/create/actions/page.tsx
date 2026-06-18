"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "../_components/rule-create-flow";
import { RuleWizardStepNav, useRequireRuleDraft } from "../_components/RuleWizardStepNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldHelp } from "@/components/ui/field-help";
import { NativeSelect } from "@/components/ui/native-select";
import { PillToggle } from "@/components/ui/pill-toggle";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { useRewardCatalog } from "@/lib/rules/use-reward-catalog";

const schema = z
  .object({
    actionMode: z.enum(["AWARD_POINTS", "ISSUE_CATALOG_REWARD"]),
    formula: z.string().max(512).optional(),
    catalogRewardUid: z.string().max(64).optional(),
    autoIssue: z.boolean().optional(),
    selectionMode: z.enum(["BY_POINTS", "BY_FACE_VALUE"]).optional(),
    pointsToRedeem: z.number().positive().optional(),
    faceValue: z.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actionMode === "AWARD_POINTS") {
      if (!data.formula?.trim()) {
        ctx.addIssue({ code: "custom", message: "Formula is required", path: ["formula"] });
      }
    } else {
      if (!data.catalogRewardUid?.trim()) {
        ctx.addIssue({ code: "custom", message: "Select a catalog reward", path: ["catalogRewardUid"] });
      }
      if (data.autoIssue) {
        if (!data.selectionMode) {
          ctx.addIssue({ code: "custom", message: "Select how to choose denomination", path: ["selectionMode"] });
        } else if (data.selectionMode === "BY_POINTS" && !data.pointsToRedeem) {
          ctx.addIssue({ code: "custom", message: "pointsToRedeem is required", path: ["pointsToRedeem"] });
        } else if (data.selectionMode === "BY_FACE_VALUE" && !data.faceValue) {
          ctx.addIssue({ code: "custom", message: "faceValue is required", path: ["faceValue"] });
        }
      }
    }
  });

type FormData = z.infer<typeof schema>;

export default function CreateRuleActionsPage() {
  const router = useRouter();
  const { basePath } = useRuleCreateFlow();
  const { tenantId, draftScope, redirectIfMissing } = useRequireRuleDraft();
  const draft = loadRuleDraft(tenantId ?? "", draftScope);
  const programmeUid = draft?.programmeUid ?? "default";
  const { loading: catalogLoading, activeItems, error: catalogError } = useRewardCatalog(programmeUid);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      actionMode: "AWARD_POINTS",
      formula: "event.amount * 0.01",
      catalogRewardUid: "",
      autoIssue: false,
      selectionMode: "BY_POINTS",
      pointsToRedeem: 100,
      faceValue: 100,
    },
  });

  const actionMode = form.watch("actionMode");
  const autoIssue = Boolean(form.watch("autoIssue"));
  const selectionMode = form.watch("selectionMode") ?? "BY_POINTS";

  const catalogOptions = useMemo(
    () => activeItems.map((i) => ({ value: i.rewardUid, label: `${i.name} (${i.pointsCost} pts)` })),
    [activeItems]
  );

  useEffect(() => {
    if (!tenantId) return;
    const existing = loadRuleDraft(tenantId, draftScope);
    if (!existing) return;
    const first = existing.actions?.[0];
    if (!first) return;
    if (first.actionType === "ISSUE_VOUCHER" && first.config && typeof first.config === "object") {
      const cfg = first.config as {
        catalogRewardUid?: string;
        issueMode?: string;
        selectionMode?: "BY_POINTS" | "BY_FACE_VALUE";
        pointsToRedeem?: number;
        faceValue?: number;
      };
      if (cfg.catalogRewardUid) {
        form.reset({
          actionMode: "ISSUE_CATALOG_REWARD",
          catalogRewardUid: cfg.catalogRewardUid,
          autoIssue: cfg.issueMode === "AUTO_ISSUE_ON_EVENT",
          selectionMode: cfg.selectionMode ?? "BY_POINTS",
          pointsToRedeem: cfg.pointsToRedeem ?? 100,
          faceValue: cfg.faceValue ?? 100,
          formula: "",
        });
        return;
      }
    }
    if (first.formula) {
      form.reset({
        actionMode: "AWARD_POINTS",
        formula: first.formula,
        catalogRewardUid: "",
        autoIssue: false,
        selectionMode: "BY_POINTS",
        pointsToRedeem: 100,
        faceValue: 100,
      });
    }
  }, [tenantId, draftScope, form]);

  const onNext = form.handleSubmit((data) => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!redirectIfMissing()) return;

    if (data.actionMode === "ISSUE_CATALOG_REWARD") {
      saveRuleDraftFields(
        tenantId,
        {
          actions: [
            {
              actionType: "ISSUE_VOUCHER",
              formula: "0",
              config: {
                catalogRewardUid: data.catalogRewardUid?.trim(),
                issueMode: data.autoIssue ? "AUTO_ISSUE_ON_EVENT" : "ON_RULE_MATCH",
                selectionMode: data.autoIssue ? data.selectionMode : undefined,
                pointsToRedeem: data.autoIssue && data.selectionMode === "BY_POINTS" ? data.pointsToRedeem : undefined,
                faceValue: data.autoIssue && data.selectionMode === "BY_FACE_VALUE" ? data.faceValue : undefined,
              },
            },
          ],
        },
        draftScope
      );
    } else {
      saveRuleDraftFields(
        tenantId,
        { actions: [{ actionType: "AWARD_POINTS", formula: data.formula!.trim() }] },
        draftScope
      );
    }
    router.push(stepHref(basePath, "scheduling"));
  });

  return (
    <CreateRuleShell title="Actions">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold">What Happens When Conditions Match</p>
            <p className="text-sm text-muted-foreground mt-1">
              Award points with a formula, or issue a reward from your{" "}
              <Link href="/dashboard/setup/rewards-catalog" className="underline text-foreground">
                rewards catalog
              </Link>{" "}
              (stored as voucher grant metadata; points debit happens on member redemption).
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Action type</Label>
            <NativeSelect
              ariaLabel="Action type"
              value={actionMode}
              onChange={(v) => form.setValue("actionMode", v as FormData["actionMode"])}
              options={[
                { value: "AWARD_POINTS", label: "Award points (formula)" },
                { value: "ISSUE_CATALOG_REWARD", label: "Grant catalog reward (voucher / benefit)" },
              ]}
            />
          </div>

          {actionMode === "AWARD_POINTS" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="formula" className="text-xs text-muted-foreground">
                  Points formula *
                </Label>
                <FieldHelp text="Example: event.amount * 0.01 awards 1% of spend as points." />
              </div>
              <Input id="formula" placeholder="e.g. event.amount * 0.01" {...form.register("formula")} />
              {form.formState.errors.formula && (
                <p className="text-xs text-red-600">{form.formState.errors.formula.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Catalog reward *</Label>
              {catalogLoading ? (
                <p className="text-xs text-muted-foreground">Loading catalog…</p>
              ) : catalogError ? (
                <p className="text-xs text-red-600">{catalogError}</p>
              ) : catalogOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No ACTIVE rewards in catalog.{" "}
                  <Link href="/dashboard/setup/rewards-catalog" className="underline">
                    Configure catalog
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <NativeSelect
                  ariaLabel="Catalog reward"
                  value={form.watch("catalogRewardUid") ?? ""}
                  onChange={(v) => form.setValue("catalogRewardUid", v)}
                  options={[{ value: "", label: "Select reward…" }, ...catalogOptions]}
                />
              )}
              {form.formState.errors.catalogRewardUid && (
                <p className="text-xs text-red-600">{form.formState.errors.catalogRewardUid.message}</p>
              )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Auto-issue immediately</p>
                  <p className="text-xs text-muted-foreground">
                    When enabled, a voucher code is issued during event processing (no extra API call). Points awarding still works even if voucher issuance fails.
                  </p>
                </div>
                <PillToggle
                  pressed={autoIssue}
                  onPressedChange={(next) => form.setValue("autoIssue", Boolean(next))}
                  srLabel={autoIssue ? "Disable auto-issue voucher" : "Enable auto-issue voucher"}
                />
              </div>

              {autoIssue ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Select denomination by *</Label>
                    <NativeSelect
                      ariaLabel="Denomination selection mode"
                      value={selectionMode}
                      onChange={(v) => form.setValue("selectionMode", v as FormData["selectionMode"])}
                      options={[
                        { value: "BY_POINTS", label: "Points to redeem (tier match)" },
                        { value: "BY_FACE_VALUE", label: "Voucher face value (₹)" },
                      ]}
                    />
                    {form.formState.errors.selectionMode && (
                      <p className="text-xs text-red-600">{form.formState.errors.selectionMode.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {selectionMode === "BY_POINTS" ? "pointsToRedeem *" : "faceValue *"}
                    </Label>
                    {selectionMode === "BY_POINTS" ? (
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        {...form.register("pointsToRedeem", { valueAsNumber: true })}
                      />
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        {...form.register("faceValue", { valueAsNumber: true })}
                      />
                    )}
                    {selectionMode === "BY_POINTS" && form.formState.errors.pointsToRedeem ? (
                      <p className="text-xs text-red-600">{form.formState.errors.pointsToRedeem.message}</p>
                    ) : null}
                    {selectionMode === "BY_FACE_VALUE" && form.formState.errors.faceValue ? (
                      <p className="text-xs text-red-600">{form.formState.errors.faceValue.message}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Must match a configured voucher denomination tier exactly (no best-match selection).
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <RuleWizardStepNav backSlug="conditions" nextLabel="Next: Scheduling →" onNext={onNext} />
        </div>
      </Card>
    </CreateRuleShell>
  );
}
