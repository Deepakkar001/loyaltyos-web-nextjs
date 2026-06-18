"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantProfileView } from "@/components/dashboard/profile/TenantProfileView";
import { Step1Account } from "@/components/onboarding/steps/Step1Account";
import { onboardingApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { TenantStatusResponse } from "@/types/onboarding";

export default function TenantProfilePage() {
  const router = useRouter();
  const { accessToken, setRegistrationData } = useOnboardingStore();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<TenantStatusResponse | null>(null);

  const loadStatus = useCallback(async () => {
    const s = await onboardingApi.getMyStatus();
    setStatus(s);
    setRegistrationData({ companyName: s.companyName, email: s.email });
    return s;
  }, [setRegistrationData]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        await loadStatus();
      } catch (e: unknown) {
        if (mounted) {
          toast.error(e instanceof Error ? e.message : "Failed to load profile");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [accessToken, router, loadStatus]);

  const handleSaved = async () => {
    try {
      await loadStatus();
      setEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Profile saved but refresh failed");
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-8 lg:px-8">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="px-4 py-8 lg:px-8">
        <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
          <p className="text-sm font-semibold">Could not load profile</p>
          <Button className="mt-4 rounded-full" onClick={() => void loadStatus()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Profile</p>
          <p className="text-xs text-muted-foreground mt-1">
            Company and primary admin details for your tenant. Changes are saved to your account
            immediately.
          </p>
        </div>
        {!editing ? (
          <Button className="rounded-full gap-2" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit profile
          </Button>
        ) : null}
      </div>

      {editing ? (
        <Card className="rounded-2xl border border-border/70 bg-card/80 p-5 lg:p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Login email ({status.email}) and password cannot be changed here. Update company and
            contact fields below, then save.
          </p>
          <Step1Account
            embeddedProfile
            onProfileSaved={() => void handleSaved()}
            onCancelEdit={() => setEditing(false)}
          />
        </Card>
      ) : (
        <TenantProfileView status={status} />
      )}
    </div>
  );
}
