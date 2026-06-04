"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReferralCheck } from "@/components/dashboard/referrals/referral-ui";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreatePoliciesStep() {
  const { config, setConfig, updateFraud } = useReferralProgramme();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold">Eligibility</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Controls who can participate as referrer or referee.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={config.eligibility?.refereeMustBeNewCustomer !== false}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  eligibility: {
                    ...c.eligibility,
                    refereeMustBeNewCustomer: e.target.checked,
                  },
                }))
              }
            />
            <span>Referee must be new (no prior loyalty ledger activity)</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={config.eligibility?.referrerMustHaveLedgerActivity === true}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  eligibility: {
                    ...c.eligibility,
                    referrerMustHaveLedgerActivity: e.target.checked,
                  },
                }))
              }
            />
            <span>Referrer must already have loyalty activity</span>
          </label>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-sm font-semibold">Fraud policy</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Velocity and identity checks applied at link time.
        </p>
        <div className="mt-4 max-w-xs space-y-2">
          <Label className="text-xs">Max referrals per 24h (velocity)</Label>
          <Input
            type="number"
            min={1}
            value={config.fraudPolicy?.maxReferralsPer24Hours ?? 20}
            onChange={(e) => updateFraud({ maxReferralsPer24Hours: Number(e.target.value) || 20 })}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap">
          <ReferralCheck
            label="Block same customer ID"
            checked={config.fraudPolicy?.blockSelfReferralByCustomerId !== false}
            onChange={(v) => updateFraud({ blockSelfReferralByCustomerId: v })}
          />
          <ReferralCheck
            label="Match phone when provided"
            checked={config.fraudPolicy?.matchPhoneWhenProvided !== false}
            onChange={(v) => updateFraud({ matchPhoneWhenProvided: v })}
          />
          <ReferralCheck
            label="Match email when provided"
            checked={config.fraudPolicy?.matchEmailWhenProvided !== false}
            onChange={(v) => updateFraud({ matchEmailWhenProvided: v })}
          />
          <ReferralCheck
            label="Match device when provided"
            checked={config.fraudPolicy?.matchDeviceWhenProvided !== false}
            onChange={(v) => updateFraud({ matchDeviceWhenProvided: v })}
          />
        </div>
      </div>
    </div>
  );
}
