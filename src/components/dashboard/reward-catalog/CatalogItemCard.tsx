"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { RewardCatalogItemDraft, RewardCatalogItemStatus } from "@/lib/programme/reward-catalog-merge";
import { cn } from "@/lib/utils";

type RewardTypeOption = { value: string; label: string };

type CatalogItemCardProps = {
  item: RewardCatalogItemDraft;
  positionLabel: number;
  rewardTypeOptions: RewardTypeOption[];
  onUpdate: (patch: Partial<RewardCatalogItemDraft>) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  dragEnabled?: boolean;
  sortableId?: string;
};

function CatalogItemFields({
  item,
  positionLabel,
  rewardTypeOptions,
  onUpdate,
  onRemove,
  onDuplicate,
  dragHandle,
}: CatalogItemCardProps & {
  dragHandle?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {dragHandle}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.name || item.rewardUid}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Display order #{positionLabel}
              <span className="mx-1.5 text-border">·</span>
              <span className="font-mono">displayOrder={item.displayOrder}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onDuplicate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-8"
              onClick={onDuplicate}
              aria-label={`Duplicate ${item.name || item.rewardUid}`}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicate
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40"
            onClick={onRemove}
            aria-label="Remove reward"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Reward UID</Label>
          <Input
            value={item.rewardUid}
            readOnly
            aria-readonly="true"
            className="bg-muted/50 font-mono text-xs cursor-default"
            title="Auto-generated when the reward is created. Used by APIs and loyalty rules."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Display name</Label>
          <Input value={item.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <NativeSelect
            ariaLabel="Reward type"
            value={item.rewardType}
            onChange={(v) => onUpdate({ rewardType: v })}
            options={rewardTypeOptions}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <NativeSelect
            ariaLabel="Status"
            value={item.status}
            onChange={(v) => onUpdate({ status: v as RewardCatalogItemStatus })}
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
            onChange={(e) => onUpdate({ pointsCost: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Input value={item.description} onChange={(e) => onUpdate({ description: e.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Metadata (JSON — partner SKU, URLs, etc.)</Label>
          <Textarea
            rows={3}
            className="font-mono text-xs"
            value={item.metadataJson}
            onChange={(e) => onUpdate({ metadataJson: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

export function CatalogItemCard({ dragEnabled = false, sortableId, ...props }: CatalogItemCardProps) {
  if (!dragEnabled || !sortableId) {
    return (
      <div className="rounded-2xl border border-border p-4 space-y-3 bg-[var(--surface-sunken)]">
        <CatalogItemFields {...props} />
      </div>
    );
  }

  return <SortableCatalogItemCard sortableId={sortableId} {...props} />;
}

function SortableCatalogItemCard({
  sortableId,
  item,
  ...props
}: CatalogItemCardProps & { sortableId: string }) {
  const sortable = useSortable({ id: sortableId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const dragHandle = (
    <button
      type="button"
      className={cn(
        "mt-0.5 h-9 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-[var(--surface-card)]",
        "cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring touch-none"
      )}
      aria-label={`Drag to reorder ${item.name || item.rewardUid}`}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-border p-4 space-y-3 bg-[var(--surface-sunken)]",
        sortable.isDragging && "opacity-90 shadow-lg ring-2 ring-ring/30 z-10"
      )}
    >
      <CatalogItemFields {...props} item={item} dragHandle={dragHandle} />
    </div>
  );
}
