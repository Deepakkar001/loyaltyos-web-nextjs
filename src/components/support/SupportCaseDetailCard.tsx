"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupportCaseStatusSelect } from "@/components/support/SupportCaseStatusSelect";
import type { SupportCase, SupportCaseStatus } from "@/lib/api/support";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/support/support-content";
import { cn } from "@/lib/utils";

type Props = {
  caseItem: SupportCase;
  theme?: "tenant" | "admin";
  onStatusUpdated: (updated: SupportCase) => void;
  onUpdateStatus: (caseUid: string, status: SupportCaseStatus) => Promise<SupportCase>;
};

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "RESOLVED":
    case "CLOSED":
      return "secondary";
    case "IN_PROGRESS":
      return "default";
    default:
      return "outline";
  }
}

function adminStatusBadgeClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "IN_PROGRESS":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "RESOLVED":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "CLOSED":
      return "border-slate-500/50 bg-slate-700/50 text-slate-300";
    default:
      return "border-slate-600 bg-slate-800 text-slate-200";
  }
}

export function SupportCaseDetailCard({
  caseItem,
  theme = "tenant",
  onStatusUpdated,
  onUpdateStatus,
}: Props) {
  const isAdmin = theme === "admin";
  const [draftStatus, setDraftStatus] = useState<SupportCaseStatus>(caseItem.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftStatus(caseItem.status);
  }, [caseItem.caseUid, caseItem.status]);

  const allowed = caseItem.allowedNextStatuses ?? [];
  const dirty = draftStatus !== caseItem.status;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const updated = await onUpdateStatus(caseItem.caseUid, draftStatus);
      onStatusUpdated(updated);
      setDraftStatus(updated.status);
      toast.success("Status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
      setDraftStatus(caseItem.status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-5 text-sm", isAdmin && "min-h-0")}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                adminStatusBadgeClass(caseItem.status)
              )}
            >
              {STATUS_LABELS[caseItem.status]}
            </span>
          ) : (
            <Badge variant={statusVariant(caseItem.status)}>
              {STATUS_LABELS[caseItem.status]}
            </Badge>
          )}
          {caseItem.priority === "URGENT" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
          <span
            className={cn(
              "text-xs font-mono",
              isAdmin ? "text-slate-500" : "text-muted-foreground"
            )}
          >
            {caseItem.caseUid}
          </span>
        </div>

        {caseItem.companyName && (
          <p className={cn("text-xs", isAdmin ? "text-slate-400" : "text-muted-foreground")}>
            Tenant:{" "}
            <span className={cn("font-medium", isAdmin ? "text-slate-100" : "text-foreground")}>
              {caseItem.companyName}
            </span>
            {caseItem.subscriptionTier && ` · ${caseItem.subscriptionTier}`}
            <span className="font-mono ml-1 text-slate-500">({caseItem.tenantId})</span>
          </p>
        )}

        <div>
          <h2 className={cn("text-lg font-semibold leading-snug", isAdmin && "text-white")}>
            {caseItem.subject}
          </h2>
          <p className={cn("mt-1.5 text-xs", isAdmin ? "text-slate-400" : "text-muted-foreground")}>
            {CATEGORY_LABELS[caseItem.category] ?? caseItem.category}
            {caseItem.createdByEmail && ` · ${caseItem.createdByEmail}`}
            {caseItem.createdAt && ` · ${new Date(caseItem.createdAt).toLocaleString()}`}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto",
          isAdmin
            ? "border-slate-700 bg-slate-950/80 text-slate-200"
            : "border-border bg-muted/20"
        )}
      >
        {caseItem.description}
      </div>

      {(caseItem.correlationId || caseItem.programmeUid) && (
        <dl
          className={cn(
            "grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-2",
            isAdmin ? "border-slate-800 bg-slate-900/60 text-slate-400" : "text-muted-foreground"
          )}
        >
          {caseItem.correlationId && (
            <div>
              <dt className="font-medium uppercase tracking-wide text-[10px] opacity-80">
                Request ID
              </dt>
              <dd className={cn("mt-0.5 font-mono", isAdmin ? "text-slate-100" : "text-foreground")}>
                {caseItem.correlationId}
              </dd>
            </div>
          )}
          {caseItem.programmeUid && (
            <div>
              <dt className="font-medium uppercase tracking-wide text-[10px] opacity-80">
                Programme
              </dt>
              <dd className={cn("mt-0.5 font-mono", isAdmin ? "text-slate-100" : "text-foreground")}>
                {caseItem.programmeUid}
              </dd>
            </div>
          )}
        </dl>
      )}

      {caseItem.statusUpdatedAt && (
        <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-muted-foreground")}>
          Last status change: {new Date(caseItem.statusUpdatedAt).toLocaleString()}
          {caseItem.statusUpdatedBy && ` · ${caseItem.statusUpdatedBy}`}
        </p>
      )}

      <div
        className={cn(
          "space-y-4 rounded-lg border p-4",
          isAdmin ? "border-slate-700 bg-slate-900/50" : "border-border bg-muted/10"
        )}
      >
        <SupportCaseStatusSelect
          id={`status-${caseItem.caseUid}`}
          currentStatus={caseItem.status}
          selectedStatus={draftStatus}
          allowedNext={allowed}
          saving={saving}
          theme={theme}
          onChange={setDraftStatus}
        />

        {allowed.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => void save()}
              className={cn(
                "rounded-lg",
                isAdmin &&
                  "bg-amber-600 text-white hover:bg-amber-500 border border-amber-500/50 disabled:opacity-50"
              )}
            >
              {saving ? "Saving…" : "Save status"}
            </Button>
            {isAdmin && (
              <Link
                href={`/admin/tenants/${encodeURIComponent(caseItem.tenantId)}`}
                className="text-sm text-amber-400 hover:text-amber-300 hover:underline"
              >
                View tenant →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
