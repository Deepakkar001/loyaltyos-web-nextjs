"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, AdminApiError } from "@/lib/api/admin-client";
import { useAdminStore } from "@/lib/store/admin-store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { setSession } = useAdminStore();
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
      const res = await adminApi.login(data.email, data.password);
      setSession({
        accessToken: res.accessToken,
        adminUid: res.adminUid,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
      });
      toast.success(`Welcome, ${res.fullName}`);
      router.replace("/admin/dashboard");
    } catch (err) {
      if (err instanceof AdminApiError) toast.error(err.message);
      else toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">
              LoyaltyOS Admin
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Admin Portal
          </h1>
          <p className="text-slate-400 mt-2">
            Review and approve tenant agreements.
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
                  placeholder="admin@loyaltyos.com"
                  {...register("email")}
                  className={cn(
                    "h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500",
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
                    "h-12 pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500",
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
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold"
            >
              {isSubmitting ? "Signing in…" : "Sign in to Admin"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </div>

        <p className="text-slate-500 text-xs mt-8 text-center">
          This portal is restricted to authorised LoyaltyOS staff.
        </p>
      </div>
    </div>
  );
}
