"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getMerchantToken, merchantProfile } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";

const BARE_PREFIXES = ["/merchant/login", "/merchant/onboarding/"];

export function MerchantAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setProfile = useMerchantAuthStore((s) => s.setProfile);
  const setSessionPartial = useMerchantAuthStore((s) => s.hydrateFromStorage);
  const [ready, setReady] = useState(false);

  const isBare = BARE_PREFIXES.some((p) => pathname === p || pathname?.startsWith(p));

  useEffect(() => {
    if (isBare) {
      setReady(true);
      return;
    }

    const token = getMerchantToken();
    if (!token) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }

    setSessionPartial();
    void merchantProfile()
      .then((profile) => {
        setProfile(profile);
        setReady(true);
      })
      .catch(() => {
        useMerchantAuthStore.getState().clearSession();
        router.replace(PORTAL_LOGIN_PATH);
      });
  }, [isBare, pathname, router, setProfile, setSessionPartial]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading merchant portal…
      </div>
    );
  }

  return <>{children}</>;
}
