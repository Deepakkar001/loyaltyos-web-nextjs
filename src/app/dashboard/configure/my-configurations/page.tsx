"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Settings, RefreshCw, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import type { ProgrammeSummaryResponse } from "@/types/onboarding";

type RowState = ProgrammeSummaryResponse & { hasConfig: boolean | null };

export default function MyConfigurationsPage() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newProgrammeDialogOpen, setNewProgrammeDialogOpen] = useState(false);
  const [newProgrammeNameDraft, setNewProgrammeNameDraft] = useState("");

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">My Configurations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each programme has its own configuration (points economics, tiers, expiry, event schema).
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
            return (
              <Card
                key={r.programmeUid}
                className="p-5 border-border/70 bg-[var(--surface-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <ConfigStatusBadge configured={configured} unknown={unknown} />
                      <p className="text-sm font-semibold truncate">{r.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      UID: {r.programmeUid}
                      {" · "}
                      Programme status: {r.status || "—"}
                      {" · "}
                      Active config version: {r.activeConfigVersion ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/configure?programmeUid=${encodeURIComponent(r.programmeUid)}`}>
                    <Button variant="outline" className="rounded-full" size="sm">
                      <Settings className="w-3.5 h-3.5 mr-2" />
                      {configured ? "Edit configuration" : "Configure"}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
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
