"use client";

import { useAccess } from "@/lib/access/use-access";
import type { ReactNode } from "react";

export function Authorize({
  permission,
  children,
  fallback = null,
}: {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useAccess();
  const keys = Array.isArray(permission) ? permission : [permission];
  if (keys.some((k) => hasPermission(k))) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
