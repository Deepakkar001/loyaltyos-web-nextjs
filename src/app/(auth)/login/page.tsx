"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboardingApi, ApiError } from "@/lib/api/client";
import {
  applyMerchantSession,
  applyTenantSession,
  routeAfterMerchantLogin,
  routeAfterTenantLogin,
} from "@/lib/auth/unified-sign-in";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { SignInOrganisationOption } from "@/types/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center">
      <p className="text-sm text-brand-300">Loading sign in…</p>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [organisations, setOrganisations] = useState<SignInOrganisationOption[] | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(
    null
  );
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const email = searchParams.get("email")?.trim();
    if (email) {
      setValue("email", email);
    }
  }, [searchParams, setValue]);

  async function completeSignIn(email: string, password: string, tenantId?: string) {
    const res = await onboardingApi.signIn({ email, password, tenantId });

    if (res.identityType === "ORGANISATION_SELECTION_REQUIRED") {
      setOrganisations(res.organisations ?? []);
      setPendingCredentials({ email, password });
      setSelectedTenantId(res.organisations?.[0]?.tenantId ?? "");
      return;
    }

    if (res.identityType === "MERCHANT" && res.merchant) {
      applyMerchantSession(res.merchant, email);
      toast.success(`Welcome back, ${res.merchant.merchantName ?? "partner"}!`);
      routeAfterMerchantLogin(router, res.merchant.mustChangePassword === true);
      return;
    }

    if (res.identityType === "TENANT" && res.tenant) {
      applyTenantSession(res.tenant);
      const welcomeName = res.tenant.fullName?.trim();
      if (res.tenant.mustChangePassword) {
        toast("Please set a new password to continue.", { duration: 5000 });
      } else {
        toast.success(`Welcome back, ${welcomeName || "there"}!`);
      }
      await routeAfterTenantLogin(router, res.tenant);
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setOrganisations(null);
      setPendingCredentials(null);
      await completeSignIn(data.email, data.password);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Login failed. Please try again.");
    }
  };

  async function submitOrganisationChoice() {
    if (!pendingCredentials || !selectedTenantId) return;
    setOrgSubmitting(true);
    try {
      await completeSignIn(
        pendingCredentials.email,
        pendingCredentials.password,
        selectedTenantId
      );
      setOrganisations(null);
      setPendingCredentials(null);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Login failed. Please try again.");
    } finally {
      setOrgSubmitting(false);
    }
  }

  const fieldError = useMemo(
    () => (errors.email?.message ? "email" : errors.password?.message ? "password" : null),
    [errors]
  );

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mb-6 flex justify-center">
            <Logo size="md" className="items-center justify-center bg-white p-2 rounded-xl" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Sign in to LoyaltyOS</h1>
          <p className="text-brand-300 mt-2">
            Programme administrators and merchant partners use the same sign-in page.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {organisations && organisations.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Choose organisation</h2>
                <p className="text-sm text-brand-300/90 mt-1">
                  Your email is linked to more than one merchant programme. Select which one to
                  open.
                </p>
              </div>
              <div className="space-y-2">
                {organisations.map((org) => (
                  <label
                    key={org.tenantId}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                      selectedTenantId === org.tenantId
                        ? "border-emerald-400/50 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <input
                      type="radio"
                      name="organisation"
                      value={org.tenantId}
                      checked={selectedTenantId === org.tenantId}
                      onChange={() => setSelectedTenantId(org.tenantId)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        <Building2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        {org.merchantName}
                      </span>
                      <span className="mt-0.5 block text-xs text-white/50 font-mono truncate">
                        {org.merchantUid}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                size="lg"
                disabled={orgSubmitting || !selectedTenantId}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                onClick={() => void submitOrganisationChoice()}
              >
                {orgSubmitting ? "Signing in…" : "Continue to merchant portal"}
                {!orgSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-brand-300 hover:text-white transition-colors"
                onClick={() => {
                  setOrganisations(null);
                  setPendingCredentials(null);
                }}
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Email
                </label>
                <div className="mt-2 relative">
                  <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="username"
                    {...register("email")}
                    className={cn(
                      "h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-brand-500",
                      errors.email ? "border-red-400 focus-visible:ring-red-400" : ""
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-300 mt-2">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Password
                </label>
                <div className="mt-2 relative">
                  <Lock className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn(
                      "h-12 pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-brand-500",
                      errors.password ? "border-red-400 focus-visible:ring-red-400" : ""
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-300 mt-2">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {fieldError && (
                <p className="text-xs text-white/40 text-center">
                  Please fix the highlighted {fieldError} field.
                </p>
              )}
            </form>
          )}
        </div>

        <p className="text-white/30 text-sm mt-6 text-center">
          New programme?{" "}
          <Link href="/onboarding" className="text-brand-300 hover:text-white transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
