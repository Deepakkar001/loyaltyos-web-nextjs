"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, campaignsAdminApi, ensureAuthSession } from "@/lib/api/client";
import type {
  CampaignTargetCustomerResponse,
  CampaignTargetUploadResponse,
  CampaignTargetUploadSpecResponse,
} from "@/types/campaigns";
import { cn } from "@/lib/utils";

type CampaignTargetAudiencePanelProps = {
  campaignUid: string;
  customerCount: number;
  onCustomerCountChange?: (count: number) => void;
  /** manage: upload + search + table; view: search + table only (e.g. active campaigns). */
  mode?: "manage" | "view";
};

export function CampaignTargetAudiencePanel({
  campaignUid,
  customerCount,
  onCustomerCountChange,
  mode = "manage",
}: CampaignTargetAudiencePanelProps) {
  const isViewOnly = mode === "view";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSpec, setUploadSpec] = useState<CampaignTargetUploadSpecResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<CampaignTargetUploadResponse | null>(null);
  const [uploads, setUploads] = useState<CampaignTargetUploadResponse[]>([]);
  const [customers, setCustomers] = useState<CampaignTargetCustomerResponse[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const pageSize = 20;
  const onCustomerCountChangeRef = useRef(onCustomerCountChange);
  const prevModeRef = useRef(mode);
  useEffect(() => {
    onCustomerCountChangeRef.current = onCustomerCountChange;
  }, [onCustomerCountChange]);

  const loadCustomers = useCallback(async () => {
    if (!campaignUid) return;
    setLoadingList(true);
    try {
      await ensureAuthSession();
      const res = await campaignsAdminApi.listTargetCustomers(campaignUid, {
        page,
        size: pageSize,
        search: search.trim() || undefined,
      });
      setCustomers(res?.content ?? []);
      setTotalPages(res?.totalPages ?? 0);
      onCustomerCountChangeRef.current?.(res?.totalElements ?? 0);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [campaignUid, page, search]);

  const loadUploads = useCallback(async () => {
    if (!campaignUid) return;
    try {
      await ensureAuthSession();
      const list = await campaignsAdminApi.listTargetUploads(campaignUid);
      setUploads(list.slice(0, 8));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, [campaignUid]);

  useEffect(() => {
    if (isViewOnly) return;
    void (async () => {
      try {
        await ensureAuthSession();
        const spec = await campaignsAdminApi.getTargetUploadSpec();
        setUploadSpec(spec);
      } catch (e) {
        if (e instanceof ApiError) toast.error(e.message);
      }
    })();
  }, [isViewOnly]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    void loadCustomers();
  }, [mode, loadCustomers]);

  useEffect(() => {
    if (isViewOnly) return;
    void loadUploads();
  }, [isViewOnly, loadUploads]);

  const onUpload = async (file: File) => {
    if (!campaignUid) {
      toast.error("Campaign must be saved before uploading customers.");
      return;
    }
    setUploading(true);
    try {
      await ensureAuthSession();
      const res = await campaignsAdminApi.uploadTargetCustomers(campaignUid, file);
      setLastUpload(res);
      if (res.duplicateFileReplay) {
        toast("Same file data as before — no changes were made.", { icon: "ℹ️" });
      } else if ((res.importedCount ?? 0) === 0 && (res.duplicateCount ?? 0) > 0) {
        toast("No new customers added — all IDs in this file are already on the list.", {
          icon: "ℹ️",
        });
      } else {
        toast.success(
          `Import complete: ${res.importedCount ?? 0} customer(s) added` +
            (res.duplicateCount ? `, ${res.duplicateCount} duplicate(s) skipped` : "") +
            (res.errorCount ? `, ${res.errorCount} row error(s)` : "")
        );
      }
      await Promise.all([loadCustomers(), loadUploads()]);
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
    a.download = uploadSpec.exampleFilename || "loyaltyos-campaign-target-customers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeCustomer = async (customerId: string) => {
    try {
      await ensureAuthSession();
      await campaignsAdminApi.removeTargetCustomer(campaignUid, customerId);
      toast.success("Customer removed");
      await loadCustomers();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Failed to remove customer");
    }
  };

  const countLabel = useMemo(() => {
    const n = customerCount > 0 ? customerCount : 0;
    return `${n.toLocaleString()} targeted`;
  }, [customerCount]);

  const listToolbar = (
    <div className="flex items-center justify-between gap-3">
      <Badge variant="outline">{countLabel}</Badge>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={loadingList}
        onClick={() => void loadCustomers()}
      >
        <RefreshCw className={cn("h-4 w-4 mr-1.5", loadingList && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );

  return (
    <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-5">
      {!isViewOnly ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold">Target customer list</p>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Listed customers receive this campaign when audience is set to Specific Customers.
          </p>
        </div>
      ) : null}

      {listToolbar}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Search customer ID</Label>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Filter list…"
          className="max-w-md"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {isViewOnly ? (
              <>
                <col style={{ width: "33.33%" }} />
                <col style={{ width: "33.33%" }} />
                <col style={{ width: "33.34%" }} />
              </>
            ) : (
              <>
                <col style={{ width: "12%" }} />
                <col style={{ width: "33%" }} />
                <col style={{ width: "33%" }} />
                <col style={{ width: "22%" }} />
              </>
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-[var(--surface-sunken)] text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Sl No</th>
              <th className="px-4 py-2 font-medium">Customer ID</th>
              <th className="px-4 py-2 font-medium">Added</th>
              {!isViewOnly ? (
                <th className="px-4 py-2 font-medium text-right">Action</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={isViewOnly ? 3 : 4}
                  className="px-3 py-6 text-center text-muted-foreground text-xs"
                >
                  {loadingList
                    ? "Loading…"
                    : isViewOnly
                      ? "No targeted customers in this list."
                      : "No targeted customers yet. Upload a CSV to add IDs."}
                </td>
              </tr>
            ) : (
              customers.map((row, index) => (
                <tr key={row.customerId} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 tabular-nums text-xs text-muted-foreground">
                    {page * pageSize + index + 1}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs truncate" title={row.customerId}>
                    {row.customerId}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {row.addedAt ? new Date(row.addedAt).toLocaleString() : "—"}
                  </td>
                  {!isViewOnly ? (
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full text-red-600"
                        onClick={() => void removeCustomer(row.customerId)}
                      >
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {!isViewOnly ? (
        <div className="space-y-4 border-t border-border/60 pt-5">
          <p className="text-sm font-semibold">Add customers via CSV</p>
          <div className="flex flex-wrap items-center gap-2">
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
              size="sm"
              className="rounded-full"
              disabled={uploading || !campaignUid}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
          </div>

          {uploadSpec ? (
            <div className="rounded-xl border border-border bg-[var(--surface-sunken)] p-4 space-y-3">
              <p className="text-sm font-semibold">Required file format</p>
              <p className="text-xs text-muted-foreground">
                {uploadSpec.format} · {uploadSpec.encoding} · max {uploadSpec.maxFileSizeMb} MB · up to{" "}
                {uploadSpec.maxRows.toLocaleString()} rows
              </p>
              {uploadSpec.standardHeaders?.length ? (
                <p className="text-xs font-mono bg-background border border-border rounded-lg px-3 py-2">
                  {uploadSpec.standardHeaders.join(",")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading upload format…</p>
          )}

          {lastUpload?.uploadUid ? (
            <div className="rounded-xl border border-border bg-[var(--surface-sunken)] p-3 text-sm space-y-1">
              <p className="font-medium">Last upload — {lastUpload.uploadUid.slice(0, 8)}…</p>
              <p className="text-muted-foreground text-xs">
                Status: {lastUpload.status} · Imported: {lastUpload.importedCount ?? 0} · Duplicates:{" "}
                {lastUpload.duplicateCount ?? 0} · Errors: {lastUpload.errorCount ?? 0}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isViewOnly && uploads.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Recent uploads</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--surface-sunken)] text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium w-14">Sl No</th>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Imported customers</th>
                  <th className="px-3 py-2 font-medium">Duplicates skipped</th>
                  <th className="px-3 py-2 font-medium">Uploaded Status</th>
                  <th className="px-3 py-2 font-medium">Uploaded by</th>
                  <th className="px-3 py-2 font-medium">Uploaded at</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u, index) => (
                  <tr key={u.uploadUid} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{u.uploadUid?.slice(0, 8)}…</td>
                    <td className="px-3 py-2 tabular-nums">{u.importedCount ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums">{u.duplicateCount ?? 0}</td>
                    <td className="px-3 py-2">{u.status}</td>
                    <td
                      className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[220px] truncate"
                      title={u.tenantId ?? u.uploadedBy}
                    >
                      {u.tenantId ?? u.uploadedBy ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {u.uploadedAt ? new Date(u.uploadedAt).toLocaleString() : "—"}
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
