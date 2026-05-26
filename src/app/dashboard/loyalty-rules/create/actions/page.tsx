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
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { useRewardCatalog } from "@/lib/rules/use-reward-catalog";

const schema = z
  .object({
    actionMode: z.enum(["AWARD_POINTS", "ISSUE_CATALOG_REWARD"]),
    formula: z.string().max(512).optional(),
    catalogRewardUid: z.string().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actionMode === "AWARD_POINTS") {
      if (!data.formula?.trim()) {
        ctx.addIssue({ code: "custom", message: "Formula is required", path: ["formula"] });
      }
    } else if (!data.catalogRewardUid?.trim()) {
      ctx.addIssue({ code: "custom", message: "Select a catalog reward", path: ["catalogRewardUid"] });
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
    defaultValues: { actionMode: "AWARD_POINTS", formula: "event.amount * 0.01", catalogRewardUid: "" },
  });

  const actionMode = form.watch("actionMode");

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
      const cfg = first.config as { catalogRewardUid?: string };
      if (cfg.catalogRewardUid) {
        form.reset({
          actionMode: "ISSUE_CATALOG_REWARD",
          catalogRewardUid: cfg.catalogRewardUid,
          formula: "",
        });
        return;
      }
    }
    if (first.formula) {
      form.reset({ actionMode: "AWARD_POINTS", formula: first.formula, catalogRewardUid: "" });
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
              config: { catalogRewardUid: data.catalogRewardUid?.trim(), issueMode: "ON_RULE_MATCH" },
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
          )}

          <RuleWizardStepNav backSlug="conditions" nextLabel="Next: Scheduling →" onNext={onNext} />
        </div>
      </Card>
    </CreateRuleShell>
  );
}
