"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { merchantLogin } from "@/lib/api/merchant";
import { Button } from "@/components/ui/button";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await merchantLogin(tenantId.trim(), username.trim(), password);
      toast.success("Logged in");
      router.push("/merchant/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border p-6">
        <h1 className="text-xl font-semibold">Merchant portal</h1>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Tenant ID"
          required
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        />
        <input
          type="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Email"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
