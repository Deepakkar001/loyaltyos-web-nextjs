"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  ExternalLink,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin-client";
import { AuditLogItem } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ACTION_COLORS: Record<string, string> = {
  TENANT_REGISTERED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  EMAIL_VERIFIED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  EMAIL_VERIFICATION_SENT: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  AGREEMENT_SUBMITTED: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  AGREEMENT_APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  AGREEMENT_REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
  IDENTITY_UPDATED: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  STATUS_TRANSITION: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = useCallback(async () => {
    try {
      const data = await adminApi.getAuditLogs(100);
      setLogs(data);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    const interval = setInterval(() => void fetchLogs(), 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return ["ALL", ...Array.from(actions).sort()];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        search.length === 0 ||
        l.tenantId.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.actorId ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesAction = actionFilter === "ALL" || l.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-sm text-slate-400 mt-1">
          Audit trail of all platform actions
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by tenant ID, action, or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a === "ALL" ? "All Actions" : a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No logs found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[120px_1fr_200px_120px_100px_40px] gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/80">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Time</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Action</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Tenant</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Actor</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Role</p>
            <div />
          </div>

          {filtered.map((log) => {
            const actionCls =
              ACTION_COLORS[log.action] ?? "text-slate-400 bg-slate-500/10 border-slate-600";

            return (
              <div
                key={log.id}
                className="grid grid-cols-[120px_1fr_200px_120px_100px_40px] gap-4 px-6 py-3 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors items-center"
              >
                <p className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border w-fit", actionCls)}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <p className="text-xs text-slate-400 font-mono truncate">{log.tenantId.slice(0, 16)}...</p>
                <p className="text-xs text-slate-400 truncate">{log.actorId?.slice(0, 12) ?? "-"}</p>
                <p className="text-[10px] text-slate-500">{log.actorRole ?? "-"}</p>
                <Link
                  href={`/admin/tenants/${log.tenantId}`}
                  className="w-6 h-6 rounded-md hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
