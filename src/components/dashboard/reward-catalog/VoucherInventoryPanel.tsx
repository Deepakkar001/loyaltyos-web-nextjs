"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, ensureAuthSession, voucherApi } from "@/lib/api/client";
import type { RewardCatalogItemDraft } from "@/lib/programme/reward-catalog-merge";
import type {
  VoucherBatchListItem,
  VoucherBatchUploadResponse,
  VoucherUploadSpecResponse,
} from "@/types/voucher";
import { cn } from "@/lib/utils";

type VoucherInventoryPanelProps = {
  programmeUid: string;
  voucherItems: RewardCatalogItemDraft[];
  /** ACTIVE voucher rewardUids persisted in programme config (saved catalog). */
  savedActiveVoucherUids: Set<string>;
  onUploadComplete?: () => void;
};

export function VoucherInventoryPanel({
  programmeUid,
  voucherItems,
  savedActiveVoucherUids,
  onUploadComplete,
}: VoucherInventoryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalogRewardUid, setCatalogRewardUid] = useState("");
  const [stock, setStock] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batches, setBatches] = useState<VoucherBatchListItem[]>([]);
  const [lastUpload, setLastUpload] = useState<VoucherBatchUploadResponse | null>(null);
  const [uploadSpec, setUploadSpec] = useState<VoucherUploadSpecResponse | null>(null);

  const selectableItems = useMemo(
    () => voucherItems.filter((i) => i.rewardType.toUpperCase() === "VOUCHER"),
    [voucherItems]
  );

  useEffect(() => {
    if (selectableItems.length === 0) {
      setCatalogRewardUid("");
      return;
    }
    if (!selectableItems.some((i) => i.rewardUid === catalogRewardUid)) {
      setCatalogRewardUid(selectableItems[0].rewardUid);
    }
  }, [selectableItems, catalogRewardUid]);

  const loadStock = useCallback(async () => {
    if (!catalogRewardUid) return;
    setLoadingStock(true);
    try {
      await ensureAuthSession();
      const res = await voucherApi.getStock(catalogRewardUid, programmeUid);
      setStock(res.available);
      setLowStock(res.lowStock);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoadingStock(false);
    }
  }, [catalogRewardUid, programmeUid]);

  const loadBatches = useCallback(async () => {
    try {
      await ensureAuthSession();
      const list = await voucherApi.listBatches({
        programmeUid,
        catalogRewardUid: catalogRewardUid || undefined,
      });
      setBatches(list);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, [programmeUid, catalogRewardUid]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    void (async () => {
      try {
        await ensureAuthSession();
        const spec = await voucherApi.getUploadSpec();
        setUploadSpec(spec);
      } catch (e) {
        if (e instanceof ApiError) toast.error(e.message);
      }
    })();
  }, []);

  const filteredBatches = useMemo(
    () =>
      catalogRewardUid
        ? batches.filter((b) => b.catalogRewardUid === catalogRewardUid).slice(0, 8)
        : [],
    [batches, catalogRewardUid]
  );

  const onUpload = async (file: File) => {
    if (!catalogRewardUid) {
      toast.error("Select a voucher catalog item first.");
      return;
    }
    setUploading(true);
    try {
      await ensureAuthSession();
      const res = await voucherApi.uploadBatch(programmeUid, catalogRewardUid, file);
      setLastUpload(res);
      toast.success(
        `Import complete: ${res.importedCount ?? 0} codes imported` +
          (res.errorCount ? `, ${res.errorCount} row errors` : "")
      );
      await Promise.all([loadStock(), loadBatches()]);
      onUploadComplete?.();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    if (!uploadSpec?.exampleCsv) return;
    const blob = new Blob([uploadSpec.exampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = uploadSpec.exampleFilename || "loyaltyos-voucher-codes-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectableItems.length === 0) {
    return (
      <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-2">
        <p className="text-sm font-semibold">Voucher code inventory</p>
        <p className="text-sm text-muted-foreground">
          Add a catalog item with reward type <strong>VOUCHER</strong>, save the catalog, then upload partner CSV codes
          here for integration issuance.
        </p>
      </Card>
    );
  }

  const selectedItem = selectableItems.find((i) => i.rewardUid === catalogRewardUid);
  const catalogSavedForUpload =
    Boolean(catalogRewardUid) && savedActiveVoucherUids.has(catalogRewardUid);
  const canUpload =
    selectedItem?.status === "ACTIVE" && catalogSavedForUpload && !uploading;

  return (
    <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Voucher code inventory</p>
          <p className="text-sm text-muted-foreground max-w-2xl">
            LoyaltyOS defines the CSV format below. Download the example file, replace the sample rows with your partner
            codes, then upload. Points cost is set in the catalog — not in the file.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!uploadSpec?.exampleCsv}
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download example CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={loadingStock}
            onClick={() => void loadStock()}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loadingStock && "animate-spin")} />
            Refresh stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Catalog item (VOUCHER)</Label>
          <NativeSelect
            ariaLabel="Voucher catalog item"
            value={catalogRewardUid}
            onChange={setCatalogRewardUid}
            options={selectableItems.map((item) => ({
              value: item.rewardUid,
              label: `${item.name} (${item.rewardUid}) — ${item.status}`,
            }))}
          />
          {selectedItem ? (
            <p className="text-xs text-muted-foreground">
              Points cost: {selectedItem.pointsCost} · Status must be ACTIVE for upload and issue.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Available codes</Label>
          <div className="flex items-center gap-2 h-10">
            {loadingStock ? (
              <span className="text-sm text-muted-foreground">Loading…</span>
            ) : (
              <>
                <span className="text-2xl font-semibold tabular-nums">{stock ?? "—"}</span>
                {lowStock && stock !== null && stock > 0 ? (
                  <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50">
                    Low stock
                  </Badge>
                ) : null}
                {stock === 0 ? (
                  <Badge variant="outline" className="text-red-800 border-red-300 bg-red-50">
                    Out of stock
                  </Badge>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {uploadSpec ? (
        <div className="rounded-xl border border-border bg-[var(--surface-sunken)] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Required file format (defined by LoyaltyOS)</p>
            <p className="text-xs text-muted-foreground mt-1">
              {uploadSpec.format} · {uploadSpec.encoding} · max {uploadSpec.maxFileSizeMb} MB · up to{" "}
              {uploadSpec.maxRows.toLocaleString()} rows per upload
            </p>
            {uploadSpec.standardHeaders?.length ? (
              <p className="text-xs mt-2 font-mono bg-background border border-border rounded-lg px-3 py-2 break-all">
                {uploadSpec.standardHeaders.join(",")}
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Column</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                {uploadSpec.columns.map((col) => (
                  <tr key={col.name} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{col.name}</td>
                    <td className="px-3 py-2">
                      {col.required ? (
                        <span className="text-foreground font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No (column required, value optional)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{col.dataType}</td>
                    <td className="px-3 py-2 text-xs max-w-xs">{col.description}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{col.example || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            {uploadSpec.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-foreground">Preview example file contents</summary>
            <pre className="mt-2 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px]">
              {uploadSpec.exampleCsv}
            </pre>
          </details>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Loading upload format…</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
        <Button
          type="button"
          className="rounded-full"
          disabled={!canUpload}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          {uploading ? "Uploading…" : "Upload CSV"}
        </Button>
        {selectedItem?.status !== "ACTIVE" ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Set this catalog item to ACTIVE and save the catalog before uploading codes.
          </p>
        ) : !catalogSavedForUpload ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Click <strong>Save catalog</strong> first so this voucher reward exists on the server, then upload CSV.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Upload a CSV that matches the format above (header row must match exactly).
          </p>
        )}
      </div>

      {lastUpload?.batchUid ? (
        <div className="rounded-xl border border-border bg-[var(--surface-sunken)] p-3 text-sm space-y-1">
          <p className="font-medium">Last upload — {lastUpload.batchUid}</p>
          <p className="text-muted-foreground text-xs">
            Status: {lastUpload.status} · Imported: {lastUpload.importedCount ?? 0} · Duplicates:{" "}
            {lastUpload.duplicateCount ?? 0} · Errors: {lastUpload.errorCount ?? 0}
          </p>
          {lastUpload.errorReport && lastUpload.errorReport.length > 0 ? (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer font-medium">Row errors ({lastUpload.errorReport.length})</summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-auto">
                {lastUpload.errorReport.slice(0, 20).map((err, i) => (
                  <li key={i} className="font-mono text-[11px]">
                    Row {err.row}: {err.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {filteredBatches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Recent batches for this item</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--surface-sunken)] text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Imported</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.batchUid} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{b.batchUid.slice(0, 8)}…</td>
                    <td className="px-3 py-2">{b.status}</td>
                    <td className="px-3 py-2 tabular-nums">{b.importedCount}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {b.uploadedAt ? new Date(b.uploadedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
