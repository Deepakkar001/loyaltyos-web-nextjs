"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralSectionShell } from "@/components/dashboard/referrals/ReferralSectionShell";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralFraudReviewPanel() {
  const {
    fraudQueue,
    reviewingUid,
    runFraudAction,
    refreshFraudQueue,
    programmeUid,
  } = useReferralProgramme();

  useEffect(() => {
    void refreshFraudQueue();
  }, [refreshFraudQueue, programmeUid]);

  return (
    <ReferralSectionShell
      title="Fraud review"
      description="Referrals flagged at link time. Approve or override to issue signup rewards; reject to close."
    >
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshFraudQueue()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh queue
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Referrer</th>
                <th className="px-3 py-2">Referee</th>
                <th className="px-3 py-2">Reasons</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fraudQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No items in fraud queue
                  </td>
                </tr>
              )}
              {fraudQueue.map((item) => (
                <tr key={item.referralUid} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{item.referrerCustomerId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.refereeCustomerId}</td>
                  <td className="px-3 py-2 text-xs">{(item.fraudReasons ?? []).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={reviewingUid === item.referralUid}
                        onClick={() => void runFraudAction("approve", item.referralUid)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={reviewingUid === item.referralUid}
                        onClick={() => void runFraudAction("override", item.referralUid)}
                      >
                        Override
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={reviewingUid === item.referralUid}
                        onClick={() => void runFraudAction("reject", item.referralUid)}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ReferralSectionShell>
  );
}
