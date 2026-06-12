"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Authorize } from "@/components/access/authorize";
import { accessApi } from "@/lib/access/access-api";
import type { RoleResponse, RoleTemplateResponse, TenantUserResponse } from "@/types/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Shield, UserPlus, Users } from "lucide-react";

export default function TeamSettingsPage() {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [templates, setTemplates] = useState<RoleTemplateResponse[]>([]);
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, t, u] = await Promise.all([
        accessApi.listRoles(),
        accessApi.listRoleTemplates(),
        accessApi.listUsers(),
      ]);
      setRoles(r);
      setTemplates(t);
      setUsers(u);
      if (!inviteRoleId && r.length > 0) {
        setInviteRoleId(r.find((x) => x.system)?.roleId ?? r[0]!.roleId);
      }
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [inviteRoleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createRole = async () => {
    if (!roleName.trim()) return;
    try {
      await accessApi.createRole({
        roleName: roleName.trim(),
        templateKey: templateKey || undefined,
      });
      setRoleName("");
      setTemplateKey("");
      toast.success("Role created");
      await load();
    } catch {
      toast.error("Failed to create role");
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId) return;
    try {
      const invited = await accessApi.inviteUser({
        email: inviteEmail.trim(),
        fullName: inviteName.trim() || undefined,
        roleId: inviteRoleId,
        temporaryPassword: invitePassword.trim() || undefined,
      });
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      if (invited.inviteToken) {
        const link = `${window.location.origin}/accept-invite?email=${encodeURIComponent(invited.email)}&token=${encodeURIComponent(invited.inviteToken)}`;
        toast.success(
          (t) => (
            <span>
              Invite created. Share this link:{" "}
              <button type="button" className="underline" onClick={() => { void navigator.clipboard.writeText(link); toast.dismiss(t.id); toast.success("Link copied"); }}>
                Copy accept link
              </button>
            </span>
          ),
          { duration: 12000 }
        );
      } else {
        toast.success("User invited");
      }
      await load();
    } catch {
      toast.error("Failed to invite user");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team & Permissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and module privileges for your organisation.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Roles
        </h2>
        <ul className="space-y-2">
          {roles.map((role) => (
            <li
              key={role.roleId}
              className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{role.roleName}</p>
                {role.description ? (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                ) : null}
              </div>
              <Link
                href={`/dashboard/settings/team/roles/${encodeURIComponent(role.roleId)}/privileges`}
                className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
              >
                Assign privileges
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Input
            placeholder="New role name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="max-w-xs"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            <option value="">Custom (empty)</option>
            {templates.map((t) => (
              <option key={t.templateKey} value={t.templateKey}>
                Clone: {t.roleName}
              </option>
            ))}
          </select>
          <Authorize permission="team_admin.create">
            <Authorize permission="team_admin.create">
            <Button onClick={() => void createRole()}>Create role</Button>
          </Authorize>
          </Authorize>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Users
        </h2>
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.userId} className="rounded-lg border px-4 py-3 text-sm">
              <p className="font-medium">{user.fullName ?? user.email}</p>
              <p className="text-muted-foreground text-xs">{user.email} · {user.status}</p>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 pt-2">
          <Input placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <Input placeholder="Full name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.roleName}
              </option>
            ))}
          </select>
          <Input
            type="password"
            placeholder="Temporary password (optional)"
            value={invitePassword}
            onChange={(e) => setInvitePassword(e.target.value)}
          />
        </div>
        <Authorize permission="team_admin.create">
          <Authorize permission="team_admin.create">
          <Button onClick={() => void invite()}>Invite user</Button>
        </Authorize>
        </Authorize>
      </section>
    </div>
  );
}
