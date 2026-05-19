"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CAMPAIGN_CREATE_STEPS } from "@/lib/campaigns/campaign-form";
import { cn } from "@/lib/utils";

const BASE = "/dashboard/campaigns/create";

export function CreateCampaignShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const stepIndex = useMemo(() => {
    const hit = CAMPAIGN_CREATE_STEPS.findIndex((s) => pathname.includes(`${BASE}/${s.slug}`));
    return hit >= 0 ? hit : 0;
  }, [pathname]);

  const progressPct = useMemo(
    () => Math.round(((stepIndex + 1) / CAMPAIGN_CREATE_STEPS.length) * 100),
    [stepIndex]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard/campaigns" className="text-sm text-muted-foreground hover:underline">
            ← Back to campaigns
          </Link>
          <p className="text-xs text-muted-foreground mt-3">
            Create Campaign — Step {stepIndex + 1} of {CAMPAIGN_CREATE_STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
          <div className="mt-3">
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full shrink-0"
          onClick={() => router.push("/dashboard/campaigns")}
        >
          Cancel
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CAMPAIGN_CREATE_STEPS.map((s, idx) => {
          const active = idx === stepIndex;
          const done = idx < stepIndex;
          const href = `${BASE}/${s.slug}`;
          return (
            <Link
              key={s.slug}
              href={href}
              className={cn(
                "text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors",
                active
                  ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary-soft)]"
                  : done
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
                    : "bg-[var(--surface-sunken)] text-muted-foreground border-border hover:text-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
