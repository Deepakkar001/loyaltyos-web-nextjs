"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { integrationApi, ApiError, onboardingApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useRouter } from "next/navigation";

type ApiKeyEnvironment = "SANDBOX" | "PRODUCTION";

type ApiKeySummary = {
  environment: ApiKeyEnvironment;
  keyUid: string;
  keyPrefix: string;
  createdAt?: string;
  lastUsedAt?: string | null;
};

type WebhookStatus = {
  endpointUrl: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED" | null;
  lastVerifiedAt: string | null;
};

type ValidateEventOk = {
  status: "VALID";
  tenantId: string;
  payload: Record<string, unknown>;
  schemaPresent: boolean;
};

type ValidateEventErr = Record<string, unknown>;

export default function IntegratePage() {
  const router = useRouter();
  const { tenantId, setGeneratedKeys } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<ApiKeySummary[] | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [payloadJson, setPayloadJson] = useState(
    JSON.stringify(
      {
        eventType: "PURCHASE",
        transactionId: "TXN_123",
        timestamp: new Date().toISOString(),
        amount: 1500.0,
      },
      null,
      2
    )
  );
  const [validationResult, setValidationResult] = useState<ValidateEventOk | ValidateEventErr | null>(null);

  const maskedSummaries = useMemo(() => summaries ?? [], [summaries]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = (await integrationApi.getCredentialSummaries()) as unknown;
        const w = (await integrationApi.getWebhookStatus()) as unknown;
        if (!alive) return;
        setSummaries(Array.isArray(s) ? (s as ApiKeySummary[]) : []);
        setWebhookStatus((w ?? null) as WebhookStatus | null);
      } catch {
        // non-blocking
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const generateSandboxLegacy = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await onboardingApi.generateSandboxKeys(tenantId);
      setGeneratedKeys(res);
      toast.success("Sandbox keys generated. Copy them now.");
      // Guided flow: integration started/completed enough to proceed to Go Live checklist.
      useOnboardingStore.getState().syncStatusFromBackend("SANDBOX_TESTING");
      router.replace("/dashboard/go-live");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateProduction = async () => {
    setLoading(true);
    try {
      const res = await integrationApi.generateProductionCredentials();
      setGeneratedKeys(res);
      toast.success("Production keys generated. Copy them now.");
      const s = (await integrationApi.getCredentialSummaries()) as unknown;
      setSummaries(Array.isArray(s) ? (s as ApiKeySummary[]) : []);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyWebhook = async () => {
    setLoading(true);
    try {
      const res = await integrationApi.verifyWebhook();
      setWebhookStatus(res as unknown as WebhookStatus);
      toast.success("Verification request sent");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateEvent = async () => {
    setLoading(true);
    try {
      const res = await integrationApi.validateSandboxEvent(payloadJson);
      setValidationResult(res as unknown as ValidateEventOk);
      toast.success("Payload is valid");
    } catch (err) {
      if (err instanceof ApiError) {
        setValidationResult((err.fieldErrors ?? { error: err.message }) as ValidateEventErr);
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6 space-y-8">
        <div>
          <p className="text-lg font-bold">Integrate</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate API credentials, verify your webhook, and validate a sample event payload.
          </p>
        </div>

        <section className="space-y-3">
          <p className="text-sm font-semibold">API Credentials</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateSandboxLegacy} disabled={loading || !tenantId} variant="outline">
              Generate Sandbox Keys (legacy)
            </Button>
            <Button onClick={generateProduction} disabled={loading} className="bg-brand-600 hover:bg-brand-700">
              Generate Production Keys
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {maskedSummaries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active keys yet.</p>
            ) : (
              maskedSummaries.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{s.environment}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.keyPrefix}•••••••• (prefix)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy(String(s.keyPrefix))}>
                    Copy prefix
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold">Webhook Verification</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium">Endpoint</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {webhookStatus?.endpointUrl ?? "Not configured"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Status: {webhookStatus?.verificationStatus ?? "PENDING"}
              </p>
            </div>
            <Button onClick={verifyWebhook} disabled={loading} variant="outline">
              Send verification
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: in this milestone, verification is a best-effort HTTP 200 check. HMAC signing will be enabled once secrets are backed by Vault.
          </p>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold">Sandbox Payload Validation</p>
          <div className="space-y-2">
            <textarea
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="w-full min-h-[160px] rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
            />
            <div className="flex items-center gap-2">
              <Button onClick={validateEvent} disabled={loading} variant="outline">
                Validate payload
              </Button>
            </div>
            {validationResult && (
              <pre className="text-xs rounded-xl border border-border bg-background p-3 overflow-auto">
                {JSON.stringify(validationResult, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </Card>
    </div>
  );
}

