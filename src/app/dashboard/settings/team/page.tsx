"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  KeyRound,
  Shield,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accessApi } from "@/lib/access/access-api";
import { useAccess } from "@/lib/access/use-access";
import type { RoleResponse, TenantUserResponse } from "@/types/access";
import { TEAM_BASE } from "@/components/settings/team/team-shared";
import { userStatusBadge } from "@/components/settings/team/team-shared";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="border-border/70 bg-[var(--surface-card)] overflow-hidden">
      <CardContent className="relative pt-0">
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accent)} aria-hidden />
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamOverviewPage() {
  const { hasPermission } = useAccess();
  const canCreate = hasPermission("team_admin.create");
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, u] = await Promise.all([accessApi.listRoles(), accessApi.listUsers()]);
      setRoles(r);
      setUsers(u);
    } catch {
      // Overview is best-effort; child pages show errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "ACTIVE" && !u.mustChangePassword).length,
    [users]
  );
  const pendingPasswordUsers = useMemo(
    () => users.filter((u) => u.mustChangePassword).length,
    [users]
  );
  const invitedUsers = useMemo(() => users.filter((u) => u.status === "INVITED").length, [users]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Roles" value={roles.length} icon={Shield} accent="from-violet-500/80 to-violet-500/20" />
        <StatCard
          label="Active users"
          value={activeUsers}
          icon={UserCheck}
          accent="from-emerald-500/80 to-emerald-500/20"
        />
        <StatCard
          label="Awaiting password"
          value={pendingPasswordUsers}
          icon={KeyRound}
          accent="from-sky-500/80 to-sky-500/20"
        />
        <StatCard
          label="Pending invites"
          value={invitedUsers}
          icon={UserPlus}
          accent="from-amber-500/80 to-amber-500/20"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="group border-border/70 bg-[var(--surface-card)] transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Roles & privileges
            </CardTitle>
            <CardDescription>
              Create roles, clone from templates, and assign module-level permissions per role.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{roles.length}</span> roles configured
            </p>
            <Link
              href={`${TEAM_BASE}/roles`}
              className={buttonVariants({ className: "gap-2" })}
            >
              Manage roles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group border-border/70 bg-[var(--surface-card)] transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Users & invites
            </CardTitle>
            <CardDescription>
              Invite colleagues by email. They receive a temporary password and must set a new one on
              first sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{users.length}</span> team members
            </p>
            <Link
              href={`${TEAM_BASE}/users`}
              className={buttonVariants({ className: "gap-2" })}
            >
              Manage users
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {users.length > 0 ? (
        <Card className="border-border/70 bg-[var(--surface-card)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Recent team members</CardTitle>
              <CardDescription>Latest users in your organisation</CardDescription>
            </div>
            <Link
              href={`${TEAM_BASE}/users`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {users.slice(0, 5).map((user) => (
                <li
                  key={user.userId}
                  className="flex items-center justify-between gap-4 px-6 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.fullName ?? user.email}</p>
                    {user.fullName ? (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    ) : null}
                  </div>
                  {userStatusBadge(user)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/70 bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground max-w-md">
              No team members yet.
              {canCreate ? " Invite your first colleague from the Users section." : null}
            </p>
            {canCreate ? (
              <Link href={`${TEAM_BASE}/users`} className={buttonVariants()}>
                Invite a user
              </Link>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
