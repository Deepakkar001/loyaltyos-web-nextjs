"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Store } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import {
  MERCHANT_ONBOARDING_STEPS,
  merchantOnboardingStepHref,
  merchantStageIndex,
} from "@/lib/merchants/onboarding-steps";
import type { MerchantOnboardingStage } from "@/types/merchant";
import { cn } from "@/lib/utils";

export function MerchantOnboardingShell({
  merchantUid,
  stage,
  merchantName,
  children,
}: {
  merchantUid: string;
  stage: MerchantOnboardingStage;
  merchantName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIdx = merchantStageIndex(stage);
  const activeSlug =
    MERCHANT_ONBOARDING_STEPS.find((s) => pathname.includes(`/${s.slug}`))?.slug ?? "register";
  const stepIndex = MERCHANT_ONBOARDING_STEPS.findIndex((s) => s.slug === activeSlug);
  const progressPct = Math.round(((stepIndex + 1) / MERCHANT_ONBOARDING_STEPS.length) * 100);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border/60 bg-[var(--surface-card)] lg:w-72 lg:border-b-0 lg:border-r">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Merchant onboarding
              </p>
              <p className="truncate text-sm font-semibold">{merchantName ?? merchantUid}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {MERCHANT_ONBOARDING_STEPS.map((step, idx) => {
              const done = idx < currentIdx || stage === "ACTIVE";
              const active = step.slug === activeSlug;
              const disabled = idx > currentIdx && stage !== "ACTIVE";
              const href = merchantOnboardingStepHref(merchantUid, step.slug);
              const content = (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active && "bg-primary/10 text-primary font-medium",
                    !active && !disabled && "text-muted-foreground hover:bg-muted/50",
                    disabled && "text-muted-foreground/50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      done && "border-emerald-500 bg-emerald-500 text-white",
                      active && !done && "border-primary bg-primary text-primary-foreground",
                      !done && !active && "border-border"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  {step.label}
                </div>
              );
              if (disabled) {
                return <div key={step.slug}>{content}</div>;
              }
              return (
                <Link key={step.slug} href={href}>
                  {content}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/dashboard/configure/merchants"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            ← Back to merchants
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border/60 bg-[var(--surface-card)] px-6 py-4">
          <div className="mx-auto max-w-2xl space-y-2">
            <p className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {MERCHANT_ONBOARDING_STEPS.length}
            </p>
            <Progress value={progressPct} className="h-2" />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
