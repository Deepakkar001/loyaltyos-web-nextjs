"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Headset, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

import { adminApi, AdminApiError } from "@/lib/api/admin-client";
import type { SupportCase, SupportCaseStatus } from "@/lib/api/support";
import { SupportCaseDetailCard } from "@/components/support/SupportCaseDetailCard";
import { ADMIN_STATUS_FILTER_OPTIONS } from "@/components/support/SupportCaseStatusSelect";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/support/support-content";
import { cn } from "@/lib/utils";

function adminListBadgeClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "IN_PROGRESS":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "RESOLVED":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "CLOSED":
      return "border-slate-500/50 bg-slate-700/50 text-slate-300";
    default:
      return "border-slate-600 text-slate-300";
  }
}

export default function AdminSupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminApi.listSupportCases(
        (statusFilter || undefined) as SupportCaseStatus | undefined
      );
      setCases(list);
      setSelectedUid((prev) => {
        if (prev && list.some((c) => c.caseUid === prev)) return prev;
        return list[0]?.caseUid ?? null;
      });
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Failed to load support cases");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.caseUid.toLowerCase().includes(q) ||
        c.tenantId.toLowerCase().includes(q) ||
        (c.companyName?.toLowerCase().includes(q) ?? false) ||
        (c.createdByEmail?.toLowerCase().includes(q) ?? false)
    );
  }, [cases, search]);

  const selected =
    filtered.find((c) => c.caseUid === selectedUid) ??
    (filtered.length > 0 ? filtered[0] : null);

  useEffect(() => {
    if (selected && selected.caseUid !== selectedUid) {
      setSelectedUid(selected.caseUid);
    }
  }, [selected, selectedUid]);

  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const inProgressCount = cases.filter((c) => c.status === "IN_PROGRESS").length;

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Headset className="h-7 w-7 text-amber-500" />
            Support cases
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {cases.length} total · {openCount} open · {inProgressCount} in progress
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search subject, tenant, case id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
          />
        </div>
        <NativeSelect
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={ADMIN_STATUS_FILTER_OPTIONS}
          variant="admin-dark"
          className="w-full sm:w-52 shrink-0"
        />
      </div>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-12 lg:min-h-[520px]">
        <div className="lg:col-span-4 flex flex-col min-h-[280px] lg:min-h-0 rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
          <div className="border-b border-slate-800 px-4 py-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Queue ({filtered.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <p className="p-4 text-sm text-slate-400">Loading cases…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="p-6 text-sm text-slate-400 text-center">No cases match your filters.</p>
            )}
            {!loading &&
              filtered.map((c) => (
                <button
                  key={c.caseUid}
                  type="button"
                  onClick={() => setSelectedUid(c.caseUid)}
                  className={cn(
                    "w-full text-left border-b border-slate-800/80 px-4 py-3.5 transition-colors",
                    "hover:bg-slate-800/70 focus-visible:bg-slate-800/70 focus-visible:outline-none",
                    selected?.caseUid === c.caseUid &&
                      "bg-slate-800 border-l-2 border-l-amber-500 pl-[14px]"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        adminListBadgeClass(c.status)
                      )}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                    {c.priority === "URGENT" && (
                      <span className="rounded-full border border-red-500/50 bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-200">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug">
                    {c.subject}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {c.companyName ?? c.tenantId}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {CATEGORY_LABELS[c.category]}
                  </p>
                </button>
              ))}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col min-h-[360px] lg:min-h-0 rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-3 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Case details
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-5">
            {!selected && !loading && (
              <p className="text-sm text-slate-400 py-12 text-center">
                Select a case from the queue to review and update status.
              </p>
            )}
            {selected && (
              <SupportCaseDetailCard
                theme="admin"
                caseItem={selected}
                onUpdateStatus={(uid, status) => adminApi.updateSupportCaseStatus(uid, status)}
                onStatusUpdated={(updated) => {
                  setCases((prev) =>
                    prev.map((c) => (c.caseUid === updated.caseUid ? updated : c))
                  );
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
