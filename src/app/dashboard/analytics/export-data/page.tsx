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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
