"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MapPin, Phone, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { onboardingApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { TenantStatusResponse } from "@/types/onboarding";

export default function TenantProfilePage() {
  const router = useRouter();
  const { accessToken } = useOnboardingStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TenantStatusResponse | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const s = await onboardingApi.getMyStatus();
        if (!mounted) return;
        setStatus(s);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [accessToken, router]);

  if (loading) {
    return (
      <div className="px-4 py-8 lg:px-8">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Profile</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your tenant profile details captured during onboarding.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/onboarding")}>
          Edit in onboarding
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-border/70 bg-card/80 p-5 xl:col-span-2">
          <p className="text-sm font-semibold">Company</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info icon={Building2} label="Company Name" value={status?.companyName ?? "-"} />
            <Info icon={Mail} label="Email" value={status?.email ?? "-"} />
            <Info icon={MapPin} label="Country" value={status?.countryCode ?? "-"} />
            <Info icon={MapPin} label="HQ Address" value={status?.headquartersAddress ?? "-"} />
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/70 bg-card/80 p-5">
          <p className="text-sm font-semibold">Primary Admin</p>
          <div className="mt-4 space-y-3 text-sm">
            <Info icon={User} label="Name" value={status?.primaryContactName ?? "-"} />
            <Info icon={Mail} label="Email" value={status?.primaryContactEmail ?? "-"} />
            <Info icon={Phone} label="Phone" value={status?.primaryContactPhone ?? "-"} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

