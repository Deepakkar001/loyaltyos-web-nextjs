"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "../FormField";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi, ApiError } from "@/lib/api/client";
import { OnboardingSelectOption, SettlementFrequency } from "@/types/onboarding";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Dropdown } from "@/components/common/Dropdown";
import { useRouter } from "next/navigation";

const schema = z.object({
  signedByName: z.string().min(2, "Full name is required"),
  signedByEmail: z.string().email("Enter a valid email"),
  signedByDesignation: z.string().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  revenueSharePct: z.number().min(0).max(100),
  settlementFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "T_PLUS_1"]),
  pointsCurrency: z.string().min(1, "Points currency is required"),
  expectedDailyTxnVolume: z.union([z.number().int().min(0), z.nan()]).optional(),
  billingContactName: z.string().max(255).optional().or(z.literal("")),
  billingAddress: z.string().max(2000).optional().or(z.literal("")),
  paymentMethod: z.string().optional().or(z.literal("")),
  contractDurationMonths: z.union([z.number().int().min(1).max(120), z.nan()]).optional(),
  autoRenewal: z.boolean().optional(),
  termsAccepted: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormData = z.infer<typeof schema>;

// All dropdown options are fetched from the metadata API

interface Step3AgreementProps {
  onBack?: () => void;
}

