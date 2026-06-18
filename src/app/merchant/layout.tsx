"use client";

import { usePathname } from "next/navigation";

import { MerchantAuthGuard } from "@/components/merchant/MerchantAuthGuard";
import { MerchantPortalShell } from "@/components/merchant/MerchantPortalShell";
import { MerchantChangePasswordDialog } from "@/components/merchant/MerchantChangePasswordDialog";
import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mustChangePassword = useMerchantAuthStore((s) => s.mustChangePassword);

  const isBareRoute =
    pathname === "/merchant/login" || pathname?.startsWith("/merchant/onboarding/");

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <MerchantAuthGuard>
      <MerchantPortalShell>{children}</MerchantPortalShell>
      {mustChangePassword && <MerchantChangePasswordDialog />}
    </MerchantAuthGuard>
  );
}
