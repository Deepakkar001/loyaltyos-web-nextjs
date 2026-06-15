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

export function canAccessDashboardPath(
  pathname: string,
  permissions: string[],
  routeGuards: RouteGuardDto[],
  options?: { enforcementEnabled?: boolean }
): boolean {
  if (!options?.enforcementEnabled) return true;
  if (pathname === "/dashboard" || pathname === "/dashboard/") return true;

  const required = resolveRoutePermission(pathname, routeGuards);
  if (required == null) {
    return false;
  }
  return permissions.includes(required);
}
