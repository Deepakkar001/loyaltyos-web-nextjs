"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, UserCheck, Globe } from "lucide-react";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi } from "@/lib/api/client";
import { DataResidencyRegion, IdentityMode } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const IDENTITY_OPTIONS: {
  value: IdentityMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}[] = [
  {
    value: "FULL_PROFILE",
    title: "Full Customer Profiles",
    description:
      "Collect name, email, and phone. All notification channels available. Best for retail and hospitality.",
    icon: <UserCheck className="w-5 h-5" />,
    recommended: true,
  },
  {
    value: "ID_ONLY",
    title: "Anonymous ID Only",
    description:
      "Send only a customer ID. No PII collected. Points and tiers work normally. Best for fintech and gaming.",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    value: "BOTH",
    title: "Flexible (Both Modes)",
    description:
      "Start anonymous and upgrade to full profile later. Best for platforms with varying user consent.",
    icon: <Globe className="w-5 h-5" />,
  },
];

const REGION_OPTIONS: {
  value: DataResidencyRegion;
  label: string;
  flag: string;
}[] = [
  { value: "IN", label: "India (Mumbai)", flag: "🇮🇳" },
  { value: "US", label: "United States (AWS)", flag: "🇺🇸" },
  { value: "EU", label: "EU (Frankfurt, GDPR)", flag: "🇪🇺" },
  { value: "APAC", label: "Asia Pacific", flag: "🌏" },
];

interface Step2IdentityProps {
  onBack?: () => void;
  onContinue?: () => void;
  editMode?: boolean;
}

export function Step2Identity({ onBack, onContinue, editMode = false }: Step2IdentityProps) {
  const { tenantId, accessToken, isSubmitting, syncStatusFromBackend } =
    useOnboardingStore();
  const [selectedMode, setSelectedMode] = useState<IdentityMode>("FULL_PROFILE");
  const [selectedRegion, setSelectedRegion] =
    useState<DataResidencyRegion>("IN");
  const [emailVerified, setEmailVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const status = await onboardingApi.getMyStatus();
        setEmailVerified(!!status.emailVerified);
        if (!editMode) {
          syncStatusFromBackend(status.onboardingStatus);
        }
        // Pre-fill saved values
        if (status.identityMode) setSelectedMode(status.identityMode);
        if (status.dataResidencyRegion) setSelectedRegion(status.dataResidencyRegion);
      } catch {
        // non-blocking
      } finally {
      }
    })();
  }, [tenantId, accessToken, syncStatusFromBackend, editMode]);

  const handleContinue = async () => {
    if (!emailVerified) {
      toast("Please verify your email first.", { icon: "📧" });
      return;
    }

    setSaving(true);
    try {
      await onboardingApi.updateMyIdentity({
        identityMode: selectedMode,
        dataResidencyRegion: selectedRegion,
      });

      if (editMode) {
        toast.success("Settings updated.");
        onContinue?.();
      } else {
        syncStatusFromBackend("AGREEMENT_PENDING");
      }
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <StepHeader
        badge={editMode ? "Editing Step 2" : "Step 2 of 3"}
        title={editMode ? "Edit programme type" : "Verify your email & choose programme type"}
        description={
          editMode
            ? "Update your identity mode and data residency settings."
            : "Check your inbox and select how your customers will be identified in the platform."
        }
      />

      {(emailVerified || editMode) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              How will you identify your customers?
            </h3>
            <div className="space-y-3">
              {IDENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedMode(opt.value)}
                  className={cn(
                    "w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200",
                    selectedMode === opt.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-200 hover:border-brand-200 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      selectedMode === opt.value
                        ? "bg-brand-500 text-white"
                        : "bg-surface-100 text-slate-500"
                    )}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">
                        {opt.title}
                      </span>
                      {opt.recommended && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center",
                      selectedMode === opt.value
                        ? "border-brand-500 bg-brand-500"
                        : "border-slate-300"
                    )}
                  >
                    {selectedMode === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              Data Residency Region
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Choose where your customer data is stored. This cannot be changed
              after activation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {REGION_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRegion(r.value)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left",
                    selectedRegion === r.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-200 hover:border-brand-200 bg-white"
                  )}
                >
                  <span className="text-2xl">{r.flag}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <StepActions
            onNext={handleContinue}
            onBack={onBack}
            isLoading={saving || isSubmitting}
            nextLabel={editMode ? "Save & Continue" : "Continue"}
          />
        </motion.div>
      )}
    </div>
  );
}
