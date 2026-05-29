"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowUpDown, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { CatalogItemCard } from "@/components/dashboard/reward-catalog/CatalogItemCard";
import {
  buildDuplicateCatalogItem,
  buildRewardCatalogJsonNode,
  defaultRewardCatalogDraft,
  mergeRewardCatalogIntoProgrammeConfig,
  newCatalogRewardUid,
  reindexCatalogItemDisplayOrder,
  rewardCatalogDraftFromConfigRoot,
  validateRewardCatalogDraft,
  type RewardCatalogDraft,
  type RewardCatalogItemDraft,
  type RewardCatalogItemStatus,
} from "@/lib/programme/reward-catalog-merge";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { cn } from "@/lib/utils";

type CatalogItemFilterStatus = "ALL" | RewardCatalogItemStatus;

function filterCatalogItems(
  items: RewardCatalogItemDraft[],
  query: string,
  statusFilter: CatalogItemFilterStatus,
  typeFilter: string
): { item: RewardCatalogItemDraft; index: number }[] {
  const q = query.trim().toLowerCase();
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && item.rewardType !== typeFilter) return false;
      if (!q) return true;
      const haystack = [item.name, item.rewardUid, item.description, item.rewardType].join(" ").toLowerCase();
      return haystack.includes(q);
    });
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
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<CatalogItemFilterStatus>("ALL");
  const [itemTypeFilter, setItemTypeFilter] = useState("ALL");

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

  useEffect(() => {
    setItemSearch("");
    setItemStatusFilter("ALL");
    setItemTypeFilter("ALL");
  }, [programmeUid]);

  const validationErrors = useMemo(() => validateRewardCatalogDraft(draft), [draft]);
  const activeCount = useMemo(() => draft.items.filter((i) => i.status === "ACTIVE").length, [draft.items]);

  const filteredCatalogItems = useMemo(
    () => filterCatalogItems(draft.items, itemSearch, itemStatusFilter, itemTypeFilter),
    [draft.items, itemSearch, itemStatusFilter, itemTypeFilter]
  );

  const hasItemFilters = itemSearch.trim() !== "" || itemStatusFilter !== "ALL" || itemTypeFilter !== "ALL";

  const clearItemFilters = () => {
    setItemSearch("");
    setItemStatusFilter("ALL");
    setItemTypeFilter("ALL");
  };

  const catalogSortableIds = useMemo(() => draft.items.map((item) => item.rewardUid), [draft.items]);

  const rewardTypeOptions = useMemo(
    () => draft.rewardTypes.map((t) => ({ value: t.typeCode, label: t.label })),
    [draft.rewardTypes]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorderCatalogItems = (activeUid: string, overUid: string) => {
    setDraft((prev) => {
      const oldIndex = prev.items.findIndex((i) => i.rewardUid === activeUid);
      const newIndex = prev.items.findIndex((i) => i.rewardUid === overUid);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      return {
        ...prev,
        items: reindexCatalogItemDisplayOrder(arrayMove(prev.items, oldIndex, newIndex)),
      };
    });
    setEditing(true);
  };

  const onCatalogDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderCatalogItems(String(active.id), String(over.id));
  };

  const updateItem = (idx: number, patch: Partial<RewardCatalogItemDraft>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setDraft((prev) => {
      const uid = newCatalogRewardUid(prev.items.map((i) => i.rewardUid));
      return {
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
      };
    });
    setEditing(true);
  };

  const removeItem = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: reindexCatalogItemDisplayOrder(prev.items.filter((_, i) => i !== idx)),
    }));
    setEditing(true);
  };

  const duplicateItem = (sourceIndex: number) => {
    const source = draft.items[sourceIndex];
    if (!source) return;

    setDraft((prev) => {
      const src = prev.items[sourceIndex];
      if (!src) return prev;
      const copy = buildDuplicateCatalogItem(
        src,
        prev.items.map((i) => i.rewardUid)
      );
      const next = [...prev.items];
      next.splice(sourceIndex + 1, 0, copy);
      return { ...prev, items: reindexCatalogItemDisplayOrder(next) };
    });
    setEditing(true);
    toast.success("Reward duplicated as draft. Review the copy and save catalog.");
  };

  const removeRewardType = (typeIndex: number) => {
    const typeToRemove = draft.rewardTypes[typeIndex];
    if (!typeToRemove) return;
    if (draft.rewardTypes.length <= 1) {
      toast.error("At least one reward type is required.");
      return;
    }

    const removedCode = typeToRemove.typeCode.trim();
    const fallbackType = draft.rewardTypes.filter((_, i) => i !== typeIndex)[0]?.typeCode.trim() || "CUSTOM";
    const affectedCount = draft.items.filter((item) => item.rewardType.trim() === removedCode).length;

    setDraft((prev) => ({
      ...prev,
      rewardTypes: prev.rewardTypes.filter((_, i) => i !== typeIndex),
      items:
        affectedCount > 0
          ? prev.items.map((item) =>
              item.rewardType.trim() === removedCode ? { ...item, rewardType: fallbackType } : item
            )
          : prev.items,
    }));
    setEditing(true);

    if (affectedCount > 0) {
      toast.success(
        `Type removed. ${affectedCount} catalog item${affectedCount === 1 ? "" : "s"} set to "${fallbackType}".`
      );
    } else {
      toast.success("Reward type removed.");
    }
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

      <Card className="sticky top-14 z-20 xl:top-16 p-4 border-border/70 bg-[var(--surface-card)] shadow-sm overflow-visible">
        <div className="flex items-start gap-3 overflow-x-auto">
          <div className="space-y-2 min-w-[140px] flex-1 max-w-[280px] shrink">
            <Label className="text-xs text-muted-foreground">Search catalog items</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Name, UID, description…"
                className="pl-9 pr-9"
                aria-label="Search catalog items"
              />
              {itemSearch ? (
                <button
                  type="button"
                  onClick={() => setItemSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2 w-[128px] shrink-0">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <NativeSelect
              ariaLabel="Filter by status"
              value={itemStatusFilter}
              onChange={(v) => setItemStatusFilter(v as CatalogItemFilterStatus)}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "DRAFT", label: "Draft" },
                { value: "ACTIVE", label: "Active" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
          </div>
          <div className="space-y-2 w-[128px] shrink-0">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <NativeSelect
              ariaLabel="Filter by reward type"
              value={itemTypeFilter}
              onChange={setItemTypeFilter}
              options={[
                { value: "ALL", label: "All types" },
                ...draft.rewardTypes.map((t) => ({ value: t.typeCode, label: t.label })),
              ]}
            />
          </div>
          {hasItemFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full shrink-0 self-end"
              onClick={clearItemFilters}
            >
              Clear
            </Button>
          ) : null}
          <div className="space-y-2 min-w-[280px] shrink-0 ml-auto">
            <Label className="text-xs text-muted-foreground">Programme</Label>
            <NativeSelect
              ariaLabel="Programme"
              value={programmeUid}
              onChange={setProgrammeUid}
              options={programmeRows.map((p) => ({ value: p.programmeUid, label: p.name }))}
            />
            <div className="flex flex-nowrap gap-1.5 pt-0.5 min-w-0">
              <Badge variant="secondary" className="shrink-0">
                {draft.items.length} items
              </Badge>
              <Badge variant="secondary" className="shrink-0">
                {activeCount} active
              </Badge>
              <Badge variant="secondary" className="shrink-0">
                {draft.rewardTypes.length} types
              </Badge>
              {hasItemFilters ? (
                <Badge variant="outline" className="shrink-0">
                  {filteredCatalogItems.length} shown
                </Badge>
              ) : null}
            </div>
          </div>
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
                <div
                  key={`type-${t.typeCode}-${ti}`}
                  className="flex items-start gap-2 rounded-xl border border-border p-3"
                >
                  <div className="grid flex-1 grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Type code</Label>
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
                        placeholder="e.g. VOUCHER"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Display name</Label>
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
                        placeholder="e.g. Voucher — shown when picking a type"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
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
                        placeholder="Short description for admins"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 mt-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40"
                    onClick={() => removeRewardType(ti)}
                    disabled={draft.rewardTypes.length <= 1}
                    aria-label={`Delete reward type ${t.label || t.typeCode}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Catalog items</p>
                {draft.items.length > 0 && !hasItemFilters ? (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5 max-w-xl">
                    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    Drag the <span className="font-medium text-foreground">grip handle</span> on each card to change display
                    order. Top = first in member apps. Save catalog when finished.
                  </p>
                ) : null}
                {draft.items.length > 0 && hasItemFilters ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200 max-w-xl">
                    Clear search/filters to drag and reorder items.
                  </p>
                ) : null}
              </div>
              <Button type="button" className="rounded-full shrink-0" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add reward
              </Button>
            </div>

            {draft.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rewards yet. Add items your members can redeem with points.</p>
            ) : filteredCatalogItems.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No catalog items match your search or filters.</p>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={clearItemFilters}>
                  Clear filters
                </Button>
              </div>
            ) : hasItemFilters ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Showing {filteredCatalogItems.length} of {draft.items.length} items
                </p>
                {filteredCatalogItems.map(({ item, index: idx }) => (
                  <CatalogItemCard
                    key={`${item.rewardUid}-${idx}`}
                    item={item}
                    positionLabel={item.displayOrder + 1}
                    rewardTypeOptions={rewardTypeOptions}
                    onUpdate={(patch) => updateItem(idx, patch)}
                    onRemove={() => removeItem(idx)}
                    onDuplicate={() => duplicateItem(idx)}
                  />
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onCatalogDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext items={catalogSortableIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {draft.items.map((item, idx) => (
                      <CatalogItemCard
                        key={item.rewardUid}
                        sortableId={item.rewardUid}
                        dragEnabled
                        item={item}
                        positionLabel={idx + 1}
                        rewardTypeOptions={rewardTypeOptions}
                        onUpdate={(patch) => updateItem(idx, patch)}
                        onRemove={() => removeItem(idx)}
                        onDuplicate={() => duplicateItem(idx)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
