"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Store,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tenantPasswordSchema } from "@/lib/auth/password-policy";
import { merchantAcceptInvite, merchantValidateInvite } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};

function SplitShell({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-brand-950 px-10 py-12 lg:flex xl:px-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.25) 0%, transparent 40%)",
          }}
        />
        {left}
      </aside>
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 sm:px-10">
        {right}
      </main>
    </div>
  );
}

export default function MerchantOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const inviteSchema = z
    .object({
      newPassword: tenantPasswordSchema,
      confirmPassword: z.string().min(1, "Confirm your password"),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      setValidating(false);
      return;
    }
    void (async () => {
      try {
        const res = await merchantValidateInvite(token);
        if (!res.valid) {
          setInvalid(true);
          return;
        }
        setMerchantName(res.merchantName ?? null);
        setEmailMasked(res.emailMasked ?? null);
      } catch {
        setInvalid(true);
      } finally {
        setValidating(false);
      }
    })();
  }, [token]);

  const onSubmit = async (data: FormValues) => {
    try {
      await merchantAcceptInvite(token, data.newPassword);
      toast.success("Password set. You can now sign in.");
      router.push(PORTAL_LOGIN_PATH);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not activate account");
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-600" />
          Validating invite…
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <SplitShell
        left={
          <>
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white tracking-tight">LoyaltyOS</p>
                  <p className="text-xs text-emerald-300/90">Merchant partner portal</p>
                </div>
              </div>
            </div>
            <div className="relative z-10 space-y-6">
              <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
                Invite link expired
              </h1>
              <p className="max-w-sm text-base leading-relaxed text-brand-300/90">
                For security, invite links can only be used once and may expire after a period of
                time. Ask your programme administrator to resend your invite.
              </p>
            </div>
            <p className="relative z-10 text-xs text-brand-400/70">
              If you believe this is an error, contact support.
            </p>
          </>
        }
        right={
          <div className="w-full max-w-[420px]">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                  <TriangleAlert className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight">Invite link invalid</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    This link may have expired or already been used.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href={PORTAL_LOGIN_PATH}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                    "bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  )}
                >
                  Go to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-xs text-muted-foreground text-center">
                  Ask your programme administrator to resend your invite link.
                </p>
              </div>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <SplitShell
      left={
        <>
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white tracking-tight">LoyaltyOS</p>
                <p className="text-xs text-emerald-300/90">Merchant partner portal</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
                Activate your account
              </h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-brand-300/90">
                Set a password to access your merchant dashboard, create campaigns, and download
                settlement statements.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, text: "Secure access to partner tools" },
                { icon: CheckCircle2, text: "One-time activation using your invite link" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-brand-200/90">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-brand-400/70">
            This link is unique to your invite email.
          </p>
        </>
      }
      right={
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Activate account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Set your merchant portal password
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">Set your portal password</h2>
              <p className="text-sm text-muted-foreground">
                {merchantName ? (
                  <>
                    Welcome to <span className="font-medium text-foreground">{merchantName}</span>.
                  </>
                ) : (
                  "Welcome to the merchant portal."
                )}{" "}
                {emailMasked ? <>Account: {emailMasked}</> : null}
              </p>
            </div>

            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  New password
                </label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="invite-new-password"
                    type={showNew ? "text" : "password"}
                    className={cn(
                      "h-12 pl-10 pr-10",
                      errors.newPassword ? "border-destructive" : ""
                    )}
                    autoComplete="new-password"
                    {...register("newPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-2 text-xs text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Confirm password
                </label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="invite-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    className={cn(
                      "h-12 pl-10 pr-10",
                      errors.confirmPassword ? "border-destructive" : ""
                    )}
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Activate account"}
                {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                After activation, you’ll be redirected to sign in.
              </p>
            </form>
          </div>
        </div>
      }
    />
  );
}
