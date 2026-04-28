"use client";

import { useEffect, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { FormField } from "../FormField";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi, ApiError } from "@/lib/api/client";
import { OnboardingSelectOption, RegisterTenantRequest } from "@/types/onboarding";
import toast from "react-hot-toast";
import { Dropdown } from "@/components/common/Dropdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const COMMON_FIELDS = {
  companyName: z.string().min(2, "Minimum 2 characters").max(255),
  legalBusinessName: z.string().max(255).optional().or(z.literal("")),
  businessRegistrationNo: z.string().max(100).optional().or(z.literal("")),
  businessCategory: z.string().min(1, "Select an industry"),
  customBusinessCategory: z.string().max(100).optional(),
  subCategory: z.string().max(100).optional().or(z.literal("")),
  businessModel: z.string().optional().or(z.literal("")),
  numberOfLocations: z.union([z.number().int().min(0), z.nan()]).optional(),
  countryCode: z.string().length(2, "Select a country"),
  headquartersAddress: z.string().max(2000).optional().or(z.literal("")),
  founderNames: z.string().max(500).optional().or(z.literal("")),
  yearFounded: z.union([z.number().int().min(1800).max(2030), z.nan()]).optional(),
  annualRevenueRange: z.string().optional().or(z.literal("")),
  customerBaseSize: z.union([z.number().int().min(0), z.nan()]).optional(),
  paymentMethodsAccepted: z.string().optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL starting with http:// or https://").optional().or(z.literal("")),
  timezone: z.string().optional(),
  primaryContactName: z.string().min(2, "Contact name is required"),
  primaryContactEmail: z.string().email("Enter a valid email"),
  primaryContactPhone: z.string().optional(),
  primaryContactDesignation: z.string().optional(),
};

