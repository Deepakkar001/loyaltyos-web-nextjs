"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Key,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi, ApiError } from "@/lib/api/client";
import toast from "react-hot-toast";

function SecretField({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  const [visible, setVisible] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">{description}</span>
      </div>
      <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-4 py-3 font-mono">
        <span className="flex-1 text-emerald-400 text-sm truncate">
          {visible ? value : "•".repeat(Math.min(value.length, 48))}
        </span>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={copy}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function Step5Integration() {
  const {
    tenantId,
    generatedKeys,
    setGeneratedKeys,
    isSubmitting,
    syncStatusFromBackend,
  } = useOnboardingStore();
  const [generating, setGenerating] = useState(false);

  const handleGenerateKeys = async () => {
    if (!tenantId) return;
    setGenerating(true);
    try {
      const keys = await onboardingApi.generateSandboxKeys(tenantId);
      setGeneratedKeys(keys);
      toast.success("Sandbox API keys generated!");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleContinue = () => {
    if (!generatedKeys) {
      toast("Please generate your API keys first.", { icon: "🔑" });
      return;
    }
    syncStatusFromBackend("ACTIVE");
  };

  return (
    <div>
      <StepHeader
        badge="Step 5 of 6"
        title="API Keys & Integration"
        description="Generate your sandbox credentials and connect your first event source."
      />

      <div className="space-y-6">
        {!generatedKeys ? (
          <div className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-6 h-6 text-brand-500" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">
              Generate your sandbox API keys
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              These keys let you send test events to LoyaltyOS from your backend.
              Sandbox data never affects production.
            </p>
            <Button
              onClick={handleGenerateKeys}
              disabled={generating}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {generating ? "Generating…" : "Generate Sandbox Keys"}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Save these credentials now
                </p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  These keys are shown <strong>once only</strong>. We do not store
                  them. Copy both values to a secure location (e.g. your team&apos;s
                  password manager) before continuing.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <SecretField
                label="API Key"
                value={generatedKeys.apiKey}
                description="Include in X-API-Key header"
              />
              <SecretField
                label="Signing Secret"
                value={generatedKeys.signingSecret}
                description="For HMAC-SHA256 webhook signature"
              />

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline" className="text-xs font-mono border-slate-300">
                  Prefix: {generatedKeys.keyPrefix}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50"
                >
                  SANDBOX
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Quick-start — Send your first event
              </p>
              <div className="bg-slate-950 rounded-xl p-5 overflow-x-auto">
                <pre className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre">{`curl -X POST https://api.loyaltyos.io/v1/${tenantId}/events \\
  -H \"X-API-Key: ${generatedKeys.keyPrefix}...\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"externalId\": \"customer_001\",
    \"eventType\": \"PURCHASE\",
    \"amount\": 1500.00,
    \"currency\": \"INR\",
    \"transactionId\": \"TXN_001\"
  }'`}</pre>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-4">
              <Webhook className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Your webhook endpoint
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  LoyaltyOS will POST real-time events (points earned, tier changed)
                  to your server. Include the signing secret to verify payloads
                  using HMAC-SHA256.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <StepActions
        onNext={handleContinue}
        isLoading={isSubmitting}
        nextLabel={generatedKeys ? "Complete Setup →" : "Skip for Now"}
      />
    </div>
  );
}

