"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { FileText, Loader2 } from "lucide-react";

import { Authorize } from "@/components/access/authorize";
import { Dropdown } from "@/components/common/Dropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardingApi } from "@/lib/api/client";
import { merchantApi } from "@/lib/api/merchant";
import { buildAgreementFormValues } from "@/lib/merchants/agreement-form-values";
import { merchantContinueHref } from "@/lib/merchants/onboarding-steps";
import { useMerchantOnboarding } from "@/lib/merchants/onboarding-context";
import { MERCHANT_SETTLEMENT_CYCLES } from "@/lib/merchants/settlement-cycles";
import type { MerchantAgreementPrefill } from "@/types/merchant";
import type { OnboardingSelectOption } from "@/types/onboarding";

const MERCHANT_TERMS_VERSION = "v1.0-merchant";

const schema = z.object({
  effectiveDate: z.string().min(1, "Effective date is required"),
  revenueSharePct: z.number().min(0).max(100),
  settlementCycle: z.string().min(1),
  pointsCurrency: z.string().min(1),
  expectedDailyTxnVolume: z.union([z.number().int().min(0), z.nan()]).optional(),
  billingContactName: z.string().max(255).optional().or(z.literal("")),
  billingAddress: z.string().max(2000).optional().or(z.literal("")),
  paymentMethod: z.string().optional().or(z.literal("")),
  contractDurationMonths: z.number().int().min(1).max(120),
  autoRenewal: z.boolean().optional(),
  proposedEarnRateMultiplier: z.number().min(0.5).max(10),
  merchantFundedCampaignsAllowed: z.boolean(),
  signedByName: z.string().min(2, "Signatory name is required"),
  signedByEmail: z.string().email("Valid email required"),
  signedByDesignation: z.string().optional().or(z.literal("")),
  termsAccepted: z.boolean().refine((v) => v, "You must accept the terms"),
});

type FormData = z.infer<typeof schema>;

