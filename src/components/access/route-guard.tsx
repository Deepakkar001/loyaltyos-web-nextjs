"use client";

import { useAccess } from "@/lib/access/use-access";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

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
  const { permissionsEnforced, dynamicNavEnabled, loading, access, canAccessPath } = useAccess();

  const enforcementActive = permissionsEnforced || dynamicNavEnabled;
  const accessResolved = !loading && access != null;

  const allowed = useMemo(() => {
    if (!onboardingComplete || !enforcementActive || !accessResolved) return true;
    if (searchParams.get("denied") === "module" || searchParams.get("denied") === "permission") {
      return true;
    }
    return canAccessPath(pathname);
  }, [
    onboardingComplete,
    enforcementActive,
    accessResolved,
    canAccessPath,
    pathname,
    searchParams,
  ]);

  useEffect(() => {
    if (!onboardingComplete || !enforcementActive || !accessResolved) return;
    if (searchParams.get("denied") === "module" || searchParams.get("denied") === "permission") {
      return;
    }
    if (!canAccessPath(pathname)) {
      router.replace("/dashboard?denied=permission");
    }
  }, [
    pathname,
    onboardingComplete,
    enforcementActive,
    accessResolved,
    canAccessPath,
    router,
    searchParams,
  ]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
