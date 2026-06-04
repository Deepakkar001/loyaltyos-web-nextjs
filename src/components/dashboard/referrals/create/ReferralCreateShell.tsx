"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  REFERRAL_CREATE_BASE,
  REFERRAL_CREATE_STEPS,
  referralCreateStepIndexFromPath,
} from "@/lib/referrals/referral-create-steps";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";
import { cn } from "@/lib/utils";

export function ReferralCreateShell({
  stepIndex,
  children,
}: {
  stepIndex: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    programmeUid,
    setProgrammeUid,
    programmeOptions,
    programmesLoading,
    tenantId,
  } = useReferralProgramme();

  const resolvedIndex = useMemo(() => {
    const fromPath = referralCreateStepIndexFromPath(pathname);
    return fromPath >= 0 ? fromPath : stepIndex;
  }, [pathname, stepIndex]);

  const progressPct = Math.round(((resolvedIndex + 1) / REFERRAL_CREATE_STEPS.length) * 100);
  const stepMeta = REFERRAL_CREATE_STEPS[resolvedIndex] ?? REFERRAL_CREATE_STEPS[0];

  const programmeQuery = useMemo(() => {
    const q = searchParams.toString();
    return q ? `?${q}` : "";
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/dashboard/referrals/my-referrals"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to My Referrals
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            Create referral programme — Step {resolvedIndex + 1} of {REFERRAL_CREATE_STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{stepMeta.stepTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{stepMeta.subtitle}</p>
          <div className="mt-4 max-w-md">
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-72 shrink-0">
          <div className="space-y-1.5">
            <Label htmlFor="referral-wizard-programme" className="text-xs">
              Loyalty programme
            </Label>
            <NativeSelect
              id="referral-wizard-programme"
              ariaLabel="Loyalty programme for referral config"
              value={programmeUid}
              onChange={setProgrammeUid}
              options={
                programmeOptions.length > 0
                  ? programmeOptions
                  : [{ value: "default", label: "Default programme (default)" }]
              }
              disabled={programmesLoading || !tenantId}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full w-full sm:w-auto"
            onClick={() => router.push("/dashboard/referrals/my-referrals")}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {REFERRAL_CREATE_STEPS.map((s, idx) => {
            const active = idx === resolvedIndex;
            const done = idx < resolvedIndex;
            const href = `${REFERRAL_CREATE_BASE}/${s.slug}${programmeQuery}`;
            return (
              <li key={s.slug} className="min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "block w-full text-left rounded-xl border px-3 py-2 transition-colors",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100 dark:border-brand-700/50"
                      : done
                        ? "border-emerald-300/70 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/50"
                        : "border-border/70 bg-[var(--surface-sunken)] text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active
                          ? "bg-brand-600 text-white"
                          : done
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-foreground/70"
                      )}
                    >
                      {done ? "✓" : idx + 1}
                    </span>
                    <span className="text-sm font-semibold leading-tight">{s.label}</span>
                  </div>
                  <p className="mt-1 hidden text-[11px] text-muted-foreground sm:line-clamp-2">
                    {s.subtitle}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">{children}</div>
    </div>
  );
}
