"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferralPointsBudget } from "@/lib/api/client";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreateBasicsStep() {
  const {
    name,
    setName,
    maxReferrals,
    setMaxReferrals,
    monthlyCap,
    setMonthlyCap,
    rollingCap,
    setRollingCap,
    rollingWindowDays,
    setRollingWindowDays,
    pointsBudget,
    setPointsBudget,
  } = useReferralProgramme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold">Programme details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Name and per-referrer limits for the selected loyalty programme.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referral-name">Display name</Label>
            <Input
              id="referral-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer referral programme"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral-max">Lifetime max referrals / referrer</Label>
            <Input
              id="referral-max"
              type="number"
              min={1}
              value={maxReferrals}
              onChange={(e) => setMaxReferrals(Number(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">Cap type: LIFETIME_REFERRALS</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-sm font-semibold">Referral volume caps</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional monthly and rolling-day limits per referrer.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referral-monthly">Monthly cap (optional)</Label>
            <Input
              id="referral-monthly"
              type="number"
              min={0}
              placeholder="No monthly limit"
              value={monthlyCap}
              onChange={(e) => setMonthlyCap(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral-rolling">Rolling-day max (optional)</Label>
            <Input
              id="referral-rolling"
              type="number"
              min={0}
              placeholder="No rolling limit"
              value={rollingCap}
              onChange={(e) => setRollingCap(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="referral-window">Rolling window (days)</Label>
            <Input
              id="referral-window"
              type="number"
              min={1}
              disabled={rollingCap === "" || Number(rollingCap) <= 0}
              value={rollingWindowDays}
              onChange={(e) =>
                setRollingWindowDays(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-sm font-semibold">Programme points budget</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional cap on total referral points issued per period.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Max points</Label>
            <Input
              type="number"
              min={0}
              placeholder="No budget cap"
              value={pointsBudget?.maxPoints ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setPointsBudget(null);
                } else {
                  setPointsBudget({
                    ...pointsBudget,
                    maxPoints: Number(v),
                    period: pointsBudget?.period ?? "LIFETIME",
                  });
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Period</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={pointsBudget?.period ?? "LIFETIME"}
              onChange={(e) =>
                setPointsBudget({
                  maxPoints: pointsBudget?.maxPoints ?? 0,
                  period: e.target.value as ReferralPointsBudget["period"],
                  windowDays: pointsBudget?.windowDays,
                })
              }
              disabled={!pointsBudget?.maxPoints}
            >
              <option value="LIFETIME">Lifetime</option>
              <option value="CALENDAR_MONTH">Calendar month</option>
              <option value="ROLLING_DAY">Rolling days</option>
            </select>
          </div>
          {pointsBudget?.period === "ROLLING_DAY" && (
            <div className="space-y-2">
              <Label className="text-xs">Budget window (days)</Label>
              <Input
                type="number"
                min={1}
                value={pointsBudget.windowDays ?? 30}
                onChange={(e) =>
                  setPointsBudget({
                    ...pointsBudget,
                    windowDays: Number(e.target.value) || 30,
                  })
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
