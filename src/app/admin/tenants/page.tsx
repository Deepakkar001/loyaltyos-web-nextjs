"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Globe,
  Search,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin-client";
import { AdminTenantListItem } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PENDING_EMAIL_VERIFICATION", label: "Email Pending" },
  { value: "EMAIL_VERIFIED", label: "Verified" },
  { value: "AGREEMENT_PENDING", label: "Awaiting Agreement" },
  { value: "AGREEMENT_SIGNED", label: "Under Review" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
];

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchTenants = useCallback(async () => {
    try {
      const data = await adminApi.listTenants();
      setTenants(data);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        search.length === 0 ||
        t.companyName.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.tenantId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || t.onboardingStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, search, statusFilter]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tenants</h1>
        <p className="text-sm text-slate-400 mt-1">
          {tenants.length} registered {tenants.length === 1 ? "tenant" : "tenants"}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, or tenant ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-700 bg-slate-800/50 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === f.value
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No tenants found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/80">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Company</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Email</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Industry</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Country</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Registered</p>
            <div />
          </div>

          {/* Rows */}
          {filtered.map((t) => (
            <Link
              key={t.tenantId}
              href={`/admin/tenants/${t.tenantId}`}
              className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-3.5 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors items-center group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
                  {t.companyName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{t.companyName}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{t.tenantId.slice(0, 12)}...</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 truncate">{t.email}</p>
              <p className="text-xs text-slate-400">{t.businessCategory.replace(/_/g, " ")}</p>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-400">{t.countryCode}</p>
              </div>
              <StatusBadge status={t.onboardingStatus} />
              <p className="text-xs text-slate-500">
                {new Date(t.createdAt).toLocaleDateString()}
              </p>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_EMAIL_VERIFICATION: { label: "Email Pending", cls: "text-slate-400 bg-slate-500/10 border-slate-600" },
    EMAIL_VERIFIED: { label: "Verified", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    AGREEMENT_PENDING: { label: "Awaiting Agr.", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    AGREEMENT_SIGNED: { label: "Under Review", cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    CONFIGURED: { label: "Configured", cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    SANDBOX_TESTING: { label: "Sandbox", cls: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    ACTIVE: { label: "Active", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    SUSPENDED: { label: "Suspended", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
    TERMINATED: { label: "Terminated", cls: "text-red-500 bg-red-500/10 border-red-500/20" },
  };
  const entry = map[status] ?? { label: status, cls: "text-slate-400 bg-slate-500/10 border-slate-600" };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", entry.cls)}>
      {entry.label}
    </span>
  );
}
