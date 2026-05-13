"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loyaltyRulesAdminApi } from "@/lib/api/client";
import type { RuleChangeLogResponse } from "@/types/rules";

export default function RuleChangeHistoryPage() {
  const params = useParams<{ ruleUid: string }>();
  const search = useSearchParams();
  const programmeUid = search.get("programmeUid") || "default";
  const ruleUid = params.ruleUid;

  const [items, setItems] = useState<RuleChangeLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await loyaltyRulesAdminApi.getChangeHistory(ruleUid, programmeUid);
        if (!alive) return;
        setItems(res);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load change history");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ruleUid, programmeUid]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Change History</h1>
          <p className="text-sm text-muted-foreground mt-1">All edits and status changes to this rule.</p>
        </div>
        <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(ruleUid)}/details?programmeUid=${encodeURIComponent(programmeUid)}`}>
          <Button variant="outline" className="rounded-full">Back to Details</Button>
        </Link>
      </div>

      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        {loading ? (
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No change log entries yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{it.changeType}</p>
                  <p className="text-xs text-muted-foreground">{new Date(it.changedAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">By: {it.changedBy}</p>
                <details className="mt-3">
                  <summary className="text-sm font-medium cursor-pointer">View snapshots</summary>
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Before</p>
                      <pre className="mt-1 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
                        {it.beforeState ?? ""}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">After</p>
                      <pre className="mt-1 text-xs overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
                        {it.afterState ?? ""}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

