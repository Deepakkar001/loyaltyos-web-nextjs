"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useOnboardingStore((s) => s.setAccessToken);
  const setMustChangePassword = useOnboardingStore((s) => s.setMustChangePassword);
  const setTenantId = useOnboardingStore((s) => s.setTenantId);
  const setRegistrationData = useOnboardingStore((s) => s.setRegistrationData);
  const syncStatusFromBackend = useOnboardingStore((s) => s.syncStatusFromBackend);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      token: searchParams.get("token") ?? "",
      password: "",
    },
  });

  const tokenFromUrl = searchParams.get("token") ?? "";

  const onSubmit = async (data: FormValues) => {
    const token = data.token || tokenFromUrl;
    if (!token) {
      toast.error("Invite link is missing a token. Use the link from your email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onboardingApi.acceptInvite(data.email, token, data.password);
      setAccessToken(res.accessToken);
      setMustChangePassword(res.mustChangePassword === true);
      setTenantId(res.tenantId);
      setRegistrationData({ email: res.email });
      syncStatusFromBackend(res.onboardingStatus);
      toast.success("Account activated");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-white/5 p-8"
      >
        <h1 className="text-xl font-semibold text-white">Accept team invite</h1>
        <p className="text-sm text-slate-300">Set your password to join your organisation.</p>
        <div>
          <Input type="email" placeholder="Email" className="bg-slate-900" {...register("email")} />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        {tokenFromUrl ? (
          <input type="hidden" {...register("token")} />
        ) : (
          <div>
            <Input placeholder="Invite token" className="bg-slate-900" {...register("token")} />
            {errors.token && <p className="text-xs text-red-400 mt-1">{errors.token.message}</p>}
          </div>
        )}
        <div>
          <Input type="password" placeholder="New password" className="bg-slate-900" {...register("password")} />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Activating…" : "Activate account"}
        </Button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