export function MerchantAgreementStepForm({ merchantUid }: { merchantUid: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { merchant, refreshMerchant } = useMerchantOnboarding();
  const [prefill, setPrefill] = useState<MerchantAgreementPrefill | null>(null);
  const [savedAgreement, setSavedAgreement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currencyOptions, setCurrencyOptions] = useState<OnboardingSelectOption[]>([]);
  const [billingPaymentOptions, setBillingPaymentOptions] = useState<OnboardingSelectOption[]>([]);
  const [contractDurationOptions, setContractDurationOptions] = useState<OnboardingSelectOption[]>([]);
  const [contactEmailConflict, setContactEmailConflict] = useState<string | null>(null);
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [contactEmailSaving, setContactEmailSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenueSharePct: 2.5,
      settlementCycle: "MONTHLY",
      pointsCurrency: "INR",
      contractDurationMonths: 12,
      autoRenewal: true,
      proposedEarnRateMultiplier: 1.5,
      merchantFundedCampaignsAllowed: true,
      termsAccepted: false,
    },
  });

  const autoRenewal = watch("autoRenewal");
  const merchantCampaigns = watch("merchantFundedCampaignsAllowed");
  const settlementCycle = watch("settlementCycle");
  const termsAccepted = watch("termsAccepted");

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const [p, metadata, agreement] = await Promise.all([
          merchantApi.agreementPrefill(merchantUid),
          onboardingApi.getMetadata(),
          merchantApi.getAgreement(merchantUid),
        ]);
        setPrefill(p);
        setSavedAgreement(!!agreement || p.hasExistingAgreement);
        setCurrencyOptions(metadata.currencies);
        setBillingPaymentOptions(metadata.billingPaymentMethods);
        setContractDurationOptions(metadata.contractDurations);
        reset(buildAgreementFormValues(p, agreement));
        const contactEmail = p.contactEmail ?? agreement?.signedByEmail ?? "";
        if (contactEmail) {
          setContactEmailDraft(contactEmail);
          const contactCheck = await merchantApi.checkEmail(contactEmail, merchantUid);
          if (!contactCheck.available) {
            setContactEmailConflict(
              contactCheck.message ??
                "Merchant contact email conflicts with an existing tenant or merchant account."
            );
          } else {
            setContactEmailConflict(null);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load agreement form");
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantUid, pathname, reset]);

  async function saveContactEmail() {
    setContactEmailSaving(true);
    try {
      const updated = await merchantApi.updateContact(merchantUid, contactEmailDraft.trim());
      setPrefill((prev) => (prev ? { ...prev, contactEmail: updated.contactEmail ?? contactEmailDraft } : prev));
      setValue("signedByEmail", updated.contactEmail ?? contactEmailDraft);
      const check = await merchantApi.checkEmail(contactEmailDraft.trim(), merchantUid);
      if (!check.available) {
        setContactEmailConflict(check.message ?? "This contact email is not available.");
      } else {
        setContactEmailConflict(null);
        toast.success("Contact email updated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contact email");
    } finally {
      setContactEmailSaving(false);
    }
  }

  async function onSubmit(data: FormData) {
    const portalEmail = contactEmailDraft.trim();
    if (!portalEmail) {
      toast.error("Portal contact email is required.");
      return;
    }
    const contactCheck = await merchantApi.checkEmail(portalEmail, merchantUid);
    if (!contactCheck.available) {
      const message =
        contactCheck.message ??
        "Merchant contact email conflicts with an existing tenant or merchant account.";
      setContactEmailConflict(message);
      toast.error(message);
      return;
    }
    setContactEmailConflict(null);
    setSubmitting(true);
    try {
      const updated = await merchantApi.submitAgreement(merchantUid, {
        termsVersion: MERCHANT_TERMS_VERSION,
        effectiveDate: data.effectiveDate,
        revenueSharePct: data.revenueSharePct,
        settlementCycle: data.settlementCycle,
        pointsCurrency: data.pointsCurrency,
        expectedDailyTxnVolume:
          data.expectedDailyTxnVolume && !Number.isNaN(data.expectedDailyTxnVolume)
            ? data.expectedDailyTxnVolume
            : undefined,
        billingContactName: data.billingContactName || undefined,
        billingAddress: data.billingAddress || undefined,
        paymentMethod: data.paymentMethod || undefined,
        contractDurationMonths: data.contractDurationMonths,
        autoRenewal: data.autoRenewal,
        proposedEarnRateMultiplier: data.proposedEarnRateMultiplier,
        merchantFundedCampaignsAllowed: data.merchantFundedCampaignsAllowed,
        signedByName: data.signedByName,
        signedByEmail: data.signedByEmail,
        signedByDesignation: data.signedByDesignation || undefined,
        termsAccepted: true,
        portalContactEmail: portalEmail,
      });
      setPrefill((prev) => (prev ? { ...prev, contactEmail: portalEmail } : prev));
      toast.success(savedAgreement ? "Partner agreement updated" : "Partner agreement recorded");
      await refreshMerchant();
      const nextStage = updated.onboardingStage ?? merchant?.onboardingStage ?? "AGREEMENT";
      router.push(merchantContinueHref(merchantUid, nextStage));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit agreement";
      if (message.toLowerCase().includes("email")) {
        setContactEmailConflict(message);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !prefill) {
    return <p className="text-sm text-muted-foreground">Loading agreement form…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner agreement</CardTitle>
        <CardDescription>
          Record commercial terms for this merchant. Requires{" "}
          <span className="font-medium">merchants.approve</span> permission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {savedAgreement && (
          <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-emerald-800 dark:text-emerald-200">
            Agreement on file — fields below reflect your saved submission. You can review or update
            and continue.
          </p>
        )}
        {contactEmailConflict && (
          <p className="text-sm text-destructive">{contactEmailConflict}</p>
        )}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Legal name</p>
            <p className="font-medium">{prefill.legalName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax ID</p>
            <p className="font-medium">{prefill.taxId ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="font-medium">{prefill.category ?? "—"}</p>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="portal-contact-email">Portal contact email *</Label>
            <p className="text-xs text-muted-foreground">
              Used for merchant portal login. Must be unique — not your tenant admin or team user email.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="portal-contact-email"
                type="email"
                value={contactEmailDraft}
                onChange={(e) => {
                  setContactEmailDraft(e.target.value);
                  if (contactEmailConflict) setContactEmailConflict(null);
                }}
                placeholder="partner@merchant.com"
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  contactEmailSaving ||
                  !contactEmailDraft.trim() ||
                  contactEmailDraft.trim().toLowerCase() === (prefill.contactEmail ?? "").trim().toLowerCase()
                }
                onClick={() => void saveContactEmail()}
              >
                {contactEmailSaving ? "Saving…" : "Save contact email"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm">LoyaltyOS Merchant Partner Terms {MERCHANT_TERMS_VERSION}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Commercial terms are stored in your tenant records (same pattern as tenant onboarding).
            </p>
          </div>
        </div>

        <Authorize
          permission="merchants.approve"
          fallback={
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              Agreement submission requires merchants.approve. Ask a finance or programme approver.
            </p>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Commercial terms
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="revenueSharePct">Revenue share % *</Label>
                  <Input
                    id="revenueSharePct"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    {...register("revenueSharePct", { valueAsNumber: true })}
                  />
                  {errors.revenueSharePct && (
                    <p className="text-xs text-destructive">{errors.revenueSharePct.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settlementCycle">Settlement cycle *</Label>
                  <Dropdown
                    id="settlementCycle"
                    value={settlementCycle}
                    options={[...MERCHANT_SETTLEMENT_CYCLES]}
                    onChange={(v) => setValue("settlementCycle", v, { shouldValidate: true })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="effectiveDate">Effective date *</Label>
                  <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
                  {errors.effectiveDate && (
                    <p className="text-xs text-destructive">{errors.effectiveDate.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proposedEarnRateMultiplier">Proposed earn rate (×) *</Label>
                  <Input
                    id="proposedEarnRateMultiplier"
                    type="number"
                    step="0.1"
                    min={0.5}
                    max={10}
                    {...register("proposedEarnRateMultiplier", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Synced to merchant profile on submit (0.5–10×)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="merchantFundedCampaignsAllowed"
                  checked={merchantCampaigns}
                  onCheckedChange={(v) => setValue("merchantFundedCampaignsAllowed", !!v)}
                />
                <Label htmlFor="merchantFundedCampaignsAllowed" className="text-sm font-normal cursor-pointer">
                  Merchant-funded campaigns allowed
                </Label>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Financial & billing
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pointsCurrency">Points currency *</Label>
                  <Controller
                    control={control}
                    name="pointsCurrency"
                    render={({ field }) => (
                      <Dropdown
                        id="pointsCurrency"
                        value={field.value}
                        options={currencyOptions.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={field.onChange}
                        placeholder="Select currency"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expectedDailyTxnVolume">Expected daily transactions</Label>
                  <Input
                    id="expectedDailyTxnVolume"
                    type="number"
                    min={0}
                    placeholder="10000"
                    {...register("expectedDailyTxnVolume", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="billingContactName">Billing contact</Label>
                  <Input
                    id="billingContactName"
                    placeholder="Finance manager name"
                    {...register("billingContactName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Dropdown
                        id="paymentMethod"
                        value={field.value ?? ""}
                        options={billingPaymentOptions.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={field.onChange}
                        placeholder="Select method"
                      />
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingAddress">Billing address</Label>
                <Input
                  id="billingAddress"
                  placeholder="Invoice billing address"
                  {...register("billingAddress")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contractDurationMonths">Contract duration (months) *</Label>
                  <Controller
                    control={control}
                    name="contractDurationMonths"
                    render={({ field }) => (
                      <Dropdown
                        id="contractDurationMonths"
                        value={String(field.value)}
                        options={contractDurationOptions.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        onChange={(v) => field.onChange(parseInt(v, 10))}
                      />
                    )}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="autoRenewal"
                      checked={autoRenewal}
                      onCheckedChange={(v) => setValue("autoRenewal", !!v)}
                    />
                    <Label htmlFor="autoRenewal" className="text-sm font-normal cursor-pointer">
                      Auto-renewal at contract end
                    </Label>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Authorised signatory (merchant partner)
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signedByName">Full legal name *</Label>
                  <Input
                    id="signedByName"
                    placeholder="Name as on agreement"
                    {...register("signedByName")}
                  />
                  {errors.signedByName && (
                    <p className="text-xs text-destructive">{errors.signedByName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signedByEmail">Email *</Label>
                  <Input id="signedByEmail" type="email" {...register("signedByEmail")} />
                  <p className="text-xs text-muted-foreground">
                    Legal signatory for the agreement (can differ from portal login email).
                  </p>
                  {errors.signedByEmail && (
                    <p className="text-xs text-destructive">{errors.signedByEmail.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signedByDesignation">Designation</Label>
                <Input
                  id="signedByDesignation"
                  placeholder="e.g. Director, Authorized Signatory"
                  {...register("signedByDesignation")}
                />
              </div>
            </section>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="termsAccepted"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setValue("termsAccepted", !!v, { shouldValidate: true })}
                />
                <Label htmlFor="termsAccepted" className="text-sm font-normal leading-relaxed cursor-pointer">
                  I confirm I am authorised to sign on behalf of the programme and the merchant partner
                  agrees to LoyaltyOS Merchant Partner Terms {MERCHANT_TERMS_VERSION}.
                </Label>
              </div>
              {errors.termsAccepted && (
                <p className="text-xs text-destructive mt-2 ml-7">{errors.termsAccepted.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="rounded-full"
              disabled={submitting || !!contactEmailConflict || !contactEmailDraft.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedAgreement ? (
                "Update agreement & continue"
              ) : (
                "Submit agreement & continue"
              )}
            </Button>
          </form>
        </Authorize>
      </CardContent>
    </Card>
  );
}
