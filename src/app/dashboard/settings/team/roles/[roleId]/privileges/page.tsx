"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Save,
  Settings2,
  Share2,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Authorize } from "@/components/access/authorize";
import { accessApi } from "@/lib/access/access-api";
import type { PrivilegeMatrixResponse, PrivilegeRowDto, TenantUserResponse } from "@/types/access";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useAccess } from "@/lib/access/use-access";
import { TEAM_BASE } from "@/components/settings/team/team-shared";
import { cn } from "@/lib/utils";

const SECTION_ACCENTS = [
  {
    stripe: "from-violet-500/70 via-violet-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(124,58,237,0.35)]",
    badge: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    icon: "text-violet-600 dark:text-violet-400",
    progress: "bg-violet-500",
  },
  {
    stripe: "from-sky-500/70 via-sky-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(14,165,233,0.35)]",
    badge: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    icon: "text-sky-600 dark:text-sky-400",
    progress: "bg-sky-500",
  },
  {
    stripe: "from-emerald-500/70 via-emerald-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(16,185,129,0.35)]",
    badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    progress: "bg-emerald-500",
  },
  {
    stripe: "from-amber-500/70 via-amber-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(245,158,11,0.35)]",
    badge: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    progress: "bg-amber-500",
  },
  {
    stripe: "from-rose-500/70 via-rose-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(244,63,94,0.35)]",
    badge: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-400",
    progress: "bg-rose-500",
  },
  {
    stripe: "from-indigo-500/70 via-indigo-400/30 to-transparent",
    glow: "shadow-[0_12px_40px_-12px_rgba(99,102,241,0.35)]",
    badge: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
    progress: "bg-indigo-500",
  },
] as const;

const SECTION_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Configuration: Settings2,
  "Loyalty Rules": Sparkles,
  Campaigns: Megaphone,
  Referrals: Share2,
  "Analytics & Reports": BarChart3,
  Settings: Users,
  Support: Wrench,
};

function formatActionLabel(action: string) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function getSectionModules(rows: PrivilegeRowDto[]) {
  return Array.from(
    rows.reduce((acc, row) => {
      if (!acc.has(row.moduleKey)) acc.set(row.moduleKey, row);
      return acc;
    }, new Map<string, PrivilegeRowDto>())
  );
}

function getSectionActionKeys(rows: PrivilegeRowDto[], globalOrder: string[]) {
  const keys = new Set(rows.map((r) => r.actionKey));
  return globalOrder.filter((k) => keys.has(k));
}

