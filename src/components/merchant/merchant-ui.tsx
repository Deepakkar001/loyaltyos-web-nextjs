"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MerchantPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-600" />
        {label}
      </div>
    </div>
  );
}

export function MerchantPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function MerchantPrimaryButton({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
        "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20",
        "transition-colors hover:bg-emerald-500"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
}

export function MerchantStatCard({
  label,
  value,
  icon: Icon,
  accent = "emerald",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "emerald" | "amber" | "violet" | "sky";
}) {
  const accents = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 ring-emerald-500/15",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 ring-amber-500/15",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 ring-violet-500/15",
    sky: "from-sky-500/10 to-sky-500/5 text-sky-600 ring-sky-500/15",
  };

  return (
    <Card className="overflow-hidden border-0 bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          </div>
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
              accents[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MerchantPanelCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-0 bg-[var(--surface-card)] shadow-[var(--shadow-card)]",
        className
      )}
    >
      {(title || description) && (
        <div className="border-b border-border/50 px-6 py-4">
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <CardContent className={cn(title || description ? "p-6" : "p-6")}>{children}</CardContent>
    </Card>
  );
}

export function MerchantEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionHref && actionLabel && (
        <div className="mt-6">
          <MerchantPrimaryButton href={actionHref}>{actionLabel}</MerchantPrimaryButton>
        </div>
      )}
    </div>
  );
}

export function MerchantStatusBadge({
  status,
  pending,
}: {
  status?: string;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
        Pending approval
      </span>
    );
  }

  const normalized = (status ?? "").toUpperCase();
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    PAUSED: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    ENDED: "bg-muted text-muted-foreground ring-border/60",
    DRAFT: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        styles[normalized] ?? "bg-muted text-muted-foreground ring-border/60"
      )}
    >
      {status ?? "—"}
    </span>
  );
}

export function MerchantAlertBanner({
  title,
  children,
  variant = "warning",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "warning" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 text-sm ring-1",
        variant === "warning"
          ? "bg-amber-500/8 text-amber-950 ring-amber-500/25 dark:text-amber-100"
          : "bg-sky-500/8 text-sky-950 ring-sky-500/25 dark:text-sky-100"
      )}
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-2 space-y-1 opacity-90">{children}</div>
    </div>
  );
}

export function MerchantOutlineButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border-border/70 bg-[var(--surface-card)] hover:bg-muted/50"
    >
      {children}
    </Button>
  );
}
