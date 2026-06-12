"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Store,
  Users,
} from "lucide-react";

import { MerchantDetailPanel } from "@/components/dashboard/merchants/MerchantDetailPanel";
import { MerchantStageBadge } from "@/components/dashboard/merchants/MerchantStageBadge";
import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { merchantApi } from "@/lib/api/merchant";
import { cn } from "@/lib/utils";
import type { CampaignResponse } from "@/types/campaigns";
import type {
  CreateMerchantRequest,
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantIntegrationTestRequest,
  MerchantOnboardingAudit,
  MerchantOnboardingStage,
  MerchantResponse,
} from "@/types/merchant";

const CATEGORY_OPTIONS = [
  { value: "RETAIL", label: "Retail" },
  { value: "FOOD", label: "Food & beverage" },
  { value: "TRAVEL", label: "Travel" },
  { value: "FINTECH", label: "Fintech" },
  { value: "HEALTH", label: "Health & wellness" },
  { value: "OTHER", label: "Other" },
];

const STAGE_FILTER_OPTIONS: Array<{ value: MerchantOnboardingStage | "ALL"; label: string }> = [
  { value: "ALL", label: "All stages" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "AGREEMENT", label: "Agreement" },
  { value: "CONFIGURATION", label: "Configuration" },
  { value: "INTEGRATION", label: "Integration" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

const DEFAULT_INTEGRATION_TEST: MerchantIntegrationTestRequest = {
  customerId: "sandbox-customer-1",
  eventType: "PURCHASE",
  amount: 100,
  channel: "sandbox",
};

const EMPTY_FORM: CreateMerchantRequest = {
  legalName: "",
  category: "RETAIL",
  contactEmail: "",
  taxId: "",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="border-border/70 bg-[var(--surface-card)]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MerchantManagementPanel() {
  const [merchants, setMerchants] = useState<MerchantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [activateResult, setActivateResult] = useState<MerchantActivateResponse | null>(null);
  const [pendingCampaigns, setPendingCampaigns] = useState<CampaignResponse[]>([]);
  const [auditTrail, setAuditTrail] = useState<MerchantOnboardingAudit[]>([]);
  const [apiKeys, setApiKeys] = useState<MerchantApiKeyResponse[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [integrationTest, setIntegrationTest] = useState<MerchantIntegrationTestRequest>(
    DEFAULT_INTEGRATION_TEST
  );
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<MerchantOnboardingStage | "ALL">("ALL");
  const [form, setForm] = useState<CreateMerchantRequest>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pending] = await Promise.all([
        merchantApi.list(),
        merchantApi.listPendingCampaignApprovals().catch(() => []),
      ]);
      setMerchants(list);
      setPendingCampaigns(pending);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedUid) {
      setAuditTrail([]);
      setApiKeys([]);
      setNewApiKey(null);
      return;
    }
    void merchantApi.audit(selectedUid).then(setAuditTrail).catch(() => setAuditTrail([]));
    void merchantApi.listApiKeys(selectedUid).then(setApiKeys).catch(() => setApiKeys([]));
  }, [selectedUid]);

  const stats = useMemo(
    () => ({
      total: merchants.length,
      active: merchants.filter((m) => m.active).length,
      onboarding: merchants.filter((m) => !m.active && m.onboardingStage !== "SUSPENDED").length,
      pendingApprovals: pendingCampaigns.length,
    }),
    [merchants, pendingCampaigns]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merchants.filter((m) => {
      if (stageFilter !== "ALL" && m.onboardingStage !== stageFilter) return false;
      if (!q) return true;
      return (
        m.legalName.toLowerCase().includes(q) ||
        m.merchantUid.toLowerCase().includes(q) ||
        (m.contactEmail?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [merchants, query, stageFilter]);

  const selected = merchants.find((m) => m.merchantUid === selectedUid) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setRegisterSubmitting(true);
    try {
      const created = await merchantApi.create(form);
      toast.success(`Merchant ${created.merchantUid} registered`);
      setForm(EMPTY_FORM);
      setRegisterOpen(false);
      await load();
      setSelectedUid(created.merchantUid);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setRegisterSubmitting(false);
    }
  }

  async function runStep(
    action: () => Promise<MerchantResponse | MerchantActivateResponse>,
    label: string
  ) {
    if (!selectedUid) return;
    setActionLoading(true);
    try {
      const result = await action();
      if ("temporaryPassword" in result && result.temporaryPassword) {
        setActivateResult(result as MerchantActivateResponse);
      }
      toast.success(label);
      await load();
      setAuditTrail(await merchantApi.audit(selectedUid).catch(() => []));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            Merchants
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Onboard coalition partners, run integration tests, and approve merchant-funded campaigns.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Authorize permission="merchants.create">
          <Authorize permission="merchants.create">
            <Button size="sm" className="rounded-full" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register merchant
            </Button>
          </Authorize>
          </Authorize>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total merchants"
          value={stats.total}
          icon={Users}
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          label="Active & live"
          value={stats.active}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="In onboarding"
          value={stats.onboarding}
          icon={Clock}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Campaign approvals"
          value={stats.pendingApprovals}
          icon={Building2}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Pending campaign approvals */}
      {pendingCampaigns.length > 0 && (
        <Card className="border-border/70 bg-[var(--surface-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <h2 className="text-sm font-semibold">Pending campaign approvals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Merchant-funded campaigns awaiting your review before going live.
            </p>
          </div>
          <ul className="divide-y divide-border/60">
            {pendingCampaigns.map((c) => (
              <li
                key={c.campaignUid}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {c.merchantId} · {c.campaignUid}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={async () => {
                      try {
                        await merchantApi.rejectCampaign(c.campaignUid);
                        toast.success("Campaign rejected");
                        await load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Reject failed");
                      }
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={async () => {
                      try {
                        await merchantApi.approveCampaign(c.campaignUid);
                        toast.success("Campaign approved");
                        await load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Approve failed");
                      }
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="merchant-search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="merchant-search"
                className="pl-9"
                placeholder="Search by name, ID, or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Onboarding stage</Label>
            <NativeSelect
              ariaLabel="Filter by stage"
              value={stageFilter}
              onChange={(v) => setStageFilter(v as MerchantOnboardingStage | "ALL")}
              options={STAGE_FILTER_OPTIONS}
            />
          </div>
        </div>
      </Card>

      {/* Main content */}
      {loading ? (
        <Card className="p-12 border-border/70 bg-[var(--surface-card)] flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 border-border/70 bg-[var(--surface-card)] text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            <Store className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">
            {merchants.length === 0 ? "No merchants yet" : "No merchants match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {merchants.length === 0
              ? "Register your first coalition partner to start onboarding."
              : "Try adjusting search or stage filters."}
          </p>
          {merchants.length === 0 && (
            <Button className="rounded-full mt-5" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Register merchant
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3 border-border/70 bg-[var(--surface-card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 min-w-[200px]">Merchant</th>
                    <th className="px-4 py-3 min-w-[100px]">Category</th>
                    <th className="px-4 py-3 min-w-[120px]">Stage</th>
                    <th className="px-4 py-3 min-w-[80px]">Earn rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.merchantUid}
                      className={cn(
                        "border-b border-border/40 last:border-0 cursor-pointer transition-colors",
                        selectedUid === m.merchantUid
                          ? "bg-primary/5 hover:bg-primary/8"
                          : "hover:bg-muted/20"
                      )}
                      onClick={() => {
                        setSelectedUid(m.merchantUid);
                        setActivateResult(null);
                        setNewApiKey(null);
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.legalName}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">
                          {m.merchantUid}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.category ?? "—"}</td>
                      <td className="px-4 py-3">
                        <MerchantStageBadge stage={m.onboardingStage} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {m.earnRateMultiplier != null ? `${m.earnRateMultiplier}×` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="xl:col-span-2">
            {selected ? (
              <MerchantDetailPanel
                merchant={selected}
                activateResult={activateResult}
                integrationTest={integrationTest}
                onIntegrationTestChange={setIntegrationTest}
                auditTrail={auditTrail}
                apiKeys={apiKeys}
                newApiKey={newApiKey}
                onNewApiKey={setNewApiKey}
                onApiKeysChange={setApiKeys}
                onRunStep={runStep}
                actionLoading={actionLoading}
              />
            ) : (
              <Card className="border-border/70 bg-[var(--surface-card)] p-8 text-center h-full min-h-[320px] flex flex-col items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Select a merchant</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Choose a row to manage onboarding, API keys, and audit history.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Register dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register merchant</DialogTitle>
            <DialogDescription>
              Add a new coalition partner. They will progress through agreement, configuration, and
              integration before going live.
            </DialogDescription>
          </DialogHeader>
          <form id="register-merchant-form" onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="legal-name">Legal name</Label>
              <Input
                id="legal-name"
                required
                placeholder="Acme Retail Pvt Ltd"
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name (optional)</Label>
              <Input
                id="display-name"
                placeholder="Acme Stores"
                value={form.displayName ?? ""}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <NativeSelect
                id="category"
                ariaLabel="Merchant category"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Contact email</Label>
              <Input
                id="contact-email"
                type="email"
                required
                placeholder="partner@acme.com"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-id">Tax ID</Label>
              <Input
                id="tax-id"
                required
                placeholder="GSTIN / EIN"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="register-merchant-form" disabled={registerSubmitting} className="rounded-full">
              {registerSubmitting ? "Registering…" : "Register merchant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
