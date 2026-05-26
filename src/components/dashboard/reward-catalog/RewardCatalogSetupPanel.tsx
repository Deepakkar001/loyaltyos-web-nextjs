"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import {
  buildRewardCatalogJsonNode,
  defaultRewardCatalogDraft,
  mergeRewardCatalogIntoProgrammeConfig,
  rewardCatalogDraftFromConfigRoot,
  validateRewardCatalogDraft,
  type RewardCatalogDraft,
  type RewardCatalogItemDraft,
  type RewardCatalogItemStatus,
} from "@/lib/programme/reward-catalog-merge";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { cn } from "@/lib/utils";

function newRewardUid() {
  return `reward_${Date.now().toString(36)}`;
}

export function RewardCatalogSetupPanel() {
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const [programmeUid, setProgrammeUid] = useState("default");
  const [programmeRows, setProgrammeRows] = useState([{ programmeUid: "default", name: "Default programme" }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [configRoot, setConfigRoot] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<RewardCatalogDraft>(defaultRewardCatalogDraft());
  const [baseline, setBaseline] = useState<RewardCatalogDraft>(defaultRewardCatalogDraft());

  const loadProgrammes = useCallback(async () => {
    try {
      await ensureAuthSession();
      const list = await programmeApiV2.listProgrammes();
      setProgrammeRows(mergeProgrammeDropdownRows(list));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      await ensureAuthSession();
      const res = await programmeApiV2.getProgrammeConfig(programmeUid);
      const root = (res.config ?? {}) as Record<string, unknown>;
      const catalogDraft = rewardCatalogDraftFromConfigRoot(root);
      setConfigRoot(root);
      setConfigVersion(res.configVersion ?? 0);
      setDraft(catalogDraft);
      setBaseline(catalogDraft);
      setEditing(false);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, programmeUid]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const validationErrors = useMemo(() => validateRewardCatalogDraft(draft), [draft]);
  const activeCount = useMemo(() => draft.items.filter((i) => i.status === "ACTIVE").length, [draft.items]);

  const updateItem = (idx: number, patch: Partial<RewardCatalogItemDraft>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    const uid = newRewardUid();
    setDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          rewardUid: uid,
          name: "New reward",
          rewardType: prev.rewardTypes[0]?.typeCode ?? "CUSTOM",
          status: "DRAFT",
          pointsCost: 100,
          displayOrder: prev.items.length,
          description: "",
          metadataJson: "{}",
        },
      ],
    }));
    setEditing(true);
  };

  const removeItem = (idx: number) => {
    setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    const errors = validateRewardCatalogDraft(draft);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      await ensureAuthSession();
      const merged = mergeRewardCatalogIntoProgrammeConfig(configRoot, draft);
      const res = await programmeApiV2.upsertProgrammeConfig(programmeUid, {
        config: merged,
      });
      const root = (res.config ?? merged) as Record<string, unknown>;
      const nextDraft = rewardCatalogDraftFromConfigRoot(root);
      setConfigRoot(root);
      setConfigVersion(res.configVersion ?? configVersion + 1);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setEditing(false);
      toast.success("Rewards catalog saved.");
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Failed to save catalog");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rewards Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Define redeemable rewards for your programme. Tenants add new types and items in config — no code changes.
            Integration redemption can reference <code className="text-xs">catalogRewardUid</code> instead of raw points.
          </p>
        </div>
        <Link href="/dashboard/configure" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Programme settings
        </Link>
      </div>

      <Card className="p-4 border-border/70 bg-[var(--surface-card)] flex flex-wrap gap-4 items-end">
        <div className="space-y-2 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Programme</Label>
          <NativeSelect
            ariaLabel="Programme"
            value={programmeUid}
            onChange={setProgrammeUid}
            options={programmeRows.map((p) => ({ value: p.programmeUid, label: p.name }))}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">{draft.items.length} items</Badge>
          <Badge variant="secondary">{activeCount} active</Badge>
          <Badge variant="secondary">{draft.rewardTypes.length} types</Badge>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading catalog…</p>
      ) : (
        <>
          <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Reward types (tenant-defined)</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setDraft((prev) => ({
                    ...prev,
                    rewardTypes: [
                      ...prev.rewardTypes,
                      { typeCode: `TYPE_${prev.rewardTypes.length + 1}`, label: "New type", description: "" },
                    ],
                  }));
                  setEditing(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add type
              </Button>
            </div>
            <div className="space-y-3">
              {draft.rewardTypes.map((t, ti) => (
                <div key={`type-${ti}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border p-3">
                  <Input
                    value={t.typeCode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => ({
                        ...prev,
                        rewardTypes: prev.rewardTypes.map((row, i) => (i === ti ? { ...row, typeCode: v } : row)),
                      }));
                      setEditing(true);
                    }}
                    placeholder="typeCode e.g. VOUCHER"
                  />
                  <Input
                    value={t.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => ({
                        ...prev,
                        rewardTypes: prev.rewardTypes.map((row, i) => (i === ti ? { ...row, label: v } : row)),
                      }));
                      setEditing(true);
                    }}
                    placeholder="Label"
                  />
                  <Input
                    value={t.description}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((prev) => ({
                        ...prev,
                        rewardTypes: prev.rewardTypes.map((row, i) => (i === ti ? { ...row, description: v } : row)),
                      }));
                      setEditing(true);
                    }}
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Catalog items</p>
              <Button type="button" className="rounded-full" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add reward
              </Button>
            </div>

            {draft.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rewards yet. Add items your members can redeem with points.</p>
            ) : (
              <div className="space-y-4">
                {draft.items.map((item, idx) => (
                  <div key={item.rewardUid} className="rounded-2xl border border-border p-4 space-y-3 bg-[var(--surface-sunken)]">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium">{item.name || item.rewardUid}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Reward UID</Label>
                        <Input value={item.rewardUid} onChange={(e) => updateItem(idx, { rewardUid: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Display name</Label>
                        <Input value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <NativeSelect
                          ariaLabel="Reward type"
                          value={item.rewardType}
                          onChange={(v) => updateItem(idx, { rewardType: v })}
                          options={draft.rewardTypes.map((t) => ({ value: t.typeCode, label: t.label }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <NativeSelect
                          ariaLabel="Status"
                          value={item.status}
                          onChange={(v) => updateItem(idx, { status: v as RewardCatalogItemStatus })}
                          options={[
                            { value: "DRAFT", label: "Draft" },
                            { value: "ACTIVE", label: "Active" },
                            { value: "ARCHIVED", label: "Archived" },
                          ]}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Points cost</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.pointsCost}
                          onChange={(e) => updateItem(idx, { pointsCost: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Metadata (JSON — partner SKU, URLs, etc.)</Label>
                        <Textarea
                          rows={3}
                          className="font-mono text-xs"
                          value={item.metadataJson}
                          onChange={(e) => updateItem(idx, { metadataJson: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {validationErrors.length > 0 && editing ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{validationErrors[0]}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={saving}
              onClick={() => {
                setDraft(baseline);
                setEditing(false);
              }}
            >
              Reset
            </Button>
            <Button type="button" className="rounded-full" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save catalog"}
            </Button>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Preview JSON (rewardCatalog)</summary>
            <pre className="mt-2 overflow-auto rounded-xl border border-border bg-[var(--surface-sunken)] p-3">
              {JSON.stringify(buildRewardCatalogJsonNode(draft), null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
