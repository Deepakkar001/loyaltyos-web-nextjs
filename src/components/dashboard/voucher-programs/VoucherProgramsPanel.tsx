"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { VoucherDenominationEditor } from "@/components/dashboard/voucher-programs/VoucherDenominationEditor";
import { VoucherStockByDenomination } from "@/components/dashboard/voucher-programs/VoucherStockByDenomination";
import { VoucherInventoryPanel } from "@/components/dashboard/reward-catalog/VoucherInventoryPanel";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, ensureAuthSession, programmeApiV2, voucherApi } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import {
  rewardCatalogDraftFromConfigRoot,
  type RewardCatalogItemDraft,
} from "@/lib/programme/reward-catalog-merge";
import { cn } from "@/lib/utils";
import type { VoucherBatchListItem } from "@/types/voucher";

export function VoucherProgramsPanel() {
  const [programmeUid, setProgrammeUid] = useState("default");
  const [programmeRows, setProgrammeRows] = useState([{ programmeUid: "default", name: "Default programme" }]);
  const [catalogRewardUid, setCatalogRewardUid] = useState("");
  const [voucherItems, setVoucherItems] = useState<RewardCatalogItemDraft[]>([]);
  const [savedActiveVoucherUids, setSavedActiveVoucherUids] = useState<Set<string>>(new Set());
  const [stockRefresh, setStockRefresh] = useState(0);
  const [batchHistory, setBatchHistory] = useState<VoucherBatchListItem[]>([]);

  const loadProgrammes = useCallback(async () => {
    try {
      await ensureAuthSession();
      const list = await programmeApiV2.listProgrammes();
      setProgrammeRows(mergeProgrammeDropdownRows(list));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      await ensureAuthSession();
      const [mergedRes, batches] = await Promise.all([
        programmeApiV2.getMergedRewardCatalog(programmeUid),
        voucherApi.listBatches({ programmeUid }),
      ]);
      const draft = rewardCatalogDraftFromConfigRoot({ rewardCatalog: mergedRes.rewardCatalog });
      const vouchers = draft.items.filter((i) => i.rewardType.toUpperCase() === "VOUCHER");
      setVoucherItems(vouchers);
      setBatchHistory(batches);
      const saved = new Set(
        vouchers.filter((i) => i.status === "ACTIVE").map((i) => i.rewardUid)
      );
      setSavedActiveVoucherUids(saved);
      if (!vouchers.some((v) => v.rewardUid === catalogRewardUid)) {
        setCatalogRewardUid(vouchers[0]?.rewardUid ?? "");
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, [programmeUid, catalogRewardUid]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selected = useMemo(
    () => voucherItems.find((v) => v.rewardUid === catalogRewardUid),
    [voucherItems, catalogRewardUid]
  );

  const programmeOptions = useMemo(
    () =>
      programmeRows.map((p) => ({
        value: p.programmeUid,
        label: `${p.name} (${p.programmeUid})`,
      })),
    [programmeRows]
  );

  const voucherCatalogOptions = useMemo(() => {
    if (voucherItems.length === 0) {
      return [{ value: "", label: "No VOUCHER items — create in Rewards Catalog" }];
    }
    return voucherItems.map((v) => ({
      value: v.rewardUid,
      label: `${v.name} (${v.rewardUid}) — ${v.status}`,
    }));
  }, [voucherItems]);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Voucher programs</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Configure multi-denomination partner inventory (e.g. Airtel ₹100–₹500 in one file), map loyalty points
          per tier, then upload codes. Integration issues vouchers by{" "}
          <code className="text-xs">pointsToRedeem</code> (exact tier match).
        </p>
        <Link
          href="/dashboard/setup/rewards-catalog"
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0 h-auto")}
        >
          ← Rewards catalog (create VOUCHER items)
        </Link>
      </div>

      <Card className="p-5 border-border/70 bg-[var(--surface-card)] grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Programme</Label>
          <NativeSelect
            ariaLabel="Programme"
            value={programmeUid}
            onChange={setProgrammeUid}
            options={programmeOptions}
          />
        </div>
        <div className="space-y-2">
          <Label>Voucher catalog item</Label>
          <NativeSelect
            ariaLabel="Voucher catalog item"
            value={catalogRewardUid}
            onChange={setCatalogRewardUid}
            options={voucherCatalogOptions}
            disabled={voucherItems.length === 0}
          />
        </div>
      </Card>

      {batchHistory.length > 0 ? (
        <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-3">
          <div>
            <p className="text-sm font-semibold">Voucher upload history (MySQL)</p>
            <p className="text-xs text-muted-foreground mt-1">
              {batchHistory.length} batch(es) for programme <code className="text-[11px]">{programmeUid}</code>
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--surface-sunken)] text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Catalog UID</th>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Imported</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {batchHistory.map((b) => (
                  <tr key={b.batchUid} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{b.batchUid.slice(0, 10)}…</td>
                    <td className="px-3 py-2 font-mono text-xs">{b.catalogRewardUid}</td>
                    <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={b.originalFilename}>
                      {b.originalFilename ?? "—"}
                    </td>
                    <td className="px-3 py-2">{b.status}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {b.importedCount}
                      {b.errorCount ? ` (${b.errorCount} err)` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {b.uploadedAt ? new Date(b.uploadedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {selected && catalogRewardUid ? (
        <>
          <VoucherDenominationEditor
            programmeUid={programmeUid}
            catalogRewardUid={catalogRewardUid}
            catalogName={selected.name}
            onSaved={() => setStockRefresh((k) => k + 1)}
          />
          <VoucherStockByDenomination
            programmeUid={programmeUid}
            catalogRewardUid={catalogRewardUid}
            refreshKey={stockRefresh}
          />
          <VoucherInventoryPanel
            programmeUid={programmeUid}
            voucherItems={voucherItems}
            savedActiveVoucherUids={savedActiveVoucherUids}
            onUploadComplete={() => setStockRefresh((k) => k + 1)}
          />
        </>
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">
          Add an ACTIVE <strong>VOUCHER</strong> item in{" "}
          <Link href="/dashboard/setup/rewards-catalog" className="underline text-foreground">
            Rewards Catalog
          </Link>{" "}
          and save, then return here.
        </Card>
      )}
    </div>
  );
}
