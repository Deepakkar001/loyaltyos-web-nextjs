"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

import { stepHref, useRuleCreateFlow } from "./rule-create-flow";

export function CreateRuleShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onboardingStatus = useOnboardingStore((s) => s.onboardingStatus);
  const { basePath, cancelHref, shellLabel, steps } = useRuleCreateFlow();

  useEffect(() => {
    if (!onboardingStatus) return;
    if (onboardingStatus === "AGREEMENT_SIGNED") {
      router.replace("/dashboard/configure");
    }
  }, [onboardingStatus, router]);

  const stepIndex = useMemo(() => {
    const hit = steps.findIndex((s) => pathname.includes(`${basePath}/${s.slug}`));
    return hit >= 0 ? hit : 0;
  }, [pathname, basePath, steps]);

  const progressPct = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex, steps.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {shellLabel} — Step {stepIndex + 1} of {steps.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
          <div className="mt-3">
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {steps.map((s, idx) => {
          const active = idx === stepIndex;
          const done = idx < stepIndex;
          return (
            <Link
              key={s.slug}
              href={stepHref(basePath, s.slug)}
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
