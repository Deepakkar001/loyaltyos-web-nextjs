"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  integrationDashboardApi,
  type ApiKeyEnvironment,
  type AuditLogEntry,
  type CredentialSummary,
  type DashboardOverview,
} from "@/lib/api/integrationDashboard";
import type { ApiKeyGeneratedResponse } from "@/types/onboarding";
import { GenerateCredentialModal } from "@/components/integration/GenerateCredentialModal";
import { RevealSecretModal } from "@/components/integration/RevealSecretModal";
import { UsageStatistics } from "@/components/integration/UsageStatistics";

export default function IntegrationDashboardPage() {
  const [tab, setTab] = useState<ApiKeyEnvironment>("SANDBOX");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof integrationDashboardApi.getStatistics>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<ApiKeyGeneratedResponse | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [revealModal, setRevealModal] = useState<{ open: boolean; secret: string | null; prefix: string }>({
    open: false,
    secret: null,
    prefix: "",
  });

  const refresh = useCallback(async () => {
    try {
      const [o, c, a, s] = await Promise.all([
        integrationDashboardApi.getOverview(),
        integrationDashboardApi.listCredentials("all"),
        integrationDashboardApi.getRecentActivity(),
        integrationDashboardApi.getStatistics(),
      ]);
      setOverview(o);
      setCredentials(c);
      setActivity(a);
      setStats(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load integration data");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = credentials.filter(
    (c) => c.status === "ACTIVE" && c.environment === tab
  );

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const onGenerate = async () => {
    setLoading(true);
    try {
      const res = await integrationDashboardApi.generateCredentials(tab);
      setGenerated(res);
      setShowGenerateModal(true);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const onReveal = async (keyId: string, prefix: string) => {
    try {
      const res = await integrationDashboardApi.revealSecret(keyId);
      setRevealModal({ open: true, secret: res.signingSecret, prefix });
      toast.success(res.warning);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reveal failed");
    }
  };

  const onRotate = async (keyId: string) => {
    if (!confirm("Rotate key? Old key will be revoked.")) return;
    setLoading(true);
    try {
      const res = await integrationDashboardApi.rotateCredential(keyId);
      setGenerated(res);
      setShowGenerateModal(true);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rotate failed");
    } finally {
      setLoading(false);
    }
  };

  const onRevoke = async (keyId: string) => {
    if (!confirm("Revoke this API key?")) return;
    try {
      await integrationDashboardApi.revokeCredential(keyId);
      toast.success("Key revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integration Settings</h1>
          <p className="text-sm text-muted-foreground">
            API keys, HMAC signing, and request audit for external systems.
          </p>
        </div>
        <Link href="/dashboard/integration/audit-logs" className="text-sm text-primary underline">
          View full audit log
        </Link>
      </div>

      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Requests (24h)</p>
            <p className="text-2xl font-semibold">{overview.totalRequestsLast24h}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Success rate</p>
            <p className="text-2xl font-semibold">
              {overview.totalRequestsLast24h === 0
                ? "—"
                : `${(100 - Number(overview.errorRate)).toFixed(1)}%`}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Avg latency</p>
            <p className="text-2xl font-semibold">{overview.avgResponseTime}ms</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">P99 latency</p>
            <p className="text-2xl font-semibold">{overview.p99ResponseTime}ms</p>
          </Card>
        </div>
      )}

      {stats && (
        <UsageStatistics
          totalRequests={stats.totalRequests}
          successful={stats.successful}
          failed={stats.failed}
          successRate={Number(stats.successRate)}
          avgLatency={stats.latency?.avg ?? 0}
          p99Latency={stats.latency?.p99 ?? 0}
          errorBreakdown={stats.errorBreakdown}
        />
      )}

      <Card className="p-6 space-y-4">
        <div className="flex gap-2">
          {(["SANDBOX", "PRODUCTION"] as ApiKeyEnvironment[]).map((env) => (
            <Button
              key={env}
              variant={tab === env ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(env)}
            >
              {env}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active {tab.toLowerCase()} credentials.</p>
        ) : (
          filtered.map((cred) => (
            <div key={cred.keyId} className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{cred.keyPrefix}…</p>
                  <p className="text-xs text-muted-foreground">
                    Created {cred.createdAt ? new Date(cred.createdAt).toLocaleString() : "—"}
                    {cred.lastUsedAt && ` · Last used ${new Date(cred.lastUsedAt).toLocaleString()}`}
                    {cred.requestCountLast24h != null && ` · ${cred.requestCountLast24h} req/24h`}
                  </p>
                </div>
                <span className="text-xs text-green-600">{cred.status}</span>
              </div>
              <p className="text-sm font-mono text-muted-foreground">Secret: {cred.secretMasked}</p>
              {!cred.secretRetrievable && (
                <p className="text-xs text-amber-600">Rotate required to enable HMAC verification.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReveal(cred.keyId, cred.keyPrefix)}
                  disabled={!cred.secretRetrievable}
                >
                  Reveal secret
                </Button>
                <Button size="sm" variant="outline" onClick={() => onRotate(cred.keyId)}>
                  Rotate
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onRevoke(cred.keyId)}>
                  Revoke
                </Button>
              </div>
            </div>
          ))
        )}

        <Button onClick={onGenerate} disabled={loading}>
          Generate new {tab.toLowerCase()} credentials
        </Button>
        <p className="text-xs text-amber-600">
          Generating new credentials revokes previous active keys for this environment.
        </p>
      </Card>

      <GenerateCredentialModal
        open={showGenerateModal}
        credentials={generated}
        onClose={() => {
          setShowGenerateModal(false);
          setGenerated(null);
        }}
        onCopy={copy}
      />

      <RevealSecretModal
        open={revealModal.open}
        secret={revealModal.secret}
        keyPrefix={revealModal.prefix}
        onClose={() => setRevealModal({ open: false, secret: null, prefix: "" })}
        onCopy={copy}
      />

      <Card className="p-6 space-y-3">
        <h2 className="font-medium">How to integrate</h2>
        <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
          <li>Copy API key and signing secret above.</li>
          <li>Compute HMAC-SHA256 of the request body with the signing secret.</li>
          <li>
            POST to{" "}
            <code className="text-xs">/api/v1/integration/&#123;tenantId&#125;/events/process</code>
          </li>
          <li>
            Headers: <code className="text-xs">Authorization: Bearer los_…</code>,{" "}
            <code className="text-xs">X-LoyaltyOS-Signature: sha256=…</code>
          </li>
        </ol>
        <p className="text-xs">
          See <code>docs/INTEGRATION_API_GUIDE.md</code> and Postman collection under <code>docs/postman/</code>.
        </p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-medium">Recent API activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 border-b pb-2">
                <span>
                  {new Date(a.createdAt).toLocaleString()} · {a.httpMethod} {a.requestPath}
                </span>
                <span className={a.httpStatus >= 400 ? "text-red-600" : "text-green-600"}>
                  {a.httpStatus} · {a.processingTimeMs}ms
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
