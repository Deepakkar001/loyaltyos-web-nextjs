"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";

import { Authorize } from "@/components/access/authorize";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { accessApi } from "@/lib/access/access-api";
import { useAccess } from "@/lib/access/use-access";
import type { RoleResponse, TenantUserResponse } from "@/types/access";
import { userStatusBadge } from "@/components/settings/team/team-shared";
import { cn } from "@/lib/utils";

export default function TeamUsersPage() {
  const { hasPermission } = useAccess();
  const canCreate = hasPermission("team_admin.create");
  const canEdit = hasPermission("team_admin.edit");
  const canDelete = hasPermission("team_admin.delete");

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const [editingUser, setEditingUser] = useState<TenantUserResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [disablingUser, setDisablingUser] = useState<TenantUserResponse | null>(null);
  const [disabling, setDisabling] = useState(false);

  const systemRoleId = useMemo(() => roles.find((r) => r.system)?.roleId, [roles]);

  const load = useCallback(async () => {
    try {
      const [r, u] = await Promise.all([accessApi.listRoles(), accessApi.listUsers()]);
      setRoles(r);
      setUsers(u);
      if (!inviteRoleId && r.length > 0) {
        setInviteRoleId(r.find((x) => x.system)?.roleId ?? r[0]!.roleId);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [inviteRoleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignableRoleOptions = useMemo(
    () =>
      roles
        .filter((r) => !r.system)
        .map((r) => ({ value: r.roleId, label: r.roleName })),
    [roles]
  );

  const inviteRoleOptions = useMemo(
    () => roles.map((r) => ({ value: r.roleId, label: r.roleName })),
    [roles]
  );

  const roleNameById = useMemo(
    () => new Map(roles.map((r) => [r.roleId, r.roleName])),
    [roles]
  );

  const isPrimaryAdmin = (user: TenantUserResponse) =>
    systemRoleId != null && user.roleIds.includes(systemRoleId);

  const canManageUser = (user: TenantUserResponse) => user.status !== "DISABLED";

  const openEdit = (user: TenantUserResponse) => {
    setEditingUser(user);
    setEditName(user.fullName ?? "");
    const current = user.roleIds[0];
    if (isPrimaryAdmin(user) && systemRoleId) {
      setEditRoleId(systemRoleId);
    } else {
      setEditRoleId(
        current && assignableRoleOptions.some((o) => o.value === current)
          ? current
          : (assignableRoleOptions[0]?.value ?? "")
      );
    }
  };

  const saveEdit = async () => {
    if (!editingUser || !editRoleId) return;
    setSavingEdit(true);
    try {
      await accessApi.updateUser(editingUser.userId, {
        fullName: editName.trim() || undefined,
        roleId: editRoleId,
      });
      toast.success("User updated");
      setEditingUser(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDisable = async () => {
    if (!disablingUser) return;
    setDisabling(true);
    try {
      await accessApi.disableUser(disablingUser.userId);
      toast.success("User disabled");
      setDisablingUser(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to disable user");
    } finally {
      setDisabling(false);
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId) return;
    setInviting(true);
    try {
      const payload: Parameters<typeof accessApi.inviteUser>[0] = {
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      };
      if (inviteName.trim()) payload.fullName = inviteName.trim();

      const invited = await accessApi.inviteUser(payload);
      setInviteEmail("");
      setInviteName("");
      const emailSent = invited.inviteEmailSent === true;
      toast.success(
        emailSent
          ? "Invite email sent with a temporary password and sign-in instructions."
          : "User created, but the invite email was not delivered. Check SMTP configuration and try again."
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Users
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {canCreate
            ? "Invite colleagues, edit profiles and roles, or disable users who no longer need access."
            : canEdit || canDelete
              ? "Manage team members. Inviting users requires create permission."
              : "View team members in your organisation."}
        </p>
      </div>

      <div className={cn("grid gap-6 xl:items-start", canCreate && "xl:grid-cols-[1fr_360px]")}>
        <Card className="border-border/70 bg-[var(--surface-card)] min-h-0">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-base">Team members</CardTitle>
            <CardDescription>
              {users.length} user{users.length === 1 ? "" : "s"} in your organisation · Primary
              Administrator cannot be reassigned or disabled
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {users.map((user) => {
                const roleId = user.roleIds[0];
                const roleName = roleId ? roleNameById.get(roleId) : undefined;
                const manageable = canManageUser(user);
                const showEdit = canEdit && manageable;
                const showDelete = canDelete && manageable && !isPrimaryAdmin(user);

                return (
                  <li
                    key={user.userId}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {user.fullName ?? user.email}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {user.fullName ? <span className="truncate">{user.email}</span> : null}
                        {roleName ? (
                          <>
                            {user.fullName ? <span aria-hidden>·</span> : null}
                            <span>{roleName}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto">
                      {showEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                      {showDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => setDisablingUser(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      ) : null}
                      {userStatusBadge(user)}
                    </div>
                  </li>
                );
              })}
            </ul>
            {users.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {canCreate
                  ? "No users yet. Send your first invite using the form on the right."
                  : "No users to display."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Authorize permission="team_admin.create">
          <Card className="border-border/70 bg-[var(--surface-card)] xl:sticky xl:top-24">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-primary" />
                Invite user
              </CardTitle>
              <CardDescription>
                A secure temporary password is generated and emailed automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                <Mail className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-primary" />
                The invitee signs in at the login page, then sets a permanent password before
                accessing the portal.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name" className="text-xs">
                  Full name <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="invite-name"
                  placeholder="Jane Smith"
                  autoComplete="off"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role" className="text-xs">
                  Role
                </Label>
                <NativeSelect
                  id="invite-role"
                  ariaLabel="Invite role"
                  value={inviteRoleId}
                  onChange={setInviteRoleId}
                  options={inviteRoleOptions}
                  disabled={inviteRoleOptions.length === 0}
                />
              </div>
              <Button
                className="w-full"
                disabled={!inviteEmail.trim() || !inviteRoleId || inviting}
                onClick={() => void invite()}
              >
                {inviting ? "Sending…" : "Send invite email"}
              </Button>
            </CardContent>
          </Card>
        </Authorize>
      </div>

      <Dialog open={editingUser != null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update display name and role for{" "}
              <span className="font-medium text-foreground">{editingUser?.email}</span>.
              {editingUser && isPrimaryAdmin(editingUser)
                ? " Primary Administrator role cannot be changed."
                : " User-specific privilege overrides are cleared when the role changes."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" value={editingUser?.email ?? ""} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Full name</Label>
              <Input
                id="edit-user-name"
                placeholder="Optional"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-role">Role</Label>
              {editingUser && isPrimaryAdmin(editingUser) ? (
                <Input
                  id="edit-user-role"
                  value={roleNameById.get(systemRoleId ?? "") ?? "Primary Administrator"}
                  disabled
                  readOnly
                />
              ) : (
                <NativeSelect
                  id="edit-user-role"
                  ariaLabel="User role"
                  value={editRoleId}
                  onChange={setEditRoleId}
                  options={assignableRoleOptions}
                  disabled={assignableRoleOptions.length === 0}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={!editRoleId || savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disablingUser != null} onOpenChange={(open) => !open && setDisablingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable user</DialogTitle>
            <DialogDescription>
              Disable{" "}
              <span className="font-medium text-foreground">
                {disablingUser?.fullName ?? disablingUser?.email}
              </span>
              ? They will no longer be able to sign in. This does not remove audit history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisablingUser(null)} disabled={disabling}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDisable()} disabled={disabling}>
              {disabling ? "Disabling…" : "Disable user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
