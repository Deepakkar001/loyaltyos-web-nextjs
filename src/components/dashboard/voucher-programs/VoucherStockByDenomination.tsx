"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { ApiError, ensureAuthSession, voucherApi } from "@/lib/api/client";
import type { VoucherStockBreakdownResponse } from "@/types/voucher";

type Props = {
  programmeUid: string;
  catalogRewardUid: string;
  refreshKey?: number;
};

export function VoucherStockByDenomination({ programmeUid, catalogRewardUid, refreshKey }: Props) {
  const [data, setData] = useState<VoucherStockBreakdownResponse | null>(null);

  const load = useCallback(async () => {
    if (!catalogRewardUid) return;
    try {
      await ensureAuthSession();
      const res = await voucherApi.getStockBreakdown(catalogRewardUid, programmeUid);
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) setData(null);
    }
  }, [catalogRewardUid, programmeUid]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (!data?.stockByFaceValue || Object.keys(data.stockByFaceValue).length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
      <div>
        <p className="text-sm font-semibold">Stock by denomination</p>
        <p className="text-xs text-muted-foreground mt-1">
          Total available: <strong className="text-foreground">{data.totalAvailable}</strong>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(data.stockByFaceValue).map(([face, count]) => (
          <div
            key={face}
            className="rounded-xl border border-border/70 bg-[var(--surface-sunken)] p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">₹{face}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{count}</p>
            <p className="text-[11px] text-muted-foreground mt-1">available</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
