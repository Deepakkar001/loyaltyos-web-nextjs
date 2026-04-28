"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Globe,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { adminApi } from "@/lib/api/admin-client";
import { AdminTenantDetail, AuditLogItem } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "agreements" | "contacts" | "activity">("overview");

  const fetchData = useCallback(async () => {
    try {
      const [detail, logs] = await Promise.all([
        adminApi.getTenantDetail(tenantId),
        adminApi.getTenantAuditLogs(tenantId, 20),
      ]);
      setTenant(detail);
      setAuditLogs(logs);
    } catch {
      toast.error("Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-400">Tenant not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-amber-400 hover:text-amber-300">
          Go back
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "agreements" as const, label: `Agreements (${tenant.agreements.length})` },
    { id: "contacts" as const, label: `Contacts (${tenant.contacts.length})` },
    { id: "activity" as const, label: `Activity (${auditLogs.length})` },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tenant.companyName}</h1>
            <StatusBadge status={tenant.onboardingStatus} />
          </div>
          <p className="text-sm text-slate-400 mt-0.5 font-mono">{tenant.tenantId}</p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-4 gap-3">
        <InfoCard icon={Mail} label="Email" value={tenant.email} />
        <InfoCard icon={Globe} label="Country / Region" value={`${tenant.countryCode} / ${tenant.dataResidencyRegion}`} />
        <InfoCard icon={Shield} label="Identity Mode" value={tenant.identityMode.replace(/_/g, " ")} />
        <InfoCard icon={Calendar} label="Registered" value={new Date(tenant.createdAt).toLocaleDateString()} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                activeTab === tab.id
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab tenant={tenant} />}
      {activeTab === "agreements" && <AgreementsTab agreements={tenant.agreements} />}
      {activeTab === "contacts" && <ContactsTab contacts={tenant.contacts} />}
      {activeTab === "activity" && <ActivityTab logs={auditLogs} />}
    </div>
  );
}

function OverviewTab({ tenant }: { tenant: AdminTenantDetail }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Company Details */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Company Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Company Name" value={tenant.companyName} />
          <Detail label="Slug" value={tenant.slug} mono />
          <Detail label="Business Category" value={tenant.businessCategory.replace(/_/g, " ")} />
          <Detail label="Subscription Tier" value={tenant.subscriptionTier} />
          <Detail label="Website" value={tenant.websiteUrl || "Not provided"} />
          <Detail label="Timezone" value={tenant.timezone} />
        </div>
      </div>

      {/* Technical Config */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Technical Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Country Code" value={tenant.countryCode} />
          <Detail label="Data Residency" value={tenant.dataResidencyRegion} />
          <Detail label="Identity Mode" value={tenant.identityMode.replace(/_/g, " ")} />
          <Detail label="Email Verified" value={tenant.emailVerified ? "Yes" : "No"} />
        </div>
      </div>

      {/* Timestamps */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 col-span-2">
        <h3 className="text-sm font-semibold text-slate-300">Timeline</h3>
        <div className="grid grid-cols-5 gap-4">
          <Detail label="Created" value={tenant.createdAt ? new Date(tenant.createdAt).toLocaleString() : "-"} />
          <Detail label="Last Updated" value={tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : "-"} />
          <Detail label="Activated" value={tenant.activatedAt ? new Date(tenant.activatedAt).toLocaleString() : "Not yet"} />
          <Detail label="Suspended" value={tenant.suspendedAt ? new Date(tenant.suspendedAt).toLocaleString() : "-"} />
          <Detail label="Terminated" value={tenant.terminatedAt ? new Date(tenant.terminatedAt).toLocaleString() : "-"} />
        </div>
      </div>
    </div>
  );
}

function AgreementsTab({ agreements }: { agreements: AdminTenantDetail["agreements"] }) {
  if (agreements.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No agreements submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agreements.map((a) => (
        <div key={a.agreementUid} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AgreementStatusBadge status={a.status} />
              <p className="text-xs font-mono text-slate-500">{a.agreementUid.slice(0, 16)}...</p>
            </div>
            <p className="text-xs text-slate-500">
              Signed {new Date(a.signedAt).toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Detail label="Terms Version" value={a.termsVersion} />
            <Detail label="Effective Date" value={a.effectiveDate} />
            <Detail label="Revenue Share" value={`${a.revenueSharePct}%`} />
            <Detail label="Settlement" value={a.settlementFrequency.replace(/_/g, " ")} />
            <Detail label="Signed By" value={`${a.signedByName} (${a.signedByEmail})`} />
            {a.signedByDesignation && <Detail label="Designation" value={a.signedByDesignation} />}
            {a.approvedByAdminId && <Detail label="Approved By" value={a.approvedByAdminId} />}
            {a.approvedAt && <Detail label="Approved At" value={new Date(a.approvedAt).toLocaleString()} />}
            {a.rejectionReason && (
              <div className="col-span-4">
                <Detail label="Rejection Reason" value={a.rejectionReason} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: AdminTenantDetail["contacts"] }) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {contacts.map((c, i) => (
        <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{c.contactName}</p>
              <p className="text-[10px] text-amber-400 font-medium">{c.role.replace(/_/g, " ")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Email" value={c.contactEmail} />
            <Detail label="Phone" value={c.contactPhone || "Not provided"} />
            <Detail label="Designation" value={c.designation || "Not provided"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ logs }: { logs: AuditLogItem[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ActionBadge action={log.action} />
              {log.actorRole && (
                <span className="text-[10px] text-slate-500">by {log.actorRole}</span>
              )}
            </div>
            {log.afterState && (
              <pre className="mt-1.5 text-[10px] text-slate-500 bg-slate-800/50 p-2 rounded-lg overflow-x-auto">
                {JSON.stringify(log.afterState, null, 2)}
              </pre>
            )}
          </div>
          <p className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">
            {new Date(log.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-200 mt-0.5 truncate">{value}</p>
      </div>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_EMAIL_VERIFICATION: { label: "Email Pending", cls: "text-slate-400 bg-slate-500/10 border-slate-600" },
    EMAIL_VERIFIED: { label: "Verified", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    AGREEMENT_PENDING: { label: "Awaiting Agreement", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    AGREEMENT_SIGNED: { label: "Under Review", cls: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    ACTIVE: { label: "Active", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    SUSPENDED: { label: "Suspended", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
    TERMINATED: { label: "Terminated", cls: "text-red-500 bg-red-500/10 border-red-500/20" },
  };
  const entry = map[status] ?? { label: status, cls: "text-slate-400 bg-slate-500/10 border-slate-600" };
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", entry.cls)}>
      {entry.label}
    </span>
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
    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", entry.cls)}>
      {entry.label}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    TENANT_REGISTERED: "text-blue-400 bg-blue-500/10",
    EMAIL_VERIFIED: "text-emerald-400 bg-emerald-500/10",
    AGREEMENT_SUBMITTED: "text-amber-400 bg-amber-500/10",
    AGREEMENT_APPROVED: "text-emerald-400 bg-emerald-500/10",
    AGREEMENT_REJECTED: "text-red-400 bg-red-500/10",
    IDENTITY_UPDATED: "text-purple-400 bg-purple-500/10",
  };
  const cls = colorMap[action] ?? "text-slate-400 bg-slate-500/10";
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cls)}>
      {action.replace(/_/g, " ")}
    </span>
  );
}
