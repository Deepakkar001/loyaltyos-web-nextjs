"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, Mail, Store } from "lucide-react";

import {
  MerchantPageHeader,
  MerchantPageLoader,
  MerchantPanelCard,
} from "@/components/merchant/merchant-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMerchantToken,
  merchantChangePassword,
  merchantGetAgreement,
  merchantProfile,
} from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import type { MerchantAgreementResponse, MerchantResponse } from "@/types/merchant";

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function MerchantProfilePage() {
  const router = useRouter();
  const [profile, setLocalProfile] = useState<MerchantResponse | null>(null);
  const [agreement, setAgreement] = useState<MerchantAgreementResponse | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void Promise.all([merchantProfile(), merchantGetAgreement()])
      .then(([p, a]) => {
        setLocalProfile(p);
        setAgreement(a);
      })
      .catch(() => router.replace(PORTAL_LOGIN_PATH));
  }, [router]);

  async function handleChangePassword() {
    setChangingPassword(true);
    try {
      await merchantChangePassword(currentPassword, newPassword);
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  }

  if (!profile) {
    return <MerchantPageLoader label="Loading profile…" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <MerchantPageHeader
        title="Profile"
        description="Your merchant account details, agreement summary, and security settings."
      />

      <MerchantPanelCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-1 ring-emerald-500/20">
            <Store className="h-8 w-8" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">{profile.legalName}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{profile.merchantUid}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ProfileField label="Category" value={profile.category ?? "—"} />
              <ProfileField
                label="Earn multiplier"
                value={`${profile.earnRateMultiplier ?? 1}×`}
              />
              <ProfileField
                label="Contact email"
                value={profile.contactEmail ?? "—"}
                icon={Mail}
              />
              <ProfileField
                label="Settlement cycle"
                value={profile.settlementCycle ?? "—"}
              />
              <ProfileField label="Status" value={profile.onboardingStage} />
            </div>
          </div>
        </div>
      </MerchantPanelCard>

      {agreement && (
        <MerchantPanelCard title="Agreement summary" description="Commercial terms on file">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileField label="Terms version" value={agreement.termsVersion} />
            <ProfileField label="Revenue share" value={`${agreement.revenueSharePct}%`} />
            <ProfileField label="Settlement" value={agreement.settlementCycle} />
            <ProfileField label="Signed by" value={agreement.signedByName} />
          </div>
        </MerchantPanelCard>
      )}

      <MerchantPanelCard
        title="Security"
        description="Update your portal password regularly to keep your account secure"
      >
        <div className="flex items-center gap-2 mb-5 text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          <span className="text-sm font-medium text-foreground">Change password</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="mt-5">
          <Button
            type="button"
            disabled={changingPassword || !currentPassword || !newPassword}
            onClick={() => void handleChangePassword()}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500"
          >
            {changingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </MerchantPanelCard>
    </div>
  );
}
