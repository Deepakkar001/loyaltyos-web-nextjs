import type { RouteGuardDto } from "@/types/access";

export function pathMatches(routePath: string, pathname: string): boolean {
  const base = routePath.split("?")[0];
  if (base === pathname) return true;
  if (pathname.startsWith(base + "/")) return true;
  return false;
}

/**
 * Resolves the most specific route guard for a pathname (longest matching prefix wins).
 */
export function resolveRoutePermission(
  pathname: string,
  routeGuards: RouteGuardDto[]
): string | null {
  let best: RouteGuardDto | null = null;
  for (const guard of routeGuards) {
    if (!pathMatches(guard.path, pathname)) continue;
    if (!best || guard.path.length > best.path.length) {
      best = guard;
    }
  }
  return best?.permissionKey ?? null;
}

/** Fallback guards for nested routes when catalog nav items are missing (e.g. merchant onboarding). */
const SUPPLEMENTAL_ROUTE_PERMISSIONS: Array<{ path: string; permission: string }> = [
  { path: "/dashboard/configure/merchants", permission: "merchants.view" },
  { path: "/dashboard/campaign-rules/create", permission: "campaigns.create" },
  { path: "/dashboard/loyalty-rules/create", permission: "loyalty_rules.create" },
];

export function canAccessDashboardPath(
  pathname: string,
  permissions: string[],
  routeGuards: RouteGuardDto[],
  options?: { enforcementEnabled?: boolean }
): boolean {
  if (!options?.enforcementEnabled) return true;
  if (pathname === "/dashboard" || pathname === "/dashboard/") return true;

  let required = resolveRoutePermission(pathname, routeGuards);
  if (required == null) {
    required = resolveSupplementalRoutePermission(pathname);
  }
  if (required == null) {
    return false;
  }
  return permissions.includes(required);
}

function resolveSupplementalRoutePermission(pathname: string): string | null {
  let best: { path: string; permission: string } | null = null;
  for (const entry of SUPPLEMENTAL_ROUTE_PERMISSIONS) {
    if (!pathMatches(entry.path, pathname)) continue;
    if (!best || entry.path.length > best.path.length) {
      best = entry;
    }
  }
  return best?.permission ?? null;
}
