"use client";

import { cn } from "@/lib/utils";
import { analyticsPanel, analyticsStatCard } from "@/lib/analytics/analytics-ui";

export function AnalyticsPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(analyticsPanel, className)}>{children}</div>;
}

export function AnalyticsStatCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(analyticsStatCard, className)}>{children}</div>;
}