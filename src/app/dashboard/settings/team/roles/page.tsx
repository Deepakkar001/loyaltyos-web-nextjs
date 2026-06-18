"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, KeyRound, Pencil, Shield, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Authorize } from "@/components/access/authorize";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type { RoleResponse, RoleTemplateResponse } from "@/types/access";
import { TEAM_BASE } from "@/components/settings/team/team-shared";
import { cn } from "@/lib/utils";

export default function TeamRolesPage() {
  const { hasPermission } = useAccess();
  const canCreate = hasPermission("team_admin.create");
  const canEdit = hasPermission("team_admin.edit");
  const canDelete = hasPermission("team_admin.delete");

  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [templates, setTemplates] = useState<RoleTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [templateKey, setTemplateKey] = useState("");

  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingRole, setDeletingRole] = useState<RoleResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([
        accessApi.listRoles(),
        accessApi.listRoleTemplates(),
      ]);
      setRoles(r);
      setTemplates(t);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const templateOptions = useMemo(
    () => [
      { value: "", label: "Custom (empty permissions)" },
      ...templates.map((t) => ({
        value: t.templateKey,
        label: `Clone: ${t.roleName}`,
      })),
    ],
    [templates]
  );

  const createRole = async () => {
    if (!roleName.trim()) return;
    setCreatingRole(true);
    try {
      await accessApi.createRole({
        roleName: roleName.trim(),
        templateKey: templateKey || undefined,
      });
      setRoleName("");
      setTemplateKey("");
      toast.success("Role created");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create role");
    } finally {
      setCreatingRole(false);
    }
  };

  const openEdit = (role: RoleResponse) => {
    setEditingRole(role);
    setEditName(role.roleName);
    setEditDescription(role.description ?? "");
  };

  const saveEdit = async () => {
    if (!editingRole || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await accessApi.updateRole(editingRole.roleId, {
        roleName: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success("Role updated");
      setEditingRole(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update role");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await accessApi.deleteRole(deletingRole.roleId);
      toast.success("Role deleted");
      setDeletingRole(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete role");
    } finally {
      setDeleting(false);
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
          <Shield className="h-5 w-5 text-primary" />
          Roles
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Define access levels for your team. Open privileges to control module and action permissions
          per role.
        </p>
      </div>

      <div className={cn("grid gap-6 xl:items-start", canCreate && "xl:grid-cols-[1fr_340px]")}>
        <Card className="border-border/70 bg-[var(--surface-card)] min-h-0">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-base">All roles</CardTitle>
            <CardDescription>
              {roles.length} role{roles.length === 1 ? "" : "s"} · System roles cannot be edited or
              deleted
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {roles.map((role) => (
                <li
                  key={role.roleId}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium truncate">{role.roleName}</p>
                      {role.system ? (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          System
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {role.description ?? "No description"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!role.system && canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(role)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {!role.system && canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingRole(role)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    ) : null}
                    <Link
                      href={`${TEAM_BASE}/roles/${encodeURIComponent(role.roleId)}/privileges`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "gap-1.5 w-full sm:w-auto",
                      })}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Privileges
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            {roles.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {canCreate
                  ? "No roles yet. Create your first role using the panel on the right."
                  : "No roles to display."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Authorize permission="team_admin.create">
          <Card className="border-border/70 bg-[var(--surface-card)] xl:sticky xl:top-24">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Create role
              </CardTitle>
              <CardDescription>
                Start from scratch or clone permissions from a template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="role-name" className="text-xs">
                  Role name
                </Label>
                <Input
                  id="role-name"
                  placeholder="e.g. Campaign Operator"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-template" className="text-xs">
                  Start from template
                </Label>
                <NativeSelect
                  id="role-template"
                  ariaLabel="Role template"
                  value={templateKey}
                  onChange={setTemplateKey}
                  options={templateOptions}
                />
              </div>
              <Button
                className="w-full"
                disabled={!roleName.trim() || creatingRole}
                onClick={() => void createRole()}
              >
                {creatingRole ? "Creating…" : "Create role"}
              </Button>
            </CardContent>
          </Card>
        </Authorize>
      </div>

      <Dialog open={editingRole != null} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Update the role name and description. Permissions are managed separately via Privileges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name">Role name</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-description">Description</Label>
              <Input
                id="edit-role-description"
                placeholder="Optional"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={!editName.trim() || savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingRole != null} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deletingRole?.roleName}</span>?
              This removes the role and its privilege grants. Users assigned to this role must be
              reassigned first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRole(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
