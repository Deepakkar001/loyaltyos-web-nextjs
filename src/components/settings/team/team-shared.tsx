import type { TenantUserResponse } from "@/types/access";
import { Badge } from "@/components/ui/badge";

export function userStatusBadge(user: TenantUserResponse) {
  if (user.mustChangePassword) {
    return (
      <Badge variant="secondary" className="bg-sky-500/10 text-sky-800 dark:text-sky-300">
        Password pending
      </Badge>
    );
  }
  switch (user.status) {
    case "ACTIVE":
      return (
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          Active
        </Badge>
      );
    case "INVITED":
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-800 dark:text-amber-300">
          Invited
        </Badge>
      );
    case "DISABLED":
      return <Badge variant="destructive">Disabled</Badge>;
    default:
      return <Badge variant="outline">{user.status}</Badge>;
  }
}

export const TEAM_BASE = "/dashboard/settings/team";

export const TEAM_NAV = [
  {
    href: TEAM_BASE,
    label: "Overview",
    match: (path: string) => path === TEAM_BASE,
  },
  {
    href: `${TEAM_BASE}/roles`,
    label: "Roles",
    match: (path: string) => path.startsWith(`${TEAM_BASE}/roles`),
  },
  {
    href: `${TEAM_BASE}/users`,
    label: "Users",
    match: (path: string) => path.startsWith(`${TEAM_BASE}/users`),
  },
] as const;
