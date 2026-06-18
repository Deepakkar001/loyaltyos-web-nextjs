"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Download, GitBranchPlus, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  ReferralListCount,
  ReferralListTable,
} from "@/components/dashboard/referrals/ReferralListTable";
import { ReferralSectionShell } from "@/components/dashboard/referrals/ReferralSectionShell";
import { REFERRAL_STATUS_FILTER_OPTIONS } from "@/lib/referrals/referral-status";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralMyReferralsPanel() {
  const {
    referrals,
    referralsListLoading,
    programmeConfigured,
    statusFilter,
    setStatusFilter,
    loading,
    refreshReferralsList,
    refreshDashboard,
    exportCsv,
    programmeUid,
    name,
    programmeOptions,
    enabledRuleKeys,
    refreshAll,
  } = useReferralProgramme();

  const loyaltyProgrammeLabel = useMemo(() => {
    const opt = programmeOptions.find((o) => o.value === programmeUid);
    return opt?.label ?? programmeUid;
  }, [programmeOptions, programmeUid]);

  const createHref = `/dashboard/referrals/create/basics?programme=${encodeURIComponent(programmeUid)}`;

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard, programmeUid]);

  useEffect(() => {
    void refreshReferralsList();
  }, [refreshReferralsList, programmeUid, statusFilter]);

  const refresh = async () => {
    await refreshAll();
  };

  const listEmptyMessage = programmeConfigured
    ? "No referral relationships for this programme yet. Links appear here after customers refer friends."
    : "Set up a referral programme first, then referral links will appear in this list.";

  return (
    <ReferralSectionShell
      title="My referrals"
      description="Choose a loyalty programme to see its referral programme summary and every referrer–referee relationship under that programme."
      showMetrics
    >
      <section className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Referral programme</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Loyalty programme: <span className="text-foreground">{loyaltyProgrammeLabel}</span>
            </p>
          </div>
          {!programmeConfigured && (
            <Link
              href={createHref}
              className={cn(buttonVariants({ size: "sm" }), "rounded-full inline-flex items-center")}
            >
              <GitBranchPlus className="mr-1 h-4 w-4" />
              Set up programme
            </Link>
          )}
        </div>
        {programmeConfigured ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Programme name</dt>
              <dd className="font-medium">{name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Programme ID</dt>
              <dd className="font-mono text-xs">{programmeUid}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Active milestone rules</dt>
              <dd className="tabular-nums">{enabledRuleKeys.length}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No referral programme saved for this loyalty programme.{" "}
            <Link href={createHref} className="text-primary hover:underline">
              Create one
            </Link>{" "}
            to start tracking referrals.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Referrals under this programme</h2>
            <ReferralListCount
              count={referrals.length}
              filtered={!!statusFilter}
              className="mt-1"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[160px]">
              <Label htmlFor="referral-status-filter" className="text-xs">
                Filter by status
              </Label>
              <NativeSelect
                id="referral-status-filter"
                ariaLabel="Filter referrals by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={REFERRAL_STATUS_FILTER_OPTIONS}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void refresh()}
              disabled={loading || referralsListLoading}
            >
              <RefreshCw
                className={cn(
                  "mr-1 h-4 w-4",
                  (loading || referralsListLoading) && "animate-spin"
                )}
              />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void exportCsv()}
              disabled={referralsListLoading}
            >
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <ReferralListTable
          referrals={referrals}
          loading={referralsListLoading}
          programmeLabel={loyaltyProgrammeLabel}
          emptyMessage={listEmptyMessage}
        />
      </section>
    </ReferralSectionShell>
  );
}
