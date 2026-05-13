"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { ApiError, goLiveApi } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

type GoLiveChecklistItem = {
  item: string;
  status: "COMPLETE" | "PENDING" | "MISSING" | "FAILED";
  required: boolean;
  details?: string | null;
};

type GoLiveChecklist = {
  canGoLive: boolean;
  items: GoLiveChecklistItem[];
};

type GoLiveActivate = {
  tenantId: string;
  activatedAt: string;
  message: string;
};

export default function GoLivePage() {
  const router = useRouter();
  const { syncStatusFromBackend } = useOnboardingStore();
  const [checklist, setChecklist] = useState<GoLiveChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState<GoLiveActivate | null>(null);

  const load = async () => {
    const res = (await goLiveApi.getChecklist()) as unknown;
    setChecklist(res as GoLiveChecklist);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const activate = async () => {
    setLoading(true);
    try {
      const res = (await goLiveApi.activate()) as unknown;
      setActivated(res as GoLiveActivate);
      toast.success("Activated");
      syncStatusFromBackend("ACTIVE");
      await load();
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6 space-y-6">
        <div>
          <p className="text-lg font-bold">Go Live</p>
          <p className="text-sm text-muted-foreground mt-1">
            Review your pre-flight checklist and activate your programme when ready.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Pre-flight Checklist</p>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {checklist?.items ? (
            <div className="space-y-2">
              {checklist.items.map((it, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {it.item} {it.required ? <span className="text-[10px] text-muted-foreground">(required)</span> : null}
                    </p>
                    {it.details ? <p className="text-[11px] text-muted-foreground mt-1">{it.details}</p> : null}
                  </div>
                  <span className="text-[11px] font-semibold">
                    {it.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading checklist…</p>
          )}

          <div className="pt-2">
            <Button
              onClick={activate}
              disabled={loading || !checklist?.canGoLive}
              className="w-full bg-brand-600 hover:bg-brand-700"
            >
              Activate My Programme
            </Button>
            {!checklist?.canGoLive ? (
              <p className="text-xs text-muted-foreground mt-2">
                Complete all required items before activation.
              </p>
            ) : null}
          </div>
        </section>

        {activated ? (
          <section className="space-y-2">
            <p className="text-sm font-semibold">Activation</p>
            <pre className="text-xs rounded-xl border border-border bg-background p-3 overflow-auto">
              {JSON.stringify(activated, null, 2)}
            </pre>
          </section>
        ) : null}
      </Card>
    </div>
  );
}

