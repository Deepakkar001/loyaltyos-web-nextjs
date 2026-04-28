"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin-client";
import {
  AdminDashboardStats,
  AdminTenantListItem,
  PendingAgreementListItem,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<AdminTenantListItem[]>([]);
  const [pendingAgreements, setPendingAgreements] = useState<PendingAgreementListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, t, p] = await Promise.all([
        adminApi.getStats(),
        adminApi.listTenants(),
        adminApi.listPending(),
      ]);
      setStats(s);
      setRecentTenants(t.slice(0, 5));
      setPendingAgreements(p);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Platform overview and key metrics</p>
      </div>

      {/* Top Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Tenants"
            value={stats.totalTenants}
            icon={Building2}
            color="blue"
            subtitle={`+${stats.registrationsToday} today`}
          />
          <StatCard
            label="Pending Approval"
            value={stats.pendingApprovalAgreements}
            icon={Clock}
            color="amber"
            subtitle={`${stats.totalAgreements} total agreements`}
          />
          <StatCard
            label="Approved"
            value={stats.approvedAgreements}
            icon={CheckCircle2}
            color="emerald"
            subtitle={`${stats.rejectedAgreements} rejected`}
          />
          <StatCard
            label="Active Tenants"
            value={stats.activeTenants}
            icon={TrendingUp}
            color="violet"
            subtitle={`${stats.suspendedTenants} suspended`}
          />
        </div>
      )}

      {/* Registration Trend + Onboarding Funnel */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          {/* Registration Trend */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Registrations</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-slate-800/50">
                <p className="text-2xl font-bold text-white">{stats.registrationsToday}</p>
                <p className="text-xs text-slate-500 mt-1">Today</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-800/50">
                <p className="text-2xl font-bold text-white">{stats.registrationsThisWeek}</p>
                <p className="text-xs text-slate-500 mt-1">This Week</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-800/50">
                <p className="text-2xl font-bold text-white">{stats.registrationsThisMonth}</p>
                <p className="text-xs text-slate-500 mt-1">This Month</p>
              </div>
            </div>
          </div>

          {/* Onboarding Funnel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Onboarding Funnel</h3>
            <div className="space-y-3">
              <FunnelBar label="Pending Email" count={stats.pendingEmailVerification} total={stats.totalTenants} color="bg-slate-500" />
              <FunnelBar label="Email Verified" count={stats.emailVerified} total={stats.totalTenants} color="bg-blue-500" />
              <FunnelBar label="Agreement Stage" count={stats.agreementPending} total={stats.totalTenants} color="bg-amber-500" />
              <FunnelBar label="Active" count={stats.activeTenants} total={stats.totalTenants} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row: Pending Approvals + Recent Tenants */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pending Approvals */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Pending Approvals</h3>
            <Link
              href="/admin/approvals"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingAgreements.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-xs text-slate-500">All clear - no pending approvals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAgreements.slice(0, 5).map((a) => (
                <Link
                  key={a.agreementUid}
                  href="/admin/approvals"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{a.companyName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{a.tenantEmail}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 flex-shrink-0">
                    {new Date(a.signedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tenants */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Recent Tenants</h3>
            <Link
              href="/admin/tenants"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTenants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No tenants yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTenants.map((t) => (
                <Link
                  key={t.tenantId}
                  href={`/admin/tenants/${t.tenantId}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{t.companyName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{t.email}</p>
                  </div>
                  <StatusBadge status={t.onboardingStatus} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "amber" | "emerald" | "violet";
  subtitle: string;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  };
  const c = colorMap[color];

  return (
    <div className={cn("rounded-2xl border bg-slate-900/50 p-5", c.border)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", c.bg)}>
          <Icon className={cn("w-4 h-4", c.text)} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</p>
      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-medium text-slate-300 w-10 text-right">{count}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_EMAIL_VERIFICATION: { label: "Email Pending", cls: "text-slate-400 bg-slate-500/10" },
    EMAIL_VERIFIED: { label: "Verified", cls: "text-blue-400 bg-blue-500/10" },
    AGREEMENT_PENDING: { label: "Awaiting Agr.", cls: "text-amber-400 bg-amber-500/10" },
    AGREEMENT_SIGNED: { label: "Under Review", cls: "text-orange-400 bg-orange-500/10" },
    CONFIGURED: { label: "Configured", cls: "text-cyan-400 bg-cyan-500/10" },
    SANDBOX_TESTING: { label: "Sandbox", cls: "text-purple-400 bg-purple-500/10" },
    ACTIVE: { label: "Active", cls: "text-emerald-400 bg-emerald-500/10" },
    SUSPENDED: { label: "Suspended", cls: "text-red-400 bg-red-500/10" },
    TERMINATED: { label: "Terminated", cls: "text-red-500 bg-red-500/10" },
  };
  const entry = map[status] ?? { label: status, cls: "text-slate-400 bg-slate-500/10" };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", entry.cls)}>
      {entry.label}
    </span>
  );
}
