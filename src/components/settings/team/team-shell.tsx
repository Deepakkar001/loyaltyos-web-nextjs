"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Shield, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TEAM_NAV } from "@/components/settings/team/team-shared";

const TAB_ICONS: Record<string, LucideIcon> = {
  Overview: LayoutGrid,
  Roles: Shield,
  Users: UserPlus,
};

export function TeamShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex w-full min-h-0 flex-col">
      <div className="border-b border-border/60 bg-[var(--surface-card)]">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden py-6 sm:py-7">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-violet-500/[0.05]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
                      <Users className="h-5 w-5" />
                    </span>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        Team & Permissions
                      </h1>
                      <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">
                        Manage organisation access — roles, users, and module privileges.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <nav
                className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
                aria-label="Team settings sections"
              >
                {TEAM_NAV.map((tab) => {
                  const active = tab.match(pathname);
                  const Icon = TAB_ICONS[tab.label] ?? LayoutGrid;
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active
                          ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}
