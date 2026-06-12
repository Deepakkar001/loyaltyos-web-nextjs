"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadAnalyticsCsv, downloadApiCsv } from "@/lib/analytics/export-csv";

type AnalyticsExportButtonProps = {
  exportPath: string;
  params: Record<string, string>;
  filename: string;
  disabled?: boolean;
  label?: string;
  variant?: "default" | "outline";
};

type ApiExportButtonProps = {
  apiUrl: string;
  params: Record<string, string>;
  filename: string;
  disabled?: boolean;
  label?: string;
  variant?: "default" | "outline";
};

function useExportAction(
  action: () => Promise<void>,
  disabled?: boolean
) {
  const [exporting, setExporting] = useState(false);

  const run = async () => {
    if (disabled || exporting) return;
    setExporting(true);
    try {
      await action();
    } finally {
      setExporting(false);
    }
  };

  return { exporting, run };
}

export function AnalyticsExportButton({
  exportPath,
  params,
  filename,
  disabled,
  label = "Export CSV",
  variant = "outline",
}: AnalyticsExportButtonProps) {
  const { exporting, run } = useExportAction(
    () => downloadAnalyticsCsv(exportPath, params, filename),
    disabled
  );

  return (
    <Button variant={variant} onClick={() => void run()} disabled={disabled || exporting}>
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting…" : label}
    </Button>
  );
}

export function ApiExportButton({
  apiUrl,
  params,
  filename,
  disabled,
  label = "Export CSV",
  variant = "outline",
}: ApiExportButtonProps) {
  const { exporting, run } = useExportAction(
    () => downloadApiCsv(apiUrl, params, filename),
    disabled
  );

  return (
    <Button variant={variant} onClick={() => void run()} disabled={disabled || exporting}>
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting…" : label}
    </Button>
  );
}
