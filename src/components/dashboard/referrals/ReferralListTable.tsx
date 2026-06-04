"use client";

import { Badge } from "@/components/ui/badge";
import type { ReferralListItem } from "@/lib/api/client";
import { referralStatusLabel } from "@/lib/referrals/referral-status";
import { cn } from "@/lib/utils";

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "REWARDED":
      return "default";
    case "FRAUD_FLAGGED":
    case "REJECTED":
      return "destructive";
    case "SIGNED_UP":
      return "secondary";
    default:
      return "outline";
  }
}

export function ReferralListTable({
  referrals,
  loading,
  programmeLabel,
  emptyMessage,
}: {
  referrals: ReferralListItem[];
  loading: boolean;
  programmeLabel: string;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2 py-4" aria-busy="true" aria-label="Loading referrals">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">
          Referral relationships for {programmeLabel}
        </caption>
        <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Referrer</th>
            <th className="px-3 py-2.5 font-medium">Referee</th>
            <th className="px-3 py-2.5 font-medium">Code used</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium text-right">Purchases</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {referrals.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                {emptyMessage ?? "No referral relationships for this programme yet."}
              </td>
            </tr>
          )}
          {referrals.map((r) => (
            <tr
              key={r.referralUid}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2.5 font-mono text-xs">{r.referrerCustomerId}</td>
              <td className="px-3 py-2.5 font-mono text-xs">{r.refereeCustomerId}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                {r.referralCodeUsed?.trim() || "—"}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={statusBadgeVariant(r.status)} className="font-normal">
                  {referralStatusLabel(r.status)}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.purchaseCount}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReferralListCount({
  count,
  filtered,
  className,
}: {
  count: number;
  filtered: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <span className="font-medium text-foreground tabular-nums">{count}</span>
      {count === 1 ? " referral" : " referrals"}
      {filtered ? " matching filter" : " in this programme"}
    </p>
  );
}
