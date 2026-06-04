"use client";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";
import { ReferralMetric } from "@/components/dashboard/referrals/referral-ui";

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
  showMetrics?: boolean;
};

export function ReferralSectionShell({ title, description, children, showMetrics = false }: Props) {
  const {
    programmeUid,
    setProgrammeUid,
    programmeOptions,
    programmesLoading,
    tenantId,
    dashboard,
  } = useReferralProgramme();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="w-full sm:w-72 space-y-1.5 shrink-0">
          <Label htmlFor="referral-programme-select" className="text-xs">
            Loyalty programme
          </Label>
          <NativeSelect
            id="referral-programme-select"
            ariaLabel="Referral loyalty programme"
            value={programmeUid}
            onChange={setProgrammeUid}
            options={
              programmeOptions.length > 0
                ? programmeOptions
                : [{ value: "default", label: "Default programme (default)" }]
            }
            disabled={programmesLoading || !tenantId}
          />
        </div>
      </div>

      {showMetrics && dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReferralMetric label="Total referrals" value={dashboard.totalReferrals} />
          <ReferralMetric label="Signed up" value={dashboard.signedUp} />
          <ReferralMetric label="Rewarded" value={dashboard.rewarded} />
          <ReferralMetric
            label="Conversion"
            value={`${(dashboard.conversionRatePercent ?? 0).toFixed(1)}%`}
          />
          <ReferralMetric label="Fraud flagged" value={dashboard.fraudFlagged} />
          <ReferralMetric label="Points issued" value={Number(dashboard.totalPointsIssued)} />
          <ReferralMetric
            label="Avg points / referral"
            value={Number(dashboard.averagePointsPerReferral ?? 0).toFixed(0)}
          />
        </div>
      )}

      {children}
    </div>
  );
}
