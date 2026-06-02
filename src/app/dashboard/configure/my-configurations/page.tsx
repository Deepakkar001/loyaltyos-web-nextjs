"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Settings, RefreshCw, Search, Trash2, Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/pill-toggle";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import type { ProgrammeOperationalStatus, ProgrammeSummaryResponse } from "@/types/onboarding";

type RowState = ProgrammeSummaryResponse & { hasConfig: boolean | null };

export default function MyConfigurationsPage() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newProgrammeDialogOpen, setNewProgrammeDialogOpen] = useState(false);
  const [newProgrammeNameDraft, setNewProgrammeNameDraft] = useState("");
  const [removeTarget, setRemoveTarget] = useState<RowState | null>(null);
  const [removing, setRemoving] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RowState | null>(null);
  const [renameNameDraft, setRenameNameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [statusUpdatingUid, setStatusUpdatingUid] = useState<string | null>(null);

  const load = async () => {
    try {
      await ensureAuthSession();
      const list = await programmeApiV2.listProgrammes();
      const enriched: RowState[] = (list || []).map((p) => ({
        ...p,
        hasConfig: p.activeConfigVersion > 0 ? true : null,
      }));
      setRows(enriched);

      await Promise.all(
        enriched.map(async (row, idx) => {
          if (row.hasConfig !== null) return;
          try {
            const cfg = await programmeApiV2.getProgrammeConfig(row.programmeUid);
            const exists = !!cfg && cfg.configVersion > 0;
            setRows((prev) => {
              const copy = [...prev];
              if (copy[idx]) copy[idx] = { ...copy[idx], hasConfig: exists };
              return copy;
            });
          } catch {
            setRows((prev) => {
              const copy = [...prev];
              if (copy[idx]) copy[idx] = { ...copy[idx], hasConfig: false };
              return copy;
            });
          }
        })
      );
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to load configurations");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.programmeUid.toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openNewProgrammeDialog = useCallback(() => {
    setNewProgrammeNameDraft("");
    setNewProgrammeDialogOpen(true);
  }, []);

  const createNewProgramme = useCallback(async () => {
    const trimmed = newProgrammeNameDraft.trim();
    if (trimmed.length < 2) {
      toast.error("Enter a programme name (at least 2 characters).");
      return;
    }
    setCreating(true);
    try {
      await ensureAuthSession();
      const created = await programmeApiV2.createProgramme({ name: trimmed });
      toast.success("Programme created. You can now configure it.");
      setRows((prev) => [...prev, { ...created, hasConfig: false }]);
      setNewProgrammeDialogOpen(false);
      setNewProgrammeNameDraft("");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Could not create programme");
    } finally {
      setCreating(false);
    }
  }, [newProgrammeNameDraft]);

  const formatArchiveError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const details = err.fieldErrors ? Object.values(err.fieldErrors).filter(Boolean) : [];
      if (details.length > 0) {
        return details.join(" ");
      }
      return err.message;
    }
    return "Could not remove programme";
  }, []);

  const confirmRemoveProgramme = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await ensureAuthSession();
      await programmeApiV2.archiveProgramme(removeTarget.programmeUid);
      setRows((prev) => prev.filter((r) => r.programmeUid !== removeTarget.programmeUid));
      toast.success(`"${removeTarget.name}" removed from your configuration list.`);
      setRemoveTarget(null);
    } catch (err) {
      toast.error(formatArchiveError(err));
    } finally {
      setRemoving(false);
    }
  }, [removeTarget, formatArchiveError]);

  const openRenameDialog = useCallback((row: RowState) => {
    setRenameTarget(row);
    setRenameNameDraft(row.name);
  }, []);

  const confirmRenameProgramme = useCallback(async () => {
    if (!renameTarget) return;
    const trimmed = renameNameDraft.trim();
    if (trimmed.length < 2) {
      toast.error("Enter a programme name (at least 2 characters).");
      return;
    }
    if (trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setRenaming(true);
    try {
      await ensureAuthSession();
      const updated = await programmeApiV2.renameProgramme(renameTarget.programmeUid, { name: trimmed });
      setRows((prev) =>
        prev.map((r) =>
          r.programmeUid === renameTarget.programmeUid
            ? {
                ...r,
                name: updated.name,
                activeConfigVersion: updated.activeConfigVersion,
                hasConfig: updated.activeConfigVersion > 0 ? true : r.hasConfig,
              }
            : r
        )
      );
      toast.success("Programme name updated.");
      setRenameTarget(null);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Could not rename programme");
    } finally {
      setRenaming(false);
    }
  }, [renameTarget, renameNameDraft]);

  const setProgrammeIntegrationActive = useCallback(
    async (row: RowState, active: boolean) => {
      const nextStatus = active ? "ACTIVE" : "DRAFT";
      if ((row.status || "DRAFT") === nextStatus) return;
      if (active && row.hasConfig !== true) {
        toast.error("Save programme configuration before activating integration for this programme.");
        return;
      }
      setStatusUpdatingUid(row.programmeUid);
      try {
        await ensureAuthSession();
        const updated = await programmeApiV2.patchProgrammeStatus(row.programmeUid, { status: nextStatus });
        setRows((prev) =>
          prev.map((r) =>
            r.programmeUid === row.programmeUid
              ? {
                  ...r,
                  status: updated.status,
                  activeConfigVersion: updated.activeConfigVersion,
                  hasConfig: updated.activeConfigVersion > 0 ? true : r.hasConfig,
                }
              : r
          )
        );
        toast.success(
          active
            ? `"${row.name}" is active for integration.`
            : `"${row.name}" is inactive — integration requests for this programme UID will be rejected.`
        );
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Could not update programme status");
      } finally {
        setStatusUpdatingUid(null);
      }
    },
    []
  );

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6">
      <Dialog open={newProgrammeDialogOpen} onOpenChange={setNewProgrammeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New programme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This name appears in your programme list and in Configure Programme. You can align it with your public
            loyalty programme name when you save configuration.
          </p>
          <Input
            autoFocus
            placeholder="e.g. North Region Rewards"
            value={newProgrammeNameDraft}
            onChange={(e) => setNewProgrammeNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createNewProgramme();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setNewProgrammeDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={creating} onClick={() => void createNewProgramme()}>
              {creating ? "Creating…" : "Create programme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={removeTarget != null} onOpenChange={(open) => !open && !removing && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove programme?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{removeTarget?.name}</span> will be removed from My
            Configurations. Its loyalty rules will be archived and linked campaigns ended automatically. They will
            no longer appear in My Rules or Campaigns. Historical points, ledger entries, and integration data are
            kept for audit and compliance.
          </p>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemoveProgramme()}
            >
              {removing ? "Removing…" : "Remove from list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename programme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This updates the name in your programme list and in saved configuration (
            <span className="font-mono text-xs">{renameTarget?.programmeUid}</span>).
          </p>
          <Input
            autoFocus
            placeholder="Programme name"
            value={renameNameDraft}
            onChange={(e) => setRenameNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmRenameProgramme();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button type="button" disabled={renaming} onClick={() => void confirmRenameProgramme()}>
              {renaming ? "Saving…" : "Save name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">My Configurations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each programme has its own configuration. Turn integration on or off per programme so only the
            programmes you use receive API traffic.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="rounded-full" onClick={openNewProgrammeDialog} disabled={loading || creating}>
            <Plus className="w-4 h-4 mr-2" />
            New Programme
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by programme name, UID, or status…"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? null : filtered.length === 0 ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <p className="text-sm font-semibold">No configurations found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new programme, or adjust your search.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button className="rounded-full" onClick={openNewProgrammeDialog} disabled={loading || creating}>
              <Plus className="w-4 h-4 mr-2" />
              Create Programme
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((r) => {
            const configured = r.hasConfig === true;
            const unknown = r.hasConfig === null;
            const operationalStatus = (r.status || "DRAFT") as ProgrammeOperationalStatus;
            const integrationActive = operationalStatus === "ACTIVE";
            const statusBusy = statusUpdatingUid === r.programmeUid;
            const canToggleIntegration =
              operationalStatus !== "ARCHIVED" && !statusBusy && (configured || integrationActive);
            return (
              <Card
                key={r.programmeUid}
                className="p-5 border-border/70 bg-[var(--surface-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <ConfigStatusBadge configured={configured} unknown={unknown} />
                      <IntegrationStatusBadge status={operationalStatus} />
                      <p className="text-sm font-semibold truncate">{r.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      UID: {r.programmeUid}
                      {" · "}
                      Config version: {r.activeConfigVersion ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {integrationActive
                      ? "API events and balance calls are accepted for this programme UID."
                      : configured
                        ? "Turn on integration when this programme should receive API traffic."
                        : "Save configuration before enabling integration."}
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">
                      {statusBusy ? "Saving…" : integrationActive ? "Integration active" : "Integration inactive"}
                    </span>
                    <PillToggle
                      pressed={integrationActive}
                      disabled={!canToggleIntegration || statusBusy}
                      onPressedChange={(next) => void setProgrammeIntegrationActive(r, next)}
                      srLabel={
                        integrationActive
                          ? `Turn off integration for ${r.name}`
                          : `Turn on integration for ${r.name}`
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/configure?programmeUid=${encodeURIComponent(r.programmeUid)}`}>
                    <Button variant="outline" className="rounded-full" size="sm">
                      <Settings className="w-3.5 h-3.5 mr-2" />
                      {configured ? "Edit configuration" : "Configure"}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    size="sm"
                    onClick={() => openRenameDialog(r)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Rename
                  </Button>
                  {r.programmeUid !== "default" ? (
                    <Button
                      variant="outline"
                      className="rounded-full text-destructive hover:text-destructive"
                      size="sm"
                      onClick={() => setRemoveTarget(r)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntegrationStatusBadge({ status }: { status: ProgrammeOperationalStatus }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900/50">
        Integration on
      </span>
    );
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Removed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300 dark:border-zinc-700">
      Integration off
    </span>
  );
}

function ConfigStatusBadge({
  configured,
  unknown,
}: {
  configured: boolean;
  unknown: boolean;
}) {
  if (unknown) {
    return (
      <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Checking…
      </span>
    );
  }
  if (configured) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/50">
        Configured
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50">
      Not configured
    </span>
  );
}
