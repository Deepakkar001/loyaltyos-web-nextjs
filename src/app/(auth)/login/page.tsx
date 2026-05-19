"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboardingApi, ApiError } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { STATUS_TO_STEP } from "@/types/onboarding";
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setTenantId, setRegistrationData, setAccessToken, syncStatusFromBackend } =
    useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await onboardingApi.login(data.email, data.password);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("loyaltyos_logout_intent");
      }
      setAccessToken(res.accessToken);
      setTenantId(res.tenantId);
      setRegistrationData({ email: res.email });
      syncStatusFromBackend(res.onboardingStatus);

      toast.success("Welcome back.");
      // Route immediately to the right destination to avoid showing onboarding steps briefly.
      // Guided Setup Progress routing:
      // AGREEMENT_SIGNED → Configure
      // CONFIGURED → Rules Setup
      // RULES_CONFIGURED → Integrate
      // SANDBOX_TESTING → Go Live
      // ACTIVE → Dashboard
      if (res.onboardingStatus === "AGREEMENT_SIGNED") {
        router.replace("/dashboard/configure");
        return;
      }
      if (res.onboardingStatus === "CONFIGURED") {
        router.replace("/dashboard/loyalty-rules/create/basic-info");
        return;
      }
      if (res.onboardingStatus === "RULES_CONFIGURED") {
        router.replace("/dashboard/integrate");
        return;
      }
      if (res.onboardingStatus === "SANDBOX_TESTING") {
        router.replace("/dashboard/go-live");
        return;
      }
      if (res.onboardingStatus === "ACTIVE") {
        router.replace("/dashboard");
        return;
      }

      const step = STATUS_TO_STEP[res.onboardingStatus];
      router.replace(step === "programme" || step === "integration" || step === "complete" ? "/dashboard" : "/onboarding");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Login failed. Please try again.");
    }
  };

  const fieldError = useMemo(
    () => (errors.email?.message ? "email" : errors.password?.message ? "password" : null),
    [errors]
  );

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">
              LoyaltyOS
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Sign in to your portal
          </h1>
          <p className="text-brand-300 mt-2">
            Access your dashboard and onboarding review status.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
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
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
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
        </div>

        <p className="text-white/30 text-sm mt-6 text-center">
          New here?{" "}
          <Link href="/onboarding" className="text-brand-300 hover:text-white transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

