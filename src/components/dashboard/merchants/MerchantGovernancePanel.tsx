"use client";

import toast from "react-hot-toast";

import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { merchantApi } from "@/lib/api/merchant";
import type {
  MerchantPendingConfigApproval,
  MerchantPendingFinanceAgreement,
} from "@/types/merchant";
import { useCallback, useEffect, useState } from "react";

export function MerchantGovernancePanel({ onAction }: { onAction?: () => void }) {
  const [finance, setFinance] = useState<MerchantPendingFinanceAgreement[]>([]);
  const [config, setConfig] = useState<MerchantPendingConfigApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([
        merchantApi.listPendingFinanceAgreements().catch(() => []),
        merchantApi.listPendingConfigApprovals().catch(() => []),
      ]);
      setFinance(f);
      setConfig(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading governance queue…</p>;
  }

  if (finance.length === 0 && config.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/70 bg-[var(--surface-card)] overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base">Governance approvals</CardTitle>
        <CardDescription>Finance agreement and configuration maker-checker queue</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {finance.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Pending finance agreements</p>
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {finance.map((item) => (
                <li
                  key={item.agreementUid}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.merchantLegalName}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.merchantUid} · {item.agreementUid}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Revenue {item.revenueSharePct}% · Earn {item.proposedEarnRateMultiplier ?? "—"}× ·{" "}
                      {item.settlementCycle}
                    </p>
                  </div>
                  <Authorize permission="merchants.approve">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        try {
                          await merchantApi.approveFinanceAgreement(
                            item.merchantUid,
                            item.agreementUid
                          );
                          toast.success("Agreement approved");
                          await load();
                          onAction?.();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Approve failed");
                        }
                      }}
                    >
                      Approve finance
                    </Button>
                  </Authorize>
                </li>
              ))}
            </ul>
          </div>
        )}

        {config.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Pending configuration changes</p>
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {config.map((item) => (
                <li
                  key={item.requestUid}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm bg-background"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.merchantLegalName}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.merchantUid} · {item.requestUid}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested by {item.requestedBy} ·{" "}
                      {new Date(item.requestedAt).toLocaleString()}
                    </p>
                    <pre className="text-[10px] text-muted-foreground mt-1 max-h-16 overflow-auto whitespace-pre-wrap">
                      {item.payloadJson}
                    </pre>
                  </div>
                  <Authorize permission="merchants.approve">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        try {
                          await merchantApi.approveConfigRequest(item.merchantUid, item.requestUid);
                          toast.success("Configuration approved");
                          await load();
                          onAction?.();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Approve failed");
                        }
                      }}
                    >
                      Approve config
                    </Button>
                  </Authorize>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