const registerSchema = z
  .object({
    ...COMMON_FIELDS,
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => d.businessCategory !== "OTHER" || (d.customBusinessCategory && d.customBusinessCategory.trim().length >= 2),
    { message: "Please enter your industry name (at least 2 characters)", path: ["customBusinessCategory"] }
  );

const editSchema = z
  .object(COMMON_FIELDS)
  .refine(
    (d) => d.businessCategory !== "OTHER" || (d.customBusinessCategory && d.customBusinessCategory.trim().length >= 2),
    { message: "Please enter your industry name (at least 2 characters)", path: ["customBusinessCategory"] }
  );

type RegisterFormData = z.infer<typeof registerSchema>;
type EditFormData = z.infer<typeof editSchema>;

const INDUSTRY_EMOJI: Record<string, string> = {
  RETAIL: "🛍️", ECOMMERCE: "🛒", FINTECH: "💳", HOSPITALITY: "🏨",
  GAMING: "🎮", HEALTHCARE: "🏥", TELECOM: "📡", OTHER: "⚙️",
};

const COUNTRY_EMOJI: Record<string, string> = {
  IN: "🇮🇳", US: "🇺🇸", GB: "🇬🇧", SG: "🇸🇬", AE: "🇦🇪", AU: "🇦🇺",
};

// These are now fetched from the /metadata API — no hardcoded options

interface Step1AccountProps {
  editMode?: boolean;
  onContinue?: () => void;
}

export function Step1Account({ editMode = false, onContinue }: Step1AccountProps) {
  const {
    setTenantId, setRegistrationData, syncStatusFromBackend, setAccessToken,
    setSubmitting, isSubmitting, setSubmitError, email: storeEmail,
  } = useOnboardingStore();

  const [industryOptions, setIndustryOptions] = useState<OnboardingSelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<OnboardingSelectOption[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<OnboardingSelectOption[]>([]);
  const [businessModelOptions, setBusinessModelOptions] = useState<OnboardingSelectOption[]>([]);
  const [revenueOptions, setRevenueOptions] = useState<OnboardingSelectOption[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<OnboardingSelectOption[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(editMode);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [registerPassword, setRegisterPassword] = useState<string | null>(null);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });
  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) });
  const form = (editMode ? editForm : registerForm) as unknown as UseFormReturn<FieldValues>;
  const { register, handleSubmit, control, setValue, watch, formState: { errors }, reset } = form;

  const timezoneValue = watch("timezone", "");
  const selectedCategory = watch("businessCategory", "");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const metadata = await onboardingApi.getMetadata();
        if (!mounted) return;
        setIndustryOptions(metadata.businessCategories);
        setCountryOptions(metadata.countries);
        setTimezoneOptions(metadata.timezones);
        setBusinessModelOptions(metadata.businessModels);
        setRevenueOptions(metadata.annualRevenueRanges);
        setPaymentMethodOptions(metadata.paymentMethodsAccepted);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Failed to load dropdown options. Please refresh.");
      } finally {
        if (mounted) setMetadataLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!editMode) return;
    let mounted = true;
    (async () => {
      try {
        const s = await onboardingApi.getMyStatus();
        if (!mounted) return;
        const payments = s.paymentMethodsAccepted ? s.paymentMethodsAccepted.split(",").filter(Boolean) : [];
        setSelectedPayments(payments);
        reset({
          companyName: s.companyName ?? "",
          legalBusinessName: s.legalBusinessName ?? "",
          businessRegistrationNo: s.businessRegistrationNo ?? "",
          businessCategory: s.businessCategory ?? "",
          subCategory: s.subCategory ?? "",
          businessModel: s.businessModel ?? "",
          numberOfLocations: s.numberOfLocations ?? undefined,
          countryCode: s.countryCode ?? "",
          headquartersAddress: s.headquartersAddress ?? "",
          founderNames: s.founderNames ?? "",
          yearFounded: s.yearFounded ?? undefined,
          annualRevenueRange: s.annualRevenueRange ?? "",
          customerBaseSize: s.customerBaseSize ?? undefined,
          paymentMethodsAccepted: s.paymentMethodsAccepted ?? "",
          websiteUrl: s.websiteUrl ?? "",
          timezone: s.timezone ?? "",
          primaryContactName: s.primaryContactName ?? "",
          primaryContactEmail: s.primaryContactEmail ?? "",
          primaryContactPhone: s.primaryContactPhone ?? "",
          primaryContactDesignation: s.primaryContactDesignation ?? "",
        });
      } catch {
        toast.error("Could not load current profile data.");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [editMode, reset]);

  const togglePayment = (method: string) => {
    setSelectedPayments((prev) => {
      const next = prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method];
      setValue("paymentMethodsAccepted", next.join(","));
      return next;
    });
  };

  type ProfilePayload = Omit<
    RegisterTenantRequest,
    "email" | "password" | "identityMode" | "dataResidencyRegion"
  >;

  const buildProfilePayload = (data: RegisterFormData | EditFormData): ProfilePayload => ({
    companyName: data.companyName,
    legalBusinessName: data.legalBusinessName || undefined,
    businessRegistrationNo: data.businessRegistrationNo || undefined,
    businessCategory: data.businessCategory,
    customBusinessCategory: data.businessCategory === "OTHER" ? data.customBusinessCategory : undefined,
    subCategory: data.subCategory || undefined,
    businessModel: data.businessModel || undefined,
    numberOfLocations: data.numberOfLocations && !isNaN(data.numberOfLocations) ? data.numberOfLocations : undefined,
    countryCode: data.countryCode,
    headquartersAddress: data.headquartersAddress || undefined,
    founderNames: data.founderNames || undefined,
    yearFounded: data.yearFounded && !isNaN(data.yearFounded) ? data.yearFounded : undefined,
    annualRevenueRange: data.annualRevenueRange || undefined,
    customerBaseSize: data.customerBaseSize && !isNaN(data.customerBaseSize) ? data.customerBaseSize : undefined,
    paymentMethodsAccepted: data.paymentMethodsAccepted || undefined,
    websiteUrl: data.websiteUrl || undefined,
    timezone: data.timezone || undefined,
    primaryContactName: data.primaryContactName,
    primaryContactEmail: data.primaryContactEmail,
    primaryContactPhone: data.primaryContactPhone,
    primaryContactDesignation: data.primaryContactDesignation,
  });

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await onboardingApi.register({
        ...buildProfilePayload(data),
        email: data.email,
        password: data.password,
        identityMode: "FULL_PROFILE",
        dataResidencyRegion: "IN",
      });
      setTenantId(response.tenantId);
      setRegistrationData({ companyName: data.companyName, email: data.email });
      syncStatusFromBackend(response.onboardingStatus);
      setVerifyEmail(data.email);
      setRegisterPassword(data.password);
      setVerifyCode("");
      setVerifyOpen(true);
      toast.success("Account created! We emailed you a 6-digit verification code.");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, msg]) => toast.error(`${field}: ${msg}`));
        } else toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (data: EditFormData) => {
    setSaving(true);
    try {
      await onboardingApi.updateMyProfile(buildProfilePayload(data));
      setRegistrationData({ companyName: data.companyName });
      toast.success("Profile updated successfully.");
      onContinue?.();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitHandler = async (values: FieldValues) => {
    if (editMode) {
      await onEditSubmit(values as EditFormData);
      return;
    }
    await onRegisterSubmit(values as RegisterFormData);
  };

  const submitVerificationCode = async () => {
    if (!verifyEmail) return;
    const code = verifyCode.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code from your email."); return; }
    setVerifySubmitting(true);
    try {
      const wantsReset = resetPwdOpen && resetPassword.trim().length > 0;
      if (wantsReset && resetPassword.trim().length < 12) {
        toast.error("Password must be at least 12 characters.");
        return;
      }
      if (wantsReset && resetPassword !== resetPasswordConfirm) {
        toast.error("Passwords do not match.");
        return;
      }

      await onboardingApi.verifyEmailCode(
        verifyEmail,
        code,
        wantsReset ? resetPassword : undefined
      );
      toast.success("Email verified.");
      setVerifyOpen(false);
      const passwordToUse = wantsReset ? resetPassword : registerPassword;
      if (passwordToUse) {
        const auth = await onboardingApi.login(verifyEmail, passwordToUse);
        setAccessToken(auth.accessToken);
        setTenantId(auth.tenantId);
        syncStatusFromBackend(auth.onboardingStatus);
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Verification failed. Please try again.");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!verifyEmail) return;
    setResendSubmitting(true);
    try {
      await onboardingApi.resendVerification(verifyEmail);
      toast.success("A new code has been sent.");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Could not resend code. Please try again.");
    } finally {
      setResendSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Loading profile...</span>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        badge={editMode ? "Editing Step 1" : "Step 1 of 3"}
        title={editMode ? "Edit account details" : "Set up your account"}
        description={
          editMode
            ? "Review and update your company information and contact details."
            : "Create your LoyaltyOS account with your company profile."
        }
      />

      {editMode && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-sm">&#9998;</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Edit Mode</p>
              <p className="text-xs text-blue-600">Email and password cannot be changed here.</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(submitHandler)} className="space-y-6">

        {/* ── Company Information ── */}
        <div className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Company Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company Name" htmlFor="companyName" error={errors.companyName?.message as string} required>
              <Input id="companyName" placeholder="Acme Retail India" {...register("companyName")} />
            </FormField>
            <FormField label="Legal Business Name" htmlFor="legalBusinessName" error={errors.legalBusinessName?.message as string} hint="As per KYC / legal documents">
              <Input id="legalBusinessName" placeholder="Acme Retail India Pvt. Ltd." {...register("legalBusinessName")} />
            </FormField>
          </div>

          <FormField label="Business Registration Number" htmlFor="businessRegistrationNo" error={errors.businessRegistrationNo?.message as string} hint="GST / Tax ID for regulatory compliance">
            <Input id="businessRegistrationNo" placeholder="18AABCD1234H1Z0" {...register("businessRegistrationNo")} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry" htmlFor="businessCategory" error={errors.businessCategory?.message as string} required>
              <Controller control={control} name="businessCategory" render={({ field }) => (
                <Dropdown id="businessCategory" value={field.value} onChange={(v) => { field.onChange(v); if (v !== "OTHER") setValue("customBusinessCategory", ""); }} onBlur={field.onBlur} disabled={metadataLoading || industryOptions.length === 0} placeholder={metadataLoading ? "Loading..." : "Select industry"} options={industryOptions.map((c) => ({ value: c.value, label: (INDUSTRY_EMOJI[c.value] ?? "🏢") + "  " + c.label }))} aria-invalid={!!errors.businessCategory} />
              )} />
            </FormField>
            <FormField label="Sub-Category" htmlFor="subCategory" error={errors.subCategory?.message as string} hint="e.g. Coffee Chains, Apparel, Grocery">
              <Input id="subCategory" placeholder="Coffee Chains, Apparel..." {...register("subCategory")} />
            </FormField>
          </div>

          {selectedCategory === "OTHER" && (
            <FormField label="Your Industry" htmlFor="customBusinessCategory" error={errors.customBusinessCategory?.message as string} required hint="This will be added for future tenants">
              <Input id="customBusinessCategory" placeholder="e.g. Logistics, EdTech, Agriculture..." {...register("customBusinessCategory")} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Business Model" htmlFor="businessModel" error={errors.businessModel?.message as string}>
              <Controller control={control} name="businessModel" render={({ field }) => (
                <Dropdown id="businessModel" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select model"} options={businessModelOptions.map((o) => ({ value: o.value, label: o.label }))} />
              )} />
            </FormField>
            <FormField label="Number of Locations" htmlFor="numberOfLocations" error={errors.numberOfLocations?.message as string} hint="Stores, branches, outlets">
              <Input id="numberOfLocations" type="number" min="0" placeholder="50" {...register("numberOfLocations", { valueAsNumber: true })} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="countryCode" error={errors.countryCode?.message as string} required>
              <Controller control={control} name="countryCode" render={({ field }) => (
                <Dropdown id="countryCode" value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={metadataLoading || countryOptions.length === 0} placeholder={metadataLoading ? "Loading..." : "Select country"} options={countryOptions.map((c) => ({ value: c.value, label: (COUNTRY_EMOJI[c.value] ?? "") + "  " + c.label }))} aria-invalid={!!errors.countryCode} />
              )} />
            </FormField>
            <FormField label="Timezone" htmlFor="timezone" error={errors.timezone?.message as string} hint="Defaults to UTC">
              <Dropdown id="timezone" value={timezoneValue ?? ""} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select timezone"} options={timezoneOptions.map((o) => ({ value: o.value, label: o.label }))} onChange={(v) => setValue("timezone", v)} />
            </FormField>
          </div>

          <FormField label="Headquarters Address" htmlFor="headquartersAddress" error={errors.headquartersAddress?.message as string} hint="Full address for legal correspondence">
            <Input id="headquartersAddress" placeholder="123 MG Road, Bangalore, Karnataka 560001, India" {...register("headquartersAddress")} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Website URL" htmlFor="websiteUrl" error={errors.websiteUrl?.message as string}>
              <Input id="websiteUrl" type="url" placeholder="https://yourcompany.com" {...register("websiteUrl")} />
            </FormField>
            <FormField label="Founder / Owner Names" htmlFor="founderNames" error={errors.founderNames?.message as string} hint="Comma-separated for multiple">
              <Input id="founderNames" placeholder="Rajesh Kumar, Priya Singh" {...register("founderNames")} />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Year Founded" htmlFor="yearFounded" error={errors.yearFounded?.message as string}>
              <Input id="yearFounded" type="number" min="1800" max="2030" placeholder="2015" {...register("yearFounded", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Annual Revenue" htmlFor="annualRevenueRange" error={errors.annualRevenueRange?.message as string}>
              <Controller control={control} name="annualRevenueRange" render={({ field }) => (
                <Dropdown id="annualRevenueRange" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} disabled={metadataLoading} placeholder={metadataLoading ? "Loading..." : "Select range"} options={revenueOptions.map((o) => ({ value: o.value, label: o.label }))} />
              )} />
            </FormField>
            <FormField label="Customer Base Size" htmlFor="customerBaseSize" error={errors.customerBaseSize?.message as string}>
              <Input id="customerBaseSize" type="number" min="0" placeholder="100000" {...register("customerBaseSize", { valueAsNumber: true })} />
            </FormField>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Methods Accepted</label>
            <p className="text-xs text-slate-400 mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {paymentMethodOptions.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => togglePayment(pm.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedPayments.includes(pm.value)
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Login Credentials (register only) ── */}
        {!editMode && (
          <div className="space-y-5 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Login Credentials</h3>
            <FormField label="Business Email" htmlFor="email" error={errors.email?.message as string} required>
              <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Password" htmlFor="password" error={errors.password?.message as string} hint="Minimum 12 characters" required>
                <Input id="password" type="password" placeholder="••••••••••••" {...register("password")} />
              </FormField>
              <FormField label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword?.message as string} required>
                <Input id="confirmPassword" type="password" placeholder="••••••••••••" {...register("confirmPassword")} />
              </FormField>
            </div>
          </div>
        )}

        {editMode && storeEmail && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Login Email (read-only)</p>
            <p className="text-sm text-slate-700 font-medium">{storeEmail}</p>
          </div>
        )}

        {/* ── Primary Contact ── */}
        <div className="space-y-5 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Primary Admin Contact</h3>
          <p className="text-xs text-slate-400">This person will receive platform alerts, billing notices, and API key information.</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" htmlFor="primaryContactName" error={errors.primaryContactName?.message as string} required>
              <Input id="primaryContactName" placeholder="Raj Sharma" {...register("primaryContactName")} />
            </FormField>
            <FormField label="Contact Email" htmlFor="primaryContactEmail" error={errors.primaryContactEmail?.message as string} required>
              <Input id="primaryContactEmail" type="email" placeholder="raj@company.com" {...register("primaryContactEmail")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone Number" htmlFor="primaryContactPhone" error={errors.primaryContactPhone?.message as string}>
              <Input id="primaryContactPhone" placeholder="+91 99999 99999" {...register("primaryContactPhone")} />
            </FormField>
            <FormField label="Designation" htmlFor="primaryContactDesignation">
              <Input id="primaryContactDesignation" placeholder="CTO, VP Engineering..." {...register("primaryContactDesignation")} />
            </FormField>
          </div>
        </div>

        <StepActions
          onNext={handleSubmit(submitHandler)}
          isLoading={editMode ? saving : isSubmitting}
          nextLabel={editMode ? "Save & Continue" : "Create Account"}
        />
      </form>

      {!editMode && (
        <Dialog
          open={verifyOpen}
          onOpenChange={(open) => {
            // Keep OTP verification modal open unless we close it explicitly
            // (e.g. after successful verification).
            if (open) setVerifyOpen(true);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="bg-transparent p-0 ring-0 shadow-none text-foreground"
          >
            <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                    Verify your email
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-relaxed text-slate-600">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-medium text-slate-900 break-all">
                      {verifyEmail}
                    </span>
                    .
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-5 space-y-3">
                  <FormField label="Verification code" htmlFor="verificationCode" required>
                    <Input
                      id="verificationCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter 6-digit code"
                      value={verifyCode}
                      onChange={(e) => {
                        const next = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
                        setVerifyCode(next);
                      }}
                      className="h-11 text-center text-base font-medium tracking-[0.25em]"
                    />
                  </FormField>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResetPwdOpen((v) => !v);
                        setResetPassword("");
                        setResetPasswordConfirm("");
                      }}
                      className="w-full text-left text-xs font-medium text-slate-800"
                    >
                      {resetPwdOpen ? "Hide password reset" : "Entered the wrong password? Set a new one"}
                    </button>
                    {resetPwdOpen && (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField label="New password" htmlFor="otpNewPassword" required>
                          <Input
                            id="otpNewPassword"
                            type="password"
                            placeholder="At least 12 characters"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                          />
                        </FormField>
                        <FormField label="Confirm password" htmlFor="otpConfirmPassword" required>
                          <Input
                            id="otpConfirmPassword"
                            type="password"
                            placeholder="Re-enter new password"
                            value={resetPasswordConfirm}
                            onChange={(e) => setResetPasswordConfirm(e.target.value)}
                          />
                        </FormField>
                        <p className="sm:col-span-2 text-[11px] leading-relaxed text-slate-600">
                          This is applied only after your verification code is confirmed.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">Code expires in 10 minutes.</span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resendCode}
                      disabled={resendSubmitting || verifySubmitting}
                      className="h-8 px-2 justify-start text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 sm:justify-center"
                    >
                      {resendSubmitting ? "Sending..." : "Resend code"}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVerifyCode("");
                    setVerifyOpen(false);
                  }}
                  disabled={verifySubmitting || resendSubmitting}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={submitVerificationCode}
                  disabled={
                    verifySubmitting
                    || verifyCode.replace(/\s/g, "").length !== 6
                    || (
                      resetPwdOpen
                      && (
                        resetPassword.trim().length < 12
                        || resetPassword !== resetPasswordConfirm
                      )
                    )
                  }
                  className="w-full sm:w-auto"
                >
                  {verifySubmitting ? "Verifying..." : "Verify"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
