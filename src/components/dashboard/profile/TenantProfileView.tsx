"use client";

import {
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TenantStatusResponse } from "@/types/onboarding";

function formatEnum(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPayments(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value
    .split(",")
    .filter(Boolean)
    .map((v) => formatEnum(v))
    .join(", ");
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
        {label}
      </p>
      <div className="mt-1 flex items-start gap-2">
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : null}
        <p className="text-sm font-medium break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/80 p-5 space-y-4">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </Card>
  );
}

export function TenantProfileView({ status }: { status: TenantStatusResponse }) {
  const industryLabel =
    status.businessCategoryLabel ?? formatEnum(status.businessCategory);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {formatEnum(status.onboardingStatus)}
          </Badge>
          {status.businessCategoryStatus && status.businessCategoryStatus !== "APPROVED" ? (
            <Badge variant="outline" className="rounded-full border-amber-300 text-amber-800">
              Industry: {formatEnum(status.businessCategoryStatus)}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Tenant ID: {status.tenantId} · Login email: {status.email}
        </p>
      </Card>

      <Section title="Company information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={Building2} label="Company name" value={status.companyName} />
          <Field label="Legal business name" value={status.legalBusinessName ?? "—"} />
          <Field label="Business registration no." value={status.businessRegistrationNo ?? "—"} />
          <Field label="Industry" value={industryLabel} />
          <Field label="Sub-category" value={status.subCategory ?? "—"} />
          <Field label="Business model" value={formatEnum(status.businessModel)} />
          <Field
            label="Number of locations"
            value={
              status.numberOfLocations != null ? String(status.numberOfLocations) : "—"
            }
          />
          <Field icon={MapPin} label="Country" value={status.countryCode ?? "—"} />
          <Field label="Timezone" value={status.timezone ?? "—"} />
          <Field icon={MapPin} label="Headquarters address" value={status.headquartersAddress ?? "—"} />
          <Field icon={Globe} label="Website" value={status.websiteUrl ?? "—"} />
          <Field label="Founder / owner names" value={status.founderNames ?? "—"} />
          <Field icon={Calendar} label="Year founded" value={status.yearFounded != null ? String(status.yearFounded) : "—"} />
          <Field label="Annual revenue" value={formatEnum(status.annualRevenueRange)} />
          <Field
            label="Customer base size"
            value={status.customerBaseSize != null ? String(status.customerBaseSize) : "—"}
          />
          <Field label="Payment methods accepted" value={formatPayments(status.paymentMethodsAccepted)} />
        </div>
      </Section>

      <Section title="Primary admin contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={User} label="Full name" value={status.primaryContactName ?? "—"} />
          <Field icon={Mail} label="Contact email" value={status.primaryContactEmail ?? "—"} />
          <Field icon={Phone} label="Phone" value={status.primaryContactPhone ?? "—"} />
          <Field label="Designation" value={status.primaryContactDesignation ?? "—"} />
        </div>
      </Section>

      <Section title="Programme & compliance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Identity mode" value={formatEnum(status.identityMode)} />
          <Field label="Data residency" value={status.dataResidencyRegion ?? "—"} />
          <Field label="Subscription tier" value={formatEnum(status.subscriptionTier)} />
          <Field label="Email verified" value={status.emailVerified ? "Yes" : "No"} />
        </div>
      </Section>
    </div>
  );
}
