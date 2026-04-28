"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Search,
  XCircle,
} from "lucide-react";
import { adminApi, AdminApiError } from "@/lib/api/admin-client";
import {
  AllAgreementItem,
} from "@/types/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "pending" | "approved" | "rejected" | "all";

export default function AdminApprovalsPage() {
  const [allList, setAllList] = useState<AllAgreementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const all = await adminApi.listAllAgreements();
      setAllList(all);
    } catch {
      toast.error("Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (uid: string) => {
    setActionLoading(uid);
    try {
      await adminApi.approve(uid, approvalNotes || undefined);
      toast.success("Agreement approved");
      setExpandedUid(null);
      setApprovalNotes("");
      await fetchData();
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (uid: string) => {
    if (rejectReason.length < 10) {
      toast.error("Rejection reason must be at least 10 characters");
      return;
    }
    setActionLoading(uid);
    try {
      await adminApi.reject(uid, rejectReason);
      toast.success("Agreement rejected");
      setExpandedUid(null);
      setRejectReason("");
      await fetchData();
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  const displayList = useMemo(() => {
    let list: AllAgreementItem[];
    if (tab === "pending") {
      list = allList.filter((a) => a.status === "PENDING_APPROVAL");
    } else if (tab === "approved") {
      list = allList.filter((a) => a.status === "APPROVED");
    } else if (tab === "rejected") {
      list = allList.filter((a) => a.status === "REJECTED");
    } else {
      list = allList;
    }

    if (search.length > 0) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.companyName.toLowerCase().includes(s) ||
          a.tenantEmail.toLowerCase().includes(s) ||
          a.tenantId.toLowerCase().includes(s)
      );
    }

    return list;
  }, [allList, tab, search]);

  const pendingCount = allList.filter((a) => a.status === "PENDING_APPROVAL").length;
  const approvedCount = allList.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = allList.filter((a) => a.status === "REJECTED").length;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "approved", label: "Approved", count: approvedCount },
    { id: "rejected", label: "Rejected", count: rejectedCount },
    { id: "all", label: "All", count: allList.length },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review and manage tenant commercial agreements
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                tab === t.id
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {t.label}
              <span className={cn(
                "min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center",
                tab === t.id ? "bg-amber-500/20 text-amber-300" : "bg-slate-700 text-slate-500"
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {tab === "pending" ? "No pending agreements" : "No agreements match your filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((a) => {
            const isExpanded = expandedUid === a.agreementUid;
            const isBusy = actionLoading === a.agreementUid;
            const isPending = a.status === "PENDING_APPROVAL";

            return (
              <div
                key={a.agreementUid}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
              >
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedUid(isExpanded ? null : a.agreementUid);
                    setRejectReason("");
                    setApprovalNotes("");
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <AgreementStatusIcon status={a.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {a.companyName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {a.tenantEmail} &middot; {a.termsVersion} &middot; {a.revenueSharePct}% rev share
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <AgreementStatusBadge status={a.status} />
                    <span className="text-xs text-slate-500">
                      {new Date(a.signedAt).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-6 py-5 space-y-5">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <Detail label="Tenant ID" value={a.tenantId} mono />
                      <Detail label="Terms Version" value={a.termsVersion} />
                      <Detail label="Effective Date" value={a.effectiveDate} />
                      <Detail label="Revenue Share" value={`${a.revenueSharePct}%`} />
                      <Detail label="Settlement" value={a.settlementFrequency.replace(/_/g, " ")} />
                      <Detail label="Signed By" value={`${a.signedByName} (${a.signedByEmail})`} />
                      {a.signedByDesignation && (
                        <Detail label="Designation" value={a.signedByDesignation} />
                      )}
                      {a.approvedByAdminId && (
                        <Detail label="Processed By" value={a.approvedByAdminId} />
                      )}
                      {a.approvedAt && (
                        <Detail label="Processed At" value={new Date(a.approvedAt).toLocaleString()} />
                      )}
                      {a.rejectionReason && (
                        <div className="col-span-4">
                          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">Rejection Reason</p>
                          <p className="text-sm text-red-300 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                            {a.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Link to tenant detail */}
                    <Link
                      href={`/admin/tenants/${a.tenantId}`}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View full tenant profile
                    </Link>

                    {/* Actions — only for pending */}
                    {isPending && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                              Approval Notes (optional)
                            </label>
                            <textarea
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              rows={2}
                              placeholder="Internal reference..."
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                              Rejection Reason (required to reject)
                            </label>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              rows={2}
                              placeholder="Min 10 chars. Sent to tenant."
                              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <Button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApprove(a.agreementUid)}
                            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {isBusy ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy || rejectReason.length < 10}
                            onClick={() => handleReject(a.agreementUid)}
                            className={cn(
                              "h-10 px-5 rounded-xl font-semibold border",
                              rejectReason.length >= 10
                                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                : "border-slate-700 text-slate-500 cursor-not-allowed"
                            )}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm text-slate-300 mt-0.5", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function AgreementStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_APPROVAL: { label: "Pending", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    APPROVED: { label: "Approved", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    REJECTED: { label: "Rejected", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
    SUPERSEDED: { label: "Superseded", cls: "text-slate-400 bg-slate-500/10 border-slate-600" },
  };
  const entry = map[status] ?? { label: status, cls: "text-slate-400 bg-slate-500/10 border-slate-600" };
  return (
    <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", entry.cls)}>
      {entry.label}
    </span>
  );
}

function AgreementStatusIcon({ status }: { status: string }) {
  const map: Record<string, { Icon: React.ComponentType<{ className?: string }>; cls: string }> = {
    PENDING_APPROVAL: { Icon: Clock, cls: "bg-amber-500/10 text-amber-400" },
    APPROVED: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400" },
    REJECTED: { Icon: XCircle, cls: "bg-red-500/10 text-red-400" },
  };
  const entry = map[status] ?? { Icon: Clock, cls: "bg-slate-500/10 text-slate-400" };
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", entry.cls)}>
      <entry.Icon className="w-4 h-4" />
    </div>
  );
}
