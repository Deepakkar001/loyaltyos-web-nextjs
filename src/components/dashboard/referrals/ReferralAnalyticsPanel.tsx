"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralSectionShell } from "@/components/dashboard/referrals/ReferralSectionShell";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralAnalyticsPanel() {
  const {
    trends,
    topReferrers,
    timeToPurchase,
    trendGranularity,
    setTrendGranularity,
    loading,
    refreshAnalytics,
    refreshDashboard,
    programmeUid,
  } = useReferralProgramme();

  useEffect(() => {
    void refreshDashboard();
    void refreshAnalytics();
  }, [refreshAnalytics, refreshDashboard, programmeUid]);

  useEffect(() => {
    void refreshAnalytics();
  }, [trendGranularity, refreshAnalytics]);

  return (
    <ReferralSectionShell
      title="Referral analytics"
      description="Trends, top referrers, and time-to-first-purchase for the selected programme."
      showMetrics
    >
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={trendGranularity}
            onChange={(e) => setTrendGranularity(e.target.value as "DAILY" | "WEEKLY")}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void refreshAnalytics()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh charts
          </Button>
        </div>
        {timeToPurchase && (
          <p className="mt-3 text-sm text-muted-foreground">
            Avg time to first purchase:{" "}
            <span className="font-medium text-foreground">
              {timeToPurchase.averageHoursToFirstPurchase.toFixed(1)}h
            </span>{" "}
            ({timeToPurchase.sampleSize} referrals with purchases)
          </p>
        )}
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Referrals over time
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Referrals</th>
                    <th className="px-3 py-2">Rewarded</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        No trend data yet
                      </td>
                    </tr>
                  )}
                  {trends.map((t) => (
                    <tr key={t.periodStart} className="border-b last:border-0">
                      <td className="px-3 py-2">{t.periodStart}</td>
                      <td className="px-3 py-2">{t.referrals}</td>
                      <td className="px-3 py-2">{t.rewarded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Top referrers</h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Referrer</th>
                    <th className="px-3 py-2">Referrals</th>
                    <th className="px-3 py-2">Rewarded</th>
                  </tr>
                </thead>
                <tbody>
                  {topReferrers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        No referrers yet
                      </td>
                    </tr>
                  )}
                  {topReferrers.map((r) => (
                    <tr key={r.referrerCustomerId} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{r.referrerCustomerId}</td>
                      <td className="px-3 py-2">{r.referralCount}</td>
                      <td className="px-3 py-2">{r.rewardedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </ReferralSectionShell>
  );
}
