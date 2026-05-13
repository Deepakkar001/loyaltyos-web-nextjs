"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { onboardingApi, ApiError } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

export default function RulesSetupPage() {
  const router = useRouter();
  const { syncStatusFromBackend, onboardingStatus } = useOnboardingStore();
  const [loading, setLoading] = useState(false);

  const complete = async () => {
    setLoading(true);
    try {
      await onboardingApi.completeRulesSetup();
      syncStatusFromBackend("RULES_CONFIGURED");
      toast.success("Rules setup marked complete.");
      router.replace("/dashboard/integrate");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to update setup progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <p className="text-lg font-bold">Rules Setup</p>
        <p className="text-sm text-muted-foreground mt-2">
          Rule builder, rule list, simulation tool, and performance analytics will live here.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={complete}
            disabled={loading || onboardingStatus === "SANDBOX_TESTING" || onboardingStatus === "ACTIVE"}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {loading ? "Saving…" : "Continue to Integration"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.replace("/dashboard/loyalty-rules/create/basic-info")}
            disabled={loading}
          >
            Create first rule
          </Button>
          <p className="text-xs text-muted-foreground max-w-xl">
            This marks rules setup as complete for guided onboarding. You can still edit rules later from the Rules section.
          </p>
        </div>
      </Card>
    </div>
  );
}

