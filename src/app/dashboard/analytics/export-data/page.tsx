"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { analyticsApi } from "@/lib/api/client";
import { lastNDaysRange } from "@/lib/analytics/date-range";

export default function ExportDataPage() {
  const { programmeUid } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <ExportCard
        title="Liability Movement"
        description="Finance CSV: monthly opening → issued → redeemed → expired → closing plus programme roll-ups."
        helpText="BRD §4.17 monthly liability movement for the selected programme and date range, including tenant programme roll-up rows — ready for finance spreadsheets."
        busy={busy === "liability"}
        onDownload={() =>
          download("liability", () =>
            analyticsApi.downloadExport(
              "liability-movement",
              { from, to, programmeUid },
              `liability-movement-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Failed Accruals & Redemptions"
        description="Operational CSV of failed issuance, event processing, and redemption API errors."
        helpText="BRD §6.3 failure log for the selected programme and date range — source, customer, error category, latency, and timestamps for ops review."
        busy={busy === "failures"}
        onDownload={() =>
          download("failures", () =>
            analyticsApi.downloadExport(
              "failed-accruals-redemptions",
              { from, to, programmeUid },
              `failed-accruals-redemptions-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Reversals & Adjustments"
        description="Operational CSV of REVERSAL and ADJUST ledger rows with original credit links."
        helpText="BRD §6.3 audit export: signed impact, reversal_of_ledger_id, original credit metadata, operator, and timestamps."
        busy={busy === "reversals"}
        onDownload={() =>
          download("reversals", () =>
            analyticsApi.downloadExport(
              "reversals-adjustments",
              { from, to, programmeUid },
              `reversals-adjustments-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Accrual & Reconciliation"
        description="CSV of reconciliation summary, movements, daily trend, and balance variances."
        helpText="Finance reconciliation export for the selected programme and date range — waterfall KPIs plus movement breakdown."
        busy={busy === "reconciliation"}
        onDownload={() =>
          download("reconciliation", () =>
            analyticsApi.downloadExport(
              "accrual-redemption-reconciliation",
              { from, to, programmeUid },
              `accrual-redemption-reconciliation-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Breakage & Expiry"
        description="CSV of period breakage, monthly trend, tier breakdown, and upcoming expiry."
        helpText="BRD §4.7.4 breakage export for finance review and forward liability planning."
        busy={busy === "breakage"}
        onDownload={() =>
          download("breakage", () =>
            analyticsApi.downloadExport(
              "breakage-expiry",
              { from, to, programmeUid },
              `breakage-expiry-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Enrollment"
        description="CSV of enrollment KPIs, daily/monthly trends, sources, and top rules."
        helpText="Member acquisition export for the selected programme and date range."
        busy={busy === "enrollment"}
        onDownload={() =>
          download("enrollment", () =>
            analyticsApi.downloadExport(
              "enrollment",
              { from, to, programmeUid },
              `enrollment-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Custom Reports Bundle"
        description="CSV of points activity, rule performance, and tier distribution."
        helpText="Combined export from Custom Reports — same data as the on-screen charts."
        busy={busy === "custom"}
        onDownload={() =>
          download("custom", () =>
            analyticsApi.downloadExport(
              "custom-reports",
              { from, to, programmeUid },
              `custom-reports-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Segment Analysis"
        description="CSV of engagement segments and balance brackets."
        helpText="Snapshot export — no date range; reflects current programme member segments."
        busy={busy === "segments"}
        onDownload={() =>
          download("segments", () =>
            analyticsApi.downloadExport("segment-analysis", { programmeUid }, `segment-analysis-${programmeUid}.csv`)
          )
        }
      />

      <ExportCard
        title="Cohort Retention"
        description="CSV of monthly retention cohort grid."
        helpText="Retention heatmap data for spreadsheet analysis."
        busy={busy === "cohort-retention"}
        onDownload={() =>
          download("cohort-retention", () =>
            analyticsApi.downloadExport("cohort-retention", { programmeUid }, `cohort-retention-${programmeUid}.csv`)
          )
        }
      />

      <ExportCard
        title="SLA & Performance"
        description="CSV of component SLA metrics, API endpoint breakdown, and daily trends."
        helpText="BRD §6.3 loyalty-engine SLA export: success rates, latency percentiles, SLA targets, and status per component."
        busy={busy === "sla"}
        onDownload={() =>
          download("sla", () =>
            analyticsApi.downloadExport(
              "sla-performance",
              { from, to, programmeUid },
              `sla-performance-${programmeUid}-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Points Ledger"
        description="Streaming CSV of all ledger rows in the selected date range."
        helpText="Downloads raw points_ledger rows for the selected programme and date range — entry type, points, customer, timestamps — for offline analysis or finance reconciliation."
        busy={busy === "ledger"}
        onDownload={() =>
          download("ledger", () =>
            analyticsApi.downloadExport(
              "points-ledger",
              { from, to, programmeUid },
              `points-ledger-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>

      <ExportCard
        title="Rule Configuration"
        description="JSON bundle of earn rules for backup or migration."
        helpText="Exports earn rules and related configuration for the selected programme as JSON — useful for backups, cloning programmes, or reviewing rule definitions outside the UI."
        busy={busy === "rules"}
        onDownload={() => download("rules", () => analyticsApi.downloadRuleConfig(programmeUid))}
      />

      <ExportCard
        title="Webhook Delivery Log"
        description="CSV of webhook attempts, status, and errors."
        helpText="Downloads webhook delivery attempts in the date range — payload status, response codes, and errors — to debug integrations and delivery failures."
        busy={busy === "webhook"}
        onDownload={() =>
          download("webhook", () =>
            analyticsApi.downloadExport(
              "webhook-log",
              { from, to },
              `webhook-log-${from}-to-${to}.csv`
            )
          )
        }
      >
        <DateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ExportCard>
    </div>
  );
}

function ExportCard({
  title,
  description,
  helpText,
  children,
  busy,
  onDownload,
}: {
  title: string;
  description: string;
  helpText: string;
  children?: React.ReactNode;
  busy: boolean;
  onDownload: () => void;
}) {
  return (
    <AnalyticsPanel className="flex flex-col">
      <AnalyticsSectionHeading title={title} helpText={helpText} titleClassName="text-base font-semibold" />
      <p className="text-xs text-muted-foreground -mt-2 flex-1">{description}</p>
      {children}
      <Button className="mt-4 w-full" onClick={onDownload} disabled={busy}>
        <Download className="h-4 w-4 mr-2" />
        {busy ? "Preparing…" : "Download"}
      </Button>
    </AnalyticsPanel>
  );
}

function DateRange({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
      </div>
    </div>
  );
}
