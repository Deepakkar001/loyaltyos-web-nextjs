"use client";

import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { AnalyticsProgrammeProvider, useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { analyticsOuterCard, analyticsPagePadding } from "@/lib/analytics/analytics-ui";

function AnalyticsLayoutInner({ children }: { children: React.ReactNode }) {
  const { programmes, programmeUid, programmeName, setProgrammeUid, programmesLoading } =
    useAnalyticsProgramme();

  const programmeOptions = programmes.map((p) => ({
    value: p.programmeUid,
    label: p.programmeUid === "default" ? p.name : p.name,
  }));

  return (
    <div className={analyticsPagePadding}>
      <Card className={analyticsOuterCard}>
        <StepHeader
          title="Analytics & Reports"
          description="Programme-wide insights, exports, and cohort views. Pick a programme and a date range that includes your ledger activity."
        />

        <div className="mb-6 max-w-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Programme
          </p>
          <NativeSelect
            id="analytics-programme"
            className="w-full"
            ariaLabel="Programme"
            value={programmeUid}
            disabled={programmesLoading || programmeOptions.length === 0}
            onChange={setProgrammeUid}
            options={programmeOptions}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Viewing <span className="font-medium text-foreground">{programmeName}</span>. Tier upgrade
            cohorts need tier history for the selected programme.
          </p>
        </div>

        <div className="space-y-6">{children}</div>
      </Card>
    </div>
  );
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProgrammeProvider>
      <AnalyticsLayoutInner>{children}</AnalyticsLayoutInner>
    </AnalyticsProgrammeProvider>
  );
}
