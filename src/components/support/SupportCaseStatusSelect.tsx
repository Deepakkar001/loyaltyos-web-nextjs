"use client";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { SupportCaseStatus } from "@/lib/api/support";
import { STATUS_LABELS } from "@/lib/support/support-content";
import { cn } from "@/lib/utils";

const ALL_STATUSES: SupportCaseStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

type Props = {
  id: string;
  currentStatus: SupportCaseStatus;
  selectedStatus: SupportCaseStatus;
  allowedNext: SupportCaseStatus[];
  disabled?: boolean;
  saving?: boolean;
  theme?: "tenant" | "admin";
  onChange: (status: SupportCaseStatus) => void;
};

export function SupportCaseStatusSelect({
  id,
  currentStatus,
  selectedStatus,
  allowedNext,
  disabled,
  saving,
  theme = "tenant",
  onChange,
}: Props) {
  const isAdmin = theme === "admin";
  const nextOptions = allowedNext.filter((s) => s !== currentStatus);
  const options = [
    { value: currentStatus, label: `${STATUS_LABELS[currentStatus]} (current)` },
    ...nextOptions.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
  ];

  if (nextOptions.length === 0) {
    return (
      <p
        className={cn(
          "text-sm",
          isAdmin ? "text-slate-400" : "text-muted-foreground"
        )}
      >
        Status:{" "}
        <span className={cn("font-medium", isAdmin ? "text-slate-100" : "text-foreground")}>
          {STATUS_LABELS[currentStatus]}
        </span>
        {" — no further changes available."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className={cn("text-xs font-medium", isAdmin ? "text-slate-300" : undefined)}
      >
        Update status
      </Label>
      <NativeSelect
        id={id}
        ariaLabel="Support case status"
        value={selectedStatus}
        onChange={(v) => onChange(v as SupportCaseStatus)}
        options={options}
        disabled={disabled || saving}
        variant={isAdmin ? "admin-dark" : "default"}
      />
      <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-muted-foreground")}>
        Choose a new status, then save.
      </p>
    </div>
  );
}

export const ADMIN_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
];
