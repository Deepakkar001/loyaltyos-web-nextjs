"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildReferralCreateValidationContext,
  validateReferralCreateStep,
} from "@/lib/referrals/referral-create-steps";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreateReviewStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const {
    programmeUid,
    name,
    maxReferrals,
    monthlyCap,
    rollingCap,
    rollingWindowDays,
    pointsBudget,
    config,
    enabledRuleKeys,
    programmeMilestoneTypes,
    saving,
    saveProgramme,
  } = useReferralProgramme();

  const rules = (config.milestoneRules ?? []).filter((r) => r.enabled !== false);
  const stages = config.stages ?? [];

  const onSave = async () => {
    const err = validateReferralCreateStep(
      4,
      buildReferralCreateValidationContext({
        name,
        maxReferrals,
        monthlyCap,
        rollingCap,
        rollingWindowDays,
        pointsBudget,
        config,
        enabledRuleKeys,
      })
    );
    if (err) {
      toast.error(err);
      return;
    }
    await saveProgramme();
    router.push(`/dashboard/referrals/my-referrals?programme=${encodeURIComponent(programmeUid)}`);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your configuration before saving. Integration events should use{" "}
        <code className="rounded bg-muted px-1 text-xs">evaluationScope: &quot;REFERRAL&quot;</code>{" "}
        so rewards do not stack with campaigns or programme rules unless intended.
      </p>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Loyalty programme</dt>
          <dd className="mt-1 font-mono text-sm">{programmeUid}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Display name</dt>
          <dd className="mt-1 font-medium">{name || "—"}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Lifetime cap / referrer</dt>
          <dd className="mt-1">{maxReferrals}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Monthly cap</dt>
          <dd className="mt-1">{monthlyCap === "" ? "None" : monthlyCap}</dd>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Rolling cap</dt>
          <dd className="mt-1">
            {rollingCap === "" ? "None" : `${rollingCap} / ${rollingWindowDays} days`}
          </dd>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Points budget</dt>
          <dd className="mt-1">
            {pointsBudget?.maxPoints
              ? `${pointsBudget.maxPoints} (${pointsBudget.period})`
              : "None"}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold">Milestone rules ({rules.length})</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {rules.map((r) => (
            <li key={r.key}>
              <span className="font-medium text-foreground">{r.label}</span> ({r.key}) — {r.trigger}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Reward stages ({stages.length})</h3>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Referrer pts</th>
                <th className="px-3 py-2">Referee pts</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => {
                const label =
                  programmeMilestoneTypes.find((t) => t.value === s.type)?.label ?? s.type;
                const referrerPts = s.referrerReward?.points ?? s.referrerPoints ?? 0;
                const refereePts = s.refereeReward?.points ?? s.refereePoints ?? 0;
                return (
                  <tr key={`${s.stage}-${s.type}`} className="border-b last:border-0">
                    <td className="px-3 py-2">{s.stage}</td>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2">{referrerPts}</td>
                    <td className="px-3 py-2">{refereePts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p>
          <span className="font-medium">Eligibility:</span>{" "}
          {config.eligibility?.refereeMustBeNewCustomer !== false
            ? "Referee must be new"
            : "Any referee"}
          {" · "}
          {config.eligibility?.referrerMustHaveLedgerActivity
            ? "Referrer needs activity"
            : "Any referrer"}
        </p>
        <p className="mt-2">
          <span className="font-medium">Fraud:</span> max{" "}
          {config.fraudPolicy?.maxReferralsPer24Hours ?? 20} referrals / 24h
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/dashboard/referrals/create/policies${querySuffix}`}
          className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
        >
          ← Back
        </Link>
        <Button
          type="button"
          className="rounded-full min-w-[180px] bg-brand-600 hover:bg-brand-700"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save referral programme"}
        </Button>
      </div>
    </div>
  );
}