export function Step3Agreement({ onBack }: Step3AgreementProps) {
  const router = useRouter();
  const {
    tenantId,
    setAgreementData,
    setSubmitting,
    isSubmitting,
    syncStatusFromBackend,
  } = useOnboardingStore();

  const [settlementOptions, setSettlementOptions] = useState<OnboardingSelectOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<OnboardingSelectOption[]>([]);
  const [billingPaymentOptions, setBillingPaymentOptions] = useState<OnboardingSelectOption[]>([]);
  const [contractDurationOptions, setContractDurationOptions] = useState<OnboardingSelectOption[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const metadata = await onboardingApi.getMetadata();
        if (!mounted) return;
        setSettlementOptions(metadata.settlementFrequencies);
        setCurrencyOptions(metadata.currencies);
        setBillingPaymentOptions(metadata.billingPaymentMethods);
        setContractDurationOptions(metadata.contractDurations);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Failed to load dropdown options.");
      } finally {
        if (mounted) setMetadataLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenueSharePct: 2.5,
      settlementFrequency: "MONTHLY",
      pointsCurrency: "INR",
      contractDurationMonths: 12,
      autoRenewal: true,
    },
  });

  const settlementFrequency = watch("settlementFrequency");
  const autoRenewal = watch("autoRenewal");

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return;
    setSubmitting(true);
    try {
      await onboardingApi.submitMyAgreement({
        termsVersion: "v2.1",
        effectiveDate: data.effectiveDate,
        revenueSharePct: data.revenueSharePct,
        settlementFrequency: data.settlementFrequency as SettlementFrequency,
        pointsCurrency: data.pointsCurrency,
        expectedDailyTxnVolume: data.expectedDailyTxnVolume && !isNaN(data.expectedDailyTxnVolume) ? data.expectedDailyTxnVolume : undefined,
        billingContactName: data.billingContactName || undefined,
        billingAddress: data.billingAddress || undefined,
        paymentMethod: data.paymentMethod || undefined,
        contractDurationMonths: data.contractDurationMonths && !isNaN(data.contractDurationMonths) ? data.contractDurationMonths : undefined,
        autoRenewal: data.autoRenewal,
        signedByName: data.signedByName,
        signedByEmail: data.signedByEmail,
        signedByDesignation: data.signedByDesignation,
      });

      setAgreementData({
        signedByName: data.signedByName,
        settlementFrequency: data.settlementFrequency as SettlementFrequency,
      });

      syncStatusFromBackend("AGREEMENT_SIGNED");
      toast.success(
        "Agreement submitted for review. Our team will approve within 1 business day."
      );
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <StepHeader
        badge="Step 3 of 3"
        title="Commercial Agreement"
        description="Review and sign the commercial terms. Your programme cannot go live until this is approved by our team."
      />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <p className="font-medium text-sm text-slate-800">
            LoyaltyOS Standard Terms v2.1
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Last updated June 2025 · 12 pages
          </p>
          <button className="text-xs text-brand-600 hover:underline mt-1.5 font-medium">
            View full terms →
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Commercial Terms ── */}
        <div className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Commercial Terms
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Revenue Share %"
              htmlFor="revenueSharePct"
              error={errors.revenueSharePct?.message}
              hint="Platform fee as % of loyalty liability"
              required
            >
              <Input
                id="revenueSharePct"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register("revenueSharePct", { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="Settlement Frequency"
              htmlFor="settlementFrequency"
              error={errors.settlementFrequency?.message}
              required
            >
              <Dropdown
                id="settlementFrequency"
                value={settlementFrequency}
                disabled={metadataLoading}
                placeholder={metadataLoading ? "Loading..." : "Select frequency"}
                options={settlementOptions.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(v) =>
                  setValue(
                    "settlementFrequency",
                    v as "DAILY" | "WEEKLY" | "MONTHLY" | "T_PLUS_1",
                    { shouldValidate: true }
                  )
                }
                aria-invalid={!!errors.settlementFrequency}
              />
            </FormField>
          </div>

          <FormField
            label="Effective Date"
            htmlFor="effectiveDate"
            error={errors.effectiveDate?.message}
            required
          >
            <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
          </FormField>
        </div>

        {/* ── Financial & Billing ── */}
        <div className="space-y-5 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Financial & Billing
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Points / Rewards Currency" htmlFor="pointsCurrency" error={errors.pointsCurrency?.message} required hint="Currency for loyalty points valuation">
              <Controller control={control} name="pointsCurrency" render={({ field }) => (
                <Dropdown id="pointsCurrency" value={field.value} onChange={(v) => { field.onChange(v); }} onBlur={field.onBlur} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select currency"} options={currencyOptions.map((o) => ({ value: o.value, label: o.label }))} />
              )} />
            </FormField>

            <FormField label="Expected Daily Transactions" htmlFor="expectedDailyTxnVolume" error={errors.expectedDailyTxnVolume?.message} hint="Approximate volume for capacity planning">
              <Input id="expectedDailyTxnVolume" type="number" min="0" placeholder="10000" {...register("expectedDailyTxnVolume", { valueAsNumber: true })} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Billing Contact Name" htmlFor="billingContactName" error={errors.billingContactName?.message} hint="Person responsible for billing queries">
              <Input id="billingContactName" placeholder="Finance Manager name" {...register("billingContactName")} />
            </FormField>

            <FormField label="Payment Method" htmlFor="paymentMethod" error={errors.paymentMethod?.message} hint="Preferred payment for invoices">
              <Controller control={control} name="paymentMethod" render={({ field }) => (
                <Dropdown id="paymentMethod" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select method"} options={billingPaymentOptions.map((o) => ({ value: o.value, label: o.label }))} />
              )} />
            </FormField>
          </div>

          <FormField label="Billing Address" htmlFor="billingAddress" error={errors.billingAddress?.message} hint="For invoicing purposes">
            <Input id="billingAddress" placeholder="Invoice billing address" {...register("billingAddress")} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contract Duration" htmlFor="contractDurationMonths" error={errors.contractDurationMonths?.message} hint="Length of initial contract">
              <Controller control={control} name="contractDurationMonths" render={({ field }) => (
                <Dropdown id="contractDurationMonths" value={String(field.value ?? "12")} onChange={(v) => field.onChange(parseInt(v, 10))} onBlur={field.onBlur} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select duration"} options={contractDurationOptions.map((o) => ({ value: o.value, label: o.label }))} />
              )} />
            </FormField>

            <div className="flex items-end pb-1.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="autoRenewal"
                  checked={autoRenewal}
                  onCheckedChange={(v) => setValue("autoRenewal", !!v)}
                />
                <label htmlFor="autoRenewal" className="text-sm text-slate-700 cursor-pointer">
                  Auto-renewal at contract end
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Authorised Signatory ── */}
        <div className="space-y-5 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Authorised Signatory
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Full Legal Name"
              htmlFor="signedByName"
              error={errors.signedByName?.message}
              required
            >
              <Input
                id="signedByName"
                placeholder="Name as it appears on agreement"
                {...register("signedByName")}
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="signedByEmail"
              error={errors.signedByEmail?.message}
              required
            >
              <Input
                id="signedByEmail"
                type="email"
                {...register("signedByEmail")}
              />
            </FormField>
          </div>

          <FormField label="Designation" htmlFor="signedByDesignation">
            <Input
              id="signedByDesignation"
              placeholder="e.g. CEO, CTO, VP Operations"
              {...register("signedByDesignation")}
            />
          </FormField>
        </div>

        {/* ── Terms acceptance ── */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start gap-3">
            <Checkbox
              id="termsAccepted"
              onCheckedChange={(v) => setValue("termsAccepted", !!v)}
              className="mt-0.5"
            />
            <label
              htmlFor="termsAccepted"
              className="text-sm text-slate-600 cursor-pointer leading-relaxed"
            >
              I confirm that I am authorised to sign on behalf of my organisation
              and I agree to the{" "}
              <button
                type="button"
                className="text-brand-600 hover:underline font-medium"
              >
                LoyaltyOS Standard Terms v2.1
              </button>{" "}
              and{" "}
              <button
                type="button"
                className="text-brand-600 hover:underline font-medium"
              >
                Data Processing Agreement
              </button>
              .
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="text-xs text-red-600 mt-2 ml-7">
              {errors.termsAccepted.message}
            </p>
          )}
        </div>

        <StepActions
          onNext={handleSubmit(onSubmit)}
          onBack={onBack}
          isLoading={isSubmitting}
          nextLabel="Submit Agreement"
        />
      </form>
    </div>
  );
}
