"use client";

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { useMemo } from "react";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { ComparisonOp, ConditionField, ConditionGroup, ConditionNode, ConditionTreeDraft, LeafCondition, LogicalOp, NotNode } from "./types";
import { useConditionFieldCatalog } from "@/components/loyalty-rules/condition-field-catalog-context";
import {
  defaultFieldFromCatalog,
  opsForCatalogField,
  resolveCatalogFieldType,
  type ConditionFieldValueType,
} from "@/lib/rules/condition-field-catalog";

function StyledSelect({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-xl bg-[var(--surface-sunken)] px-3 pr-9 text-sm text-foreground outline-none ring-1 ring-foreground/10 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function LogicalOpSelect({
  value,
  onChange,
  className,
}: {
  value: LogicalOp;
  onChange: (next: LogicalOp) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LogicalOp)}
        className="h-9 w-full appearance-none rounded-full bg-[var(--surface-sunken)] px-3 pr-9 text-sm text-foreground outline-none ring-1 ring-foreground/10 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
      >
        <option value="AND">AND</option>
        <option value="OR">OR</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
}

function defaultLeaf(defaultField: string): LeafCondition {
  return {
    id: newId(),
    kind: "leaf",
    field: defaultField,
    op: defaultField.includes("amount") ? "GTE" : "EQ",
    value: defaultField.includes("amount") ? 500 : "",
  };
}

export function ConditionBuilder({
  value,
  onChange,
}: {
  value: ConditionTreeDraft;
  onChange: (next: ConditionTreeDraft) => void;
}) {
  const catalog = useConditionFieldCatalog();
  const defaultField = defaultFieldFromCatalog(catalog);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const group: ConditionGroup | null = value.kind === "group" ? value : null;

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">When these conditions match</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop to reorder conditions. Use AND/OR to control how they combine.
              {catalog.loading
                ? " Loading fields from your programme event schema…"
                : ` Fields reflect the ${catalog.triggerEventType} payload for programme ${catalog.programmeUid}.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={value.kind === "everyone" ? "default" : "outline"}
              onClick={() => onChange({ kind: "everyone" })}
            >
              Applies to everyone
            </Button>
            <Button
              type="button"
              variant={value.kind === "group" ? "default" : "outline"}
              disabled={catalog.fields.length === 0}
              onClick={() =>
                onChange({
                  kind: "group",
                  id: newId(),
                  op: "AND",
                  nodes: group?.nodes?.length ? group.nodes : defaultField ? [defaultLeaf(defaultField)] : [],
                })
              }
            >
              Add conditions
            </Button>
          </div>
        </div>

        {value.kind === "everyone" ? (
          <div className="mt-4 rounded-xl border border-border bg-[var(--surface-sunken)] p-4">
            <p className="text-sm">This rule will apply to everyone (no conditions).</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Group operator</Label>
              <LogicalOpSelect
                value={(group?.op ?? "AND") as LogicalOp}
                onChange={(v) => onChange({ ...(group as ConditionGroup), op: v })}
                className="w-[140px]"
              />
            </div>

            {group ? (
              <ConditionGroupEditor
                group={group}
                sensors={sensors}
                defaultField={defaultField}
                onChange={(g) => onChange(g)}
              />
            ) : null}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!defaultField}
                onClick={() => {
                  if (!defaultField) return;
                  const g = group!;
                  onChange({ ...g, nodes: [...g.nodes, defaultLeaf(defaultField)] });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add condition
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full ml-2"
                onClick={() => {
                  const g = group!;
                  const newGroup: ConditionGroup = { id: newId(), kind: "group", op: "AND", nodes: [defaultLeaf(defaultField)] };
                  onChange({ ...g, nodes: [...g.nodes, newGroup] });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add group
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableLeafRow({
  node,
  onChange,
  onDelete,
  onWrapNot,
}: {
  node: LeafCondition;
  onChange: (next: LeafCondition) => void;
  onDelete: () => void;
  onWrapNot: () => void;
}) {
  const catalog = useConditionFieldCatalog();
  const fieldOptions = catalog.fields;
  const sortable = useSortable({ id: node.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const selected = fieldOptions.find((f) => f.value === node.field) ?? fieldOptions[0];
  const fieldMetaType = resolveCatalogFieldType(catalog, node.field || selected?.value);
  const opOptions = opsForCatalogField(catalog, node.field || selected?.value);
  const op = opOptions.some((o) => o.value === node.op) ? node.op : opOptions[0]!.value;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border bg-background p-3",
        sortable.isDragging && "opacity-80 shadow-lg"
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[28px_1.4fr_0.9fr_1fr_40px] gap-2 items-end">
        <button
          type="button"
          className={cn(
            "h-9 w-7 inline-flex items-center justify-center rounded-lg border border-border bg-[var(--surface-sunken)]",
            "cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="Drag to reorder"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Field</Label>
          <StyledSelect
            ariaLabel="Condition field"
            value={node.field}
            onChange={(v) => {
              const nextType = resolveCatalogFieldType(catalog, v);
              const nextOp = opsForCatalogField(catalog, v)[0]!.value;
              onChange({
                ...node,
                field: v as ConditionField,
                op: nextOp,
                value: nextType === "number" ? 0 : "",
              });
            }}
            options={fieldOptions.map((f) => ({ value: f.value, label: f.label }))}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Operator</Label>
          <StyledSelect
            ariaLabel="Condition operator"
            value={op}
            onChange={(v) => {
              const nextOp = v as ComparisonOp;
              onChange({
                ...node,
                op: nextOp,
                value: nextOp === "BETWEEN" ? [0, 0] : nextOp === "IN" || nextOp === "NOT_IN" ? [] : node.value ?? "",
              });
            }}
            options={opOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>

        <ConditionValueEditor node={node} fieldType={fieldMetaType} onChange={onChange} />

        <Button type="button" variant="ghost" className="h-9 w-9 p-0" onClick={onDelete} aria-label="Delete condition">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="mt-2 flex justify-end">
        <Button type="button" variant="ghost" className="h-8 text-xs" onClick={onWrapNot}>
          Wrap with NOT
        </Button>
      </div>
    </div>
  );
}

function ConditionValueEditor({
  node,
  fieldType,
  onChange,
}: {
  node: LeafCondition;
  fieldType: ConditionFieldValueType;
  onChange: (next: LeafCondition) => void;
}) {
  if (node.op === "IS_NULL" || node.op === "IS_NOT_NULL") {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Value</Label>
        <div className="h-9 rounded-xl border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground">
          No value required
        </div>
      </div>
    );
  }

  if (node.op === "BETWEEN") {
    const v = Array.isArray(node.value) && node.value.length === 2 ? (node.value as [number, number]) : [0, 0];
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Value (range)</Label>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 rounded-xl"
            type="number"
            value={String(v[0] ?? 0)}
            onChange={(e) => onChange({ ...node, value: [Number(e.target.value), v[1] ?? 0] })}
            aria-label="Lower bound"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            className="h-9 rounded-xl"
            type="number"
            value={String(v[1] ?? 0)}
            onChange={(e) => onChange({ ...node, value: [v[0] ?? 0, Number(e.target.value)] })}
            aria-label="Upper bound"
          />
        </div>
      </div>
    );
  }

  if (node.op === "IN" || node.op === "NOT_IN") {
    const raw = Array.isArray(node.value) ? (node.value as Array<string | number>).join(", ") : "";
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Value (comma-separated)</Label>
        <Input
          className="h-9 rounded-xl"
          value={raw}
          onChange={(e) => {
            const parts = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const parsed = fieldType === "number" ? parts.map((p) => Number(p)).filter((n) => Number.isFinite(n)) : parts;
            onChange({ ...node, value: parsed });
          }}
          placeholder={fieldType === "number" ? "e.g. 100, 200, 500" : "e.g. Gold, Platinum"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Value</Label>
      <Input
        className="h-9 rounded-xl"
        type={fieldType === "number" ? "number" : "text"}
        value={node.value == null ? "" : String(node.value)}
        onChange={(e) => onChange({ ...node, value: fieldType === "number" ? Number(e.target.value) : e.target.value })}
        placeholder={fieldType === "number" ? "e.g. 500" : "Enter value"}
      />
    </div>
  );
}

function ConditionGroupEditor({
  group,
  sensors,
  defaultField,
  onChange,
}: {
  group: ConditionGroup;
  sensors: ReturnType<typeof useSensors>;
  defaultField: string;
  onChange: (next: ConditionGroup) => void;
}) {
  const ids = useMemo(() => group.nodes.map((n) => n.id), [group.nodes]);

  const onDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const oldIndex = group.nodes.findIndex((n) => n.id === active.id);
    const newIndex = group.nodes.findIndex((n) => n.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...group, nodes: arrayMove(group.nodes, oldIndex, newIndex) });
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {group.nodes.map((n) => (
              <ConditionNodeEditor
                key={n.id}
                node={n}
                sensors={sensors}
                defaultField={defaultField}
                onChange={(next) => onChange({ ...group, nodes: group.nodes.map((x) => (x.id === n.id ? next : x)) })}
                onDelete={() => onChange({ ...group, nodes: group.nodes.filter((x) => x.id !== n.id) })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ConditionNodeEditor({
  node,
  sensors,
  defaultField,
  onChange,
  onDelete,
}: {
  node: ConditionNode;
  sensors: ReturnType<typeof useSensors>;
  defaultField: string;
  onChange: (next: ConditionNode) => void;
  onDelete: () => void;
}) {
  if (node.kind === "leaf") {
    return (
      <SortableLeafRow
        node={node}
        onChange={onChange as (n: LeafCondition) => void}
        onDelete={onDelete}
        onWrapNot={() => {
          const wrapped: NotNode = { id: newId(), kind: "not", node };
          onChange(wrapped);
        }}
      />
    );
  }
  if (node.kind === "not") {
    return (
      <div className="rounded-xl border border-dashed border-border bg-[var(--surface-sunken)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">NOT</p>
          <Button type="button" variant="ghost" className="h-8 w-8 p-0" onClick={onDelete} aria-label="Delete NOT">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="mt-2">
          <ConditionNodeEditor
            node={node.node}
            sensors={sensors}
            defaultField={defaultField}
            onChange={(inner) => onChange({ ...node, node: inner })}
            onDelete={() => onChange(node.node)}
          />
        </div>
      </div>
    );
  }

  // group
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Group</p>
          <LogicalOpSelect value={node.op} onChange={(v) => onChange({ ...node, op: v })} className="w-[120px]" />
        </div>
        <Button type="button" variant="ghost" className="h-8 w-8 p-0" onClick={onDelete} aria-label="Delete group">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="mt-3">
        <ConditionGroupEditor group={node} sensors={sensors} defaultField={defaultField} onChange={(g) => onChange(g)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => onChange({ ...node, nodes: [...node.nodes, defaultLeaf(defaultField)] })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add condition
        </Button>
      </div>
    </div>
  );
}

