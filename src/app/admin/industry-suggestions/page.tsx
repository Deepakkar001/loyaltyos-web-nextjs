"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { adminApi, AdminApiError } from "@/lib/api/admin-client";
import type {
  AdminBusinessCategoryItem,
  BusinessCategoryStatus,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";

type Tab = BusinessCategoryStatus | "ALL";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "PENDING_REVIEW", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All" },
];

type ActionMode = "approve" | "reject" | "deactivate" | null;

export default function AdminIndustrySuggestionsPage() {
  const [items, setItems] = useState<AdminBusinessCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [reasonDraft, setReasonDraft] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const list = await adminApi.listBusinessCategories("ALL");
      setItems(list);
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Failed to load industry suggestions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      PENDING_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      ALL: items.length,
    };
    for (const it of items) c[it.status as Tab]++;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    let list = items;
    if (tab !== "ALL") list = list.filter((c) => c.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.submittedByCompanyName || "").toLowerCase().includes(q) ||
          (c.submittedByEmail || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, tab, search]);

  const resetDrafts = () => {
    setActionMode(null);
    setLabelDraft("");
    setReasonDraft("");
  };

  const onExpand = (it: AdminBusinessCategoryItem) => {
    const next = expandedCode === it.code ? null : it.code;
    setExpandedCode(next);
    if (next) {
      setLabelDraft(it.label);
      setReasonDraft("");
      setActionMode(null);
    } else {
      resetDrafts();
    }
  };

  const handleApprove = async (it: AdminBusinessCategoryItem) => {
    setActionCode(it.code);
    try {
      const overrides =
        labelDraft.trim().length > 0 && labelDraft.trim() !== it.label
          ? { label: labelDraft.trim() }
          : undefined;
      const result = await adminApi.approveBusinessCategory(it.code, overrides);
      toast.success(
        it.status === "APPROVED" && it.active
          ? "Updated."
          : it.status === "REJECTED"
            ? "Industry re-approved — visible in tenant onboarding again."
            : it.status === "APPROVED" && !it.active
              ? "Industry reactivated — visible in tenant onboarding again."
              : "Industry approved — now visible in tenant onboarding."
      );
      setExpandedCode(null);
      resetDrafts();
      await fetchData();
      void result;
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Approval failed");
    } finally {
      setActionCode(null);
    }
  };

  const handleReject = async (it: AdminBusinessCategoryItem) => {
    if (reasonDraft.trim().length < 5) {
      toast.error("Please provide a reason (min 5 chars).");
      return;
    }
    if (it.status === "APPROVED") {
      const ok = window.confirm(
        `Revoke "${it.label}"?\n\nThis will hide it from the public dropdown. Tenants who already chose this industry will see a "rejected" banner the next time they edit Step 1.`
      );
      if (!ok) return;
    }
    setActionCode(it.code);
    try {
      await adminApi.rejectBusinessCategory(it.code, reasonDraft.trim());
      toast.success(
        it.status === "APPROVED"
          ? "Approval revoked."
          : "Industry suggestion rejected."
      );
      setExpandedCode(null);
      resetDrafts();
      await fetchData();
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Rejection failed");
    } finally {
      setActionCode(null);
    }
  };

  const handleDeactivate = async (it: AdminBusinessCategoryItem) => {
    setActionCode(it.code);
    try {
      await adminApi.deactivateBusinessCategory(
        it.code,
        reasonDraft.trim() || undefined
      );
      toast.success(
        "Hidden from public dropdown — existing tenants keep their selection."
      );
      setExpandedCode(null);
      resetDrafts();
      await fetchData();
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Deactivation failed");
    } finally {
      setActionCode(null);
    }
  };

  const handleReactivate = async (it: AdminBusinessCategoryItem) => {
    setActionCode(it.code);
    try {
      await adminApi.reactivateBusinessCategory(it.code);
      toast.success("Industry reactivated — visible in tenant onboarding again.");
      setExpandedCode(null);
      resetDrafts();
      await fetchData();
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Reactivation failed");
    } finally {
      setActionCode(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Industry Suggestions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Tenant-typed industries land here as <b className="text-amber-400">PENDING</b>.
            They&apos;re hidden from the public dropdown until you approve them — and any
            approved entry can later be reactivated, deactivated, or revoked.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-slate-700 text-slate-300 hover:text-white"
          onClick={() => {
            setRefreshing(true);
            void fetchData();
          }}
          disabled={refreshing || loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing ? "animate-spin" : "")} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
          {TABS.map((t) => (
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
              <span
                className={cn(
                  "min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center",
                  tab === t.id ? "bg-amber-500/20 text-amber-300" : "bg-slate-700 text-slate-500"
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search code, label, tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <Layers className="w-10 h-10 text-amber-500/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {tab === "PENDING_REVIEW"
              ? "No pending suggestions — you're all caught up."
              : "No items match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((it) => {
            const expanded = expandedCode === it.code;
            const isBusy = actionCode === it.code;
            const isSeeded = !it.submittedByTenantId;
            const isApprovedActive = it.status === "APPROVED" && it.active === true;
            const isApprovedInactive = it.status === "APPROVED" && it.active === false;
            return (
              <div
                key={it.code}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onExpand(it)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <StatusIcon status={it.status} active={it.active === true} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate flex items-center gap-2">
                        {it.label}{" "}
                        <span className="text-slate-500 font-normal text-xs">· {it.code}</span>
                        {isSeeded && (
                          <span
                            title="System-seeded category — protected from rejection"
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            seeded
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {it.submittedByCompanyName ? (
                          <>
                            Submitted by{" "}
                            <span className="text-slate-300">{it.submittedByCompanyName}</span>
                            {it.submittedByEmail ? ` · ${it.submittedByEmail}` : ""}
                          </>
                        ) : (
                          <span className="text-slate-500">Seeded / system entry</span>
                        )}
                        {it.submittedLabel && it.submittedLabel !== it.label
                          ? ` · original: "${it.submittedLabel}"`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={it.status} active={it.active === true} />
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-800 px-6 py-5 space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <Detail label="Code" value={it.code} mono />
                      <Detail label="Sort Order" value={String(it.sortOrder ?? "—")} />
                      <Detail label="Active" value={it.active ? "Yes" : "No"} />
                      <Detail label="Status" value={it.status.replace("_", " ")} />
                      {it.decidedByAdminId && (
                        <Detail label="Decided by" value={it.decidedByAdminId} mono />
                      )}
                      {it.decidedAt && (
                        <Detail
                          label="Decided at"
                          value={new Date(it.decidedAt).toLocaleString()}
                        />
                      )}
                      {it.decisionReason && (
                        <div className="col-span-2 lg:col-span-4">
                          <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-0.5">
                            Decision reason
                          </p>
                          <p className="text-sm text-amber-200 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                            {it.decisionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* PENDING — approve or reject */}
                    {it.status === "PENDING_REVIEW" && (
                      <PendingActions
                        item={it}
                        labelDraft={labelDraft}
                        setLabelDraft={setLabelDraft}
                        reasonDraft={reasonDraft}
                        setReasonDraft={setReasonDraft}
                        isBusy={isBusy}
                        onApprove={() => handleApprove(it)}
                        onReject={() => handleReject(it)}
                      />
                    )}

                    {/* APPROVED + active — edit / deactivate / revoke */}
                    {isApprovedActive && (
                      <ApprovedActiveActions
                        item={it}
                        isSeeded={isSeeded}
                        actionMode={actionMode}
                        setActionMode={setActionMode}
                        labelDraft={labelDraft}
                        setLabelDraft={setLabelDraft}
                        reasonDraft={reasonDraft}
                        setReasonDraft={setReasonDraft}
                        isBusy={isBusy}
                        onSaveLabel={() => handleApprove(it)}
                        onDeactivate={() => handleDeactivate(it)}
                        onRevoke={() => handleReject(it)}
                      />
                    )}

                    {/* APPROVED + inactive — reactivate / edit / revoke */}
                    {isApprovedInactive && (
                      <ApprovedInactiveActions
                        item={it}
                        isSeeded={isSeeded}
                        actionMode={actionMode}
                        setActionMode={setActionMode}
                        labelDraft={labelDraft}
                        setLabelDraft={setLabelDraft}
                        reasonDraft={reasonDraft}
                        setReasonDraft={setReasonDraft}
                        isBusy={isBusy}
                        onReactivate={() => handleReactivate(it)}
                        onSaveLabel={() => handleApprove(it)}
                        onRevoke={() => handleReject(it)}
                      />
                    )}

                    {/* REJECTED — re-approve */}
                    {it.status === "REJECTED" && (
                      <RejectedActions
                        item={it}
                        labelDraft={labelDraft}
                        setLabelDraft={setLabelDraft}
                        isBusy={isBusy}
                        onReApprove={() => handleApprove(it)}
                      />
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

// ─── Sub-components for each state's action panel ───────────────────────────

function PendingActions({
  item,
  labelDraft,
  setLabelDraft,
  reasonDraft,
  setReasonDraft,
  isBusy,
  onApprove,
  onReject,
}: {
  item: AdminBusinessCategoryItem;
  labelDraft: string;
  setLabelDraft: (v: string) => void;
  reasonDraft: string;
  setReasonDraft: (v: string) => void;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FieldLabelOverride
          value={labelDraft}
          onChange={setLabelDraft}
          placeholder={item.label}
          hint="Edit before approving if you want a cleaner display name. Code stays the same."
        />
        <FieldRejectReason value={reasonDraft} onChange={setReasonDraft} />
      </div>

      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <Button
          type="button"
          disabled={isBusy}
          onClick={onApprove}
          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isBusy ? "Processing…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isBusy || reasonDraft.trim().length < 5}
          onClick={onReject}
          className={cn(
            "h-10 px-5 rounded-xl font-semibold border",
            reasonDraft.trim().length >= 5
              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
              : "border-slate-700 text-slate-500 cursor-not-allowed"
          )}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </div>
    </>
  );
}

function ApprovedActiveActions({
  item,
  isSeeded,
  actionMode,
  setActionMode,
  labelDraft,
  setLabelDraft,
  reasonDraft,
  setReasonDraft,
  isBusy,
  onSaveLabel,
  onDeactivate,
  onRevoke,
}: {
  item: AdminBusinessCategoryItem;
  isSeeded: boolean;
  actionMode: ActionMode;
  setActionMode: (m: ActionMode) => void;
  labelDraft: string;
  setLabelDraft: (v: string) => void;
  reasonDraft: string;
  setReasonDraft: (v: string) => void;
  isBusy: boolean;
  onSaveLabel: () => void;
  onDeactivate: () => void;
  onRevoke: () => void;
}) {
  const labelDirty = labelDraft.trim().length > 0 && labelDraft.trim() !== item.label;

  return (
    <div className="space-y-4">
      {/* Inline label edit */}
      <FieldLabelOverride
        value={labelDraft}
        onChange={setLabelDraft}
        placeholder={item.label}
        hint="Edit and save to update the public label. Code stays the same."
      />

      {/* Optional reason input shown only when an action is staged */}
      {actionMode === "deactivate" && (
        <FieldFreeReason
          label="Why hide this from the dropdown? (optional)"
          value={reasonDraft}
          onChange={setReasonDraft}
          placeholder="e.g. duplicate of HOSPITALITY — keeping for audit only"
        />
      )}
      {actionMode === "reject" && (
        <FieldRejectReason
          label="Reason for revoking approval (required)"
          value={reasonDraft}
          onChange={setReasonDraft}
        />
      )}

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Button
          type="button"
          disabled={isBusy || !labelDirty}
          onClick={onSaveLabel}
          className={cn(
            "h-10 px-5 rounded-xl font-semibold",
            labelDirty
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Save label
        </Button>

        {actionMode === "deactivate" ? (
          <>
            <Button
              type="button"
              disabled={isBusy}
              onClick={onDeactivate}
              className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              {isBusy ? "Processing…" : "Confirm deactivate"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionMode(null);
                setReasonDraft("");
              }}
              className="h-10 px-4 rounded-xl border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setActionMode("deactivate");
              setReasonDraft("");
            }}
            className="h-10 px-5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-semibold"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Deactivate
          </Button>
        )}

        {actionMode === "reject" ? (
          <>
            <Button
              type="button"
              disabled={isBusy || reasonDraft.trim().length < 5}
              onClick={onRevoke}
              className={cn(
                "h-10 px-5 rounded-xl font-semibold",
                reasonDraft.trim().length >= 5
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isBusy ? "Processing…" : "Confirm revoke"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionMode(null);
                setReasonDraft("");
              }}
              className="h-10 px-4 rounded-xl border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={isSeeded}
            title={
              isSeeded
                ? "System-seeded categories cannot be rejected. Use Deactivate to hide it instead."
                : undefined
            }
            onClick={() => {
              setActionMode("reject");
              setReasonDraft("");
            }}
            className={cn(
              "h-10 px-5 rounded-xl font-semibold border",
              isSeeded
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
            )}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function ApprovedInactiveActions({
  item,
  isSeeded,
  actionMode,
  setActionMode,
  labelDraft,
  setLabelDraft,
  reasonDraft,
  setReasonDraft,
  isBusy,
  onReactivate,
  onSaveLabel,
  onRevoke,
}: {
  item: AdminBusinessCategoryItem;
  isSeeded: boolean;
  actionMode: ActionMode;
  setActionMode: (m: ActionMode) => void;
  labelDraft: string;
  setLabelDraft: (v: string) => void;
  reasonDraft: string;
  setReasonDraft: (v: string) => void;
  isBusy: boolean;
  onReactivate: () => void;
  onSaveLabel: () => void;
  onRevoke: () => void;
}) {
  const labelDirty = labelDraft.trim().length > 0 && labelDraft.trim() !== item.label;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
        <p className="font-semibold">Hidden from public dropdown</p>
        <p className="text-xs text-amber-200/70 mt-0.5">
          Approved but currently inactive. Reactivate to show it to new tenants again.
        </p>
      </div>

      <FieldLabelOverride
        value={labelDraft}
        onChange={setLabelDraft}
        placeholder={item.label}
        hint="Editing the label will also save automatically when you reactivate or click Save label."
      />

      {actionMode === "reject" && (
        <FieldRejectReason
          label="Reason for revoking approval (required)"
          value={reasonDraft}
          onChange={setReasonDraft}
        />
      )}

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Button
          type="button"
          disabled={isBusy}
          onClick={onReactivate}
          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {isBusy ? "Processing…" : "Reactivate"}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={isBusy || !labelDirty}
          onClick={onSaveLabel}
          className={cn(
            "h-10 px-5 rounded-xl font-semibold border",
            labelDirty
              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              : "border-slate-800 text-slate-600 cursor-not-allowed"
          )}
        >
          Save label
        </Button>

        {actionMode === "reject" ? (
          <>
            <Button
              type="button"
              disabled={isBusy || reasonDraft.trim().length < 5}
              onClick={onRevoke}
              className={cn(
                "h-10 px-5 rounded-xl font-semibold",
                reasonDraft.trim().length >= 5
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isBusy ? "Processing…" : "Confirm revoke"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActionMode(null);
                setReasonDraft("");
              }}
              className="h-10 px-4 rounded-xl border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={isSeeded}
            title={
              isSeeded
                ? "System-seeded categories cannot be rejected. Keep it deactivated instead."
                : undefined
            }
            onClick={() => {
              setActionMode("reject");
              setReasonDraft("");
            }}
            className={cn(
              "h-10 px-5 rounded-xl font-semibold border",
              isSeeded
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
            )}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function RejectedActions({
  item,
  labelDraft,
  setLabelDraft,
  isBusy,
  onReApprove,
}: {
  item: AdminBusinessCategoryItem;
  labelDraft: string;
  setLabelDraft: (v: string) => void;
  isBusy: boolean;
  onReApprove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-200">
        <p className="font-semibold">Currently rejected</p>
        <p className="text-xs text-red-200/70 mt-0.5">
          Re-approve to put this back into the public dropdown. The original tenant&apos;s
          banner will switch from &quot;rejected&quot; to &quot;approved&quot;.
        </p>
      </div>

      <FieldLabelOverride
        value={labelDraft}
        onChange={setLabelDraft}
        placeholder={item.label}
        hint="Tweak the label before re-approving if needed."
      />

      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <Button
          type="button"
          disabled={isBusy}
          onClick={onReApprove}
          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {isBusy ? "Processing…" : "Re-approve"}
        </Button>
      </div>
    </div>
  );
}

// ─── Field primitives ───────────────────────────────────────────────────────

function FieldLabelOverride({
  value,
  onChange,
  placeholder,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        Display label
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function FieldRejectReason({
  value,
  onChange,
  label = "Rejection reason (required)",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="Min 5 chars. Captured for audit."
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
      />
    </div>
  );
}

function FieldFreeReason({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      />
    </div>
  );
}

// ─── Visual helpers ─────────────────────────────────────────────────────────

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm text-slate-300 mt-0.5", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  active,
}: {
  status: BusinessCategoryStatus;
  active: boolean;
}) {
  // Special case: APPROVED but inactive → show as "Hidden"
  if (status === "APPROVED" && !active) {
    return (
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20">
        Hidden
      </span>
    );
  }

  const map: Record<BusinessCategoryStatus, { label: string; cls: string }> = {
    PENDING_REVIEW: {
      label: "Pending",
      cls: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    APPROVED: {
      label: "Approved",
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    REJECTED: { label: "Rejected", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  };
  const e = map[status];
  return (
    <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", e.cls)}>
      {e.label}
    </span>
  );
}

function StatusIcon({
  status,
  active,
}: {
  status: BusinessCategoryStatus;
  active: boolean;
}) {
  if (status === "APPROVED" && !active) {
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500/10 text-amber-400">
        <EyeOff className="w-4 h-4" />
      </div>
    );
  }

  const map: Record<
    BusinessCategoryStatus,
    { Icon: React.ComponentType<{ className?: string }>; cls: string }
  > = {
    PENDING_REVIEW: { Icon: Layers, cls: "bg-amber-500/10 text-amber-400" },
    APPROVED: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400" },
    REJECTED: { Icon: XCircle, cls: "bg-red-500/10 text-red-400" },
  };
  const e = map[status];
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        e.cls
      )}
    >
      <e.Icon className="w-4 h-4" />
    </div>
  );
}