export default function RolePrivilegesPage() {
  const params = useParams();
  const roleId = params.roleId as string;
  const { refreshAccess, hasPermission } = useAccess();
  const canEdit = hasPermission("team_admin.edit");

  const [matrix, setMatrix] = useState<PrivilegeMatrixResponse | null>(null);
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  const [userId, setUserId] = useState("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const m = await accessApi.loadPrivileges({
        roleId,
        userId: userId === "select" ? undefined : userId,
      });
      setMatrix(m);
      setSelected(new Set(m.rows.filter((r) => r.selected).map((r) => r.permissionKey)));

      try {
        const u = await accessApi.listUsers();
        setUsers(u);
      } catch {
        setUsers([]);
      }
    } catch {
      setMatrix(null);
      setLoadError("Could not load the permission matrix. Sign in again or contact an administrator.");
      toast.error("Failed to load privileges");
    } finally {
      setLoading(false);
    }
  }, [roleId, userId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const actionKeys = matrix?.actionKeys ?? [];

  const grouped = useMemo(() => {
    if (!matrix) return [];
    const map = new Map<string, PrivilegeRowDto[]>();
    for (const row of matrix.rows) {
      if (canEdit && !row.assignable) continue;
      const list = map.get(row.navSection) ?? [];
      list.push(row);
      map.set(row.navSection, list);
    }
    return Array.from(map.entries());
  }, [matrix, canEdit]);

  const selectedCount = selected.size;

  const roleUsers = useMemo(
    () =>
      users.filter(
        (u) => u.status !== "DISABLED" && u.roleIds.includes(roleId)
      ),
    [users, roleId]
  );

  const userOptions = useMemo(
    () => [
      { value: "select", label: "Role only (no user override)" },
      ...roleUsers.map((u) => ({
        value: u.userId,
        label: u.fullName ? `${u.fullName} · ${u.email}` : u.email,
      })),
    ],
    [roleUsers]
  );

  useEffect(() => {
    if (userId !== "select" && !roleUsers.some((u) => u.userId === userId)) {
      setUserId("select");
    }
  }, [roleUsers, userId]);

  const toggle = (key: string) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await accessApi.assignPrivileges({
        roleId,
        userId: userId === "select" ? undefined : userId,
        permissionKeys: Array.from(selected),
      });
      setMatrix(updated);
      setSelected(new Set(updated.rows.filter((r) => r.selected).map((r) => r.permissionKey)));
      await refreshAccess();
      toast.success("Privileges saved");
    } catch {
      toast.error("Failed to save privileges");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-0 flex-col gap-6 pb-24">
      <Link
        href={`${TEAM_BASE}/roles`}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "w-fit -ml-2 text-muted-foreground",
        })}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roles
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            Assign privileges
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {canEdit
              ? "Grant permissions by module and action. Use user override to add grants or deny permissions inherited from the role."
              : "View-only access. You can review permissions but cannot save changes."}
          </p>
          {selectedCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedCount}</span> permission
              {selectedCount === 1 ? "" : "s"} selected
            </p>
          ) : null}
        </div>

        <Card className="w-full shrink-0 border-border/70 bg-[var(--surface-card)] lg:w-[22rem]">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-override" className="text-xs font-medium">
                User override
              </Label>
              <NativeSelect
                id="user-override"
                ariaLabel="User override"
                value={userId}
                onChange={setUserId}
                options={userOptions}
              />
              {roleUsers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No active users are assigned to this role. Assign users on the Users page to
                  configure per-user overrides.
                </p>
              ) : null}
            </div>
            <Authorize permission="team_admin.edit">
              <Button className="w-full" disabled={saving} onClick={() => void save()}>
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Authorize>
          </CardContent>
        </Card>
      </div>

      {!canEdit ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-medium text-foreground">View-only mode.</span> Your role has{" "}
            <code className="text-xs">team_admin.view</code> but not{" "}
            <code className="text-xs">team_admin.edit</code>. Contact an administrator to request
            edit access.
          </p>
        </div>
      ) : null}

      {userId !== "select" ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-medium">User override active.</span> Unchecked permissions inherited
          from the role will be denied. Checked permissions not on the role will be granted.
        </div>
      ) : null}

      {loadError ? (
        <Card className="border-border/70 bg-[var(--surface-card)]">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-border/70 bg-[var(--surface-card)]">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {matrix && matrix.rows.length > 0
              ? "No assignable permissions for this tenant."
              : "No permissions are available for this tenant's enabled modules."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([section, rows], index) => (
            <PrivilegeSectionCard
              key={section}
              section={section}
              rows={rows}
              globalActionKeys={actionKeys}
              selected={selected}
              onToggle={toggle}
              accentIndex={index}
              readOnly={!canEdit}
            />
          ))}
        </div>
      )}

      {/* Sticky save bar for long matrices */}
      {grouped.length > 0 && canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 backdrop-blur-md px-4 py-3 sm:px-6 lg:pl-[calc(18rem+1.5rem)] xl:pl-[calc(18rem+2rem)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {selectedCount} permission{selectedCount === 1 ? "" : "s"} selected
            </p>
            <Authorize permission="team_admin.edit">
              <Button
                className="ml-auto w-full sm:w-auto"
                disabled={saving}
                onClick={() => void save()}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Authorize>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PrivilegeSectionCard({
  section,
  rows,
  globalActionKeys,
  selected,
  onToggle,
  accentIndex,
  readOnly = false,
}: {
  section: string;
  rows: PrivilegeRowDto[];
  globalActionKeys: string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  accentIndex: number;
  readOnly?: boolean;
}) {
  const modules = getSectionModules(rows);
  const sectionActionKeys = getSectionActionKeys(rows, globalActionKeys);
  const accent = SECTION_ACCENTS[accentIndex % SECTION_ACCENTS.length]!;
  const SectionIcon = SECTION_ICONS[section] ?? Shield;
  const isCompact = modules.length === 1;

  const totalPermissions = rows.length;
  const grantedInSection = rows.filter((r) => selected.has(r.permissionKey)).length;
  const progressPct =
    totalPermissions > 0 ? Math.round((grantedInSection / totalPermissions) * 100) : 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[var(--surface-card)]",
        accent.glow
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
          accent.stripe
        )}
      />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-background to-[var(--surface-sunken)] ring-1 ring-foreground/[0.06]",
                accent.icon
              )}
            >
              <SectionIcon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Access group
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {section}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {modules.length} module{modules.length === 1 ? "" : "s"} ·{" "}
                {sectionActionKeys.length} permission type
                {sectionActionKeys.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
                accent.badge
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {grantedInSection}/{totalPermissions} active
            </span>
            <div className="h-1.5 w-full min-w-[8rem] overflow-hidden rounded-full bg-foreground/[0.06] sm:w-36">
              <div
                className={cn("h-full rounded-full transition-all duration-500 ease-out", accent.progress)}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </header>

        <div className="rounded-xl bg-[var(--surface-sunken)]/55 p-1.5 ring-1 ring-foreground/[0.04]">
          {isCompact ? (
            <CompactModulePanel
              modules={modules}
              rows={rows}
              sectionActionKeys={sectionActionKeys}
              selected={selected}
              onToggle={onToggle}
              readOnly={readOnly}
            />
          ) : (
            <PermissionGrid
              modules={modules}
              rows={rows}
              sectionActionKeys={sectionActionKeys}
              selected={selected}
              onToggle={onToggle}
              readOnly={readOnly}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function CompactModulePanel({
  modules,
  rows,
  sectionActionKeys,
  selected,
  onToggle,
  readOnly = false,
}: {
  modules: [string, PrivilegeRowDto][];
  rows: PrivilegeRowDto[];
  sectionActionKeys: string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  readOnly?: boolean;
}) {
  const [moduleKey, first] = modules[0]!;
  const moduleRows = rows.filter((r) => r.moduleKey === moduleKey);
  const actions = sectionActionKeys
    .map((actionKey) => moduleRows.find((r) => r.actionKey === actionKey))
    .filter((r): r is PrivilegeRowDto => r != null);

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-[var(--surface-card)]/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Module
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{first.moduleName}</p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {actions.map((row) => (
          <PermissionCheckbox
            key={row.permissionKey}
            row={row}
            checked={selected.has(row.permissionKey)}
            onToggle={onToggle}
            showLabel
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function PermissionGrid({
  modules,
  rows,
  sectionActionKeys,
  selected,
  onToggle,
  readOnly = false,
}: {
  modules: [string, PrivilegeRowDto][];
  rows: PrivilegeRowDto[];
  sectionActionKeys: string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  readOnly?: boolean;
}) {
  const actionColWidth = "4.5rem";

  return (
    <>
      <div className="hidden overflow-x-auto md:block rounded-lg bg-[var(--surface-card)]/80">
        <table
          className="w-full min-w-[36rem] table-fixed border-collapse text-sm"
          aria-label="Module permissions"
        >
          <colgroup>
            <col style={{ width: "min(280px, 38%)" }} />
            {sectionActionKeys.map((actionKey) => (
              <col key={actionKey} style={{ width: actionColWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-foreground/[0.06]">
              <th
                scope="col"
                className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Module
              </th>
              {sectionActionKeys.map((actionKey) => (
                <th
                  key={actionKey}
                  scope="col"
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {formatActionLabel(actionKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.05]">
            {modules.map(([moduleKey, first]) => {
              const moduleRows = rows.filter((r) => r.moduleKey === moduleKey);
              return (
                <tr key={moduleKey} className="transition-colors hover:bg-foreground/[0.02]">
                  <th
                    scope="row"
                    className="px-5 py-3 text-left text-sm font-medium text-foreground align-middle"
                  >
                    {first.moduleName}
                  </th>
                  {sectionActionKeys.map((actionKey) => {
                    const row = moduleRows.find((r) => r.actionKey === actionKey);
                    if (!row) return null;
                    return (
                      <td key={actionKey} className="px-2 py-2 align-middle">
                        <PermissionCheckbox
                          row={row}
                          checked={selected.has(row.permissionKey)}
                          onToggle={onToggle}
                          readOnly={readOnly}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2 p-1">
        {modules.map(([moduleKey, first]) => {
          const moduleRows = rows.filter((r) => r.moduleKey === moduleKey);
          const actions = sectionActionKeys
            .map((actionKey) => moduleRows.find((r) => r.actionKey === actionKey))
            .filter((r): r is PrivilegeRowDto => r != null);

          return (
            <div
              key={moduleKey}
              className="rounded-lg bg-[var(--surface-card)]/80 px-4 py-3.5 space-y-3"
            >
              <p className="text-sm font-semibold">{first.moduleName}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {actions.map((row) => (
                  <PermissionCheckbox
                    key={row.permissionKey}
                    row={row}
                    checked={selected.has(row.permissionKey)}
                    onToggle={onToggle}
                    showLabel
                    variant="card"
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PermissionCheckbox({
  row,
  checked,
  onToggle,
  showLabel = false,
  variant = "cell",
  readOnly = false,
}: {
  row: PrivilegeRowDto;
  checked: boolean;
  onToggle: (key: string) => void;
  showLabel?: boolean;
  variant?: "cell" | "card";
  readOnly?: boolean;
}) {
  const label = formatActionLabel(row.actionKey);
  const ariaLabel = `${row.moduleName}: ${label}`;
  const disabled = !row.assignable || readOnly;

  if (variant === "card") {
    return (
      <label
        className={cn(
          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
          "border-foreground/[0.08] bg-background",
          !disabled && "cursor-pointer hover:bg-muted/30",
          checked && "border-primary/35 bg-primary/5",
          row.denied && "border-destructive/30 bg-destructive/5",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={() => {
            if (!disabled) onToggle(row.permissionKey);
          }}
          aria-label={ariaLabel}
        />
        <span className="font-medium">{label}</span>
        <PermissionMeta row={row} />
      </label>
    );
  }

  return (
    <div className="flex justify-center">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors",
          !disabled && "cursor-pointer hover:bg-muted/40",
          checked && "bg-primary/5",
          row.denied && "bg-destructive/5",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={() => {
            if (!disabled) onToggle(row.permissionKey);
          }}
          aria-label={ariaLabel}
        />
        {showLabel ? (
          <span className="text-xs font-medium text-foreground">{label}</span>
        ) : (
          <PermissionMeta row={row} />
        )}
      </label>
    </div>
  );
}

function PermissionMeta({ row }: { row: PrivilegeRowDto }) {
  if (row.denied) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">deny</span>
    );
  }
  if (row.inheritedFromRole) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        role
      </span>
    );
  }
  return <span className="h-3" aria-hidden />;
}

