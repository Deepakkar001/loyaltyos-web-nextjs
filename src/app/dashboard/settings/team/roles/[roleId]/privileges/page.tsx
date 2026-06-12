"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { accessApi } from "@/lib/access/access-api";
import type { PrivilegeMatrixResponse, PrivilegeRowDto, TenantUserResponse } from "@/types/access";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAccess } from "@/lib/access/use-access";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function RolePrivilegesPage() {
  const params = useParams();
  const roleId = params.roleId as string;
  const { refreshAccess } = useAccess();

  const [matrix, setMatrix] = useState<PrivilegeMatrixResponse | null>(null);
  const [users, setUsers] = useState<TenantUserResponse[]>([]);
  const [userId, setUserId] = useState("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, u] = await Promise.all([
        accessApi.loadPrivileges({ roleId, userId: userId === "select" ? undefined : userId }),
        accessApi.listUsers(),
      ]);
      setMatrix(m);
      setUsers(u);
      setSelected(new Set(m.rows.filter((r) => r.selected).map((r) => r.permissionKey)));
    } catch {
      toast.error("Failed to load privileges");
    } finally {
      setLoading(false);
    }
  }, [roleId, userId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!matrix) return [];
    const map = new Map<string, PrivilegeRowDto[]>();
    for (const row of matrix.rows) {
      if (!row.assignable) continue;
      const list = map.get(row.navSection) ?? [];
      list.push(row);
      map.set(row.navSection, list);
    }
    return Array.from(map.entries());
  }, [matrix]);

  const toggle = (key: string) => {
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
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <Link
        href="/dashboard/settings/team"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to team
      </Link>

      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold">Assign privileges</h1>
          <p className="text-sm text-muted-foreground">
            Role-level grants or per-user overrides (deny inherited permissions).
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-muted-foreground">User override</label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="select">Role only</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.email}
              </option>
            ))}
          </select>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map(([section, rows]) => (
          <section key={section}>
            <h2 className="text-sm font-semibold mb-3">{section}</h2>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Module</th>
                    {matrix?.actionKeys.map((a) => (
                      <th key={a} className="p-3 text-center capitalize">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    rows.reduce((acc, row) => {
                      if (!acc.has(row.moduleKey)) acc.set(row.moduleKey, row);
                      return acc;
                    }, new Map<string, PrivilegeRowDto>())
                  ).map(([moduleKey, first]) => {
                    const moduleRows = rows.filter((r) => r.moduleKey === moduleKey);
                    return (
                      <tr key={moduleKey} className="border-t">
                        <td className="p-3 font-medium">{first.moduleName}</td>
                        {matrix?.actionKeys.map((actionKey) => {
                          const row = moduleRows.find((r) => r.actionKey === actionKey);
                          if (!row) return <td key={actionKey} className="p-3" />;
                          return (
                            <td key={actionKey} className="p-3 text-center">
                              <Checkbox
                                checked={selected.has(row.permissionKey)}
                                disabled={!row.assignable}
                                onCheckedChange={() => toggle(row.permissionKey)}
                              />
                              {row.denied ? (
                                <span className="block text-[10px] text-destructive">denied</span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
