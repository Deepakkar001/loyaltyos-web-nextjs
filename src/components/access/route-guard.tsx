"use client";

import { useAccess } from "@/lib/access/use-access";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function AccessRouteGuard({
  children,
  onboardingComplete,
}: {
  children: ReactNode;
  onboardingComplete: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dynamicNavEnabled, loading, canAccessPath } = useAccess();

  useEffect(() => {
    if (!onboardingComplete || !dynamicNavEnabled || loading) return;
    if (searchParams.get("denied") === "module") return;
    if (!canAccessPath(pathname)) {
      router.replace("/dashboard?denied=module");
    }
  }, [
    pathname,
    onboardingComplete,
    dynamicNavEnabled,
    loading,
    canAccessPath,
    router,
    searchParams,
  ]);

  return <>{children}</>;
}
