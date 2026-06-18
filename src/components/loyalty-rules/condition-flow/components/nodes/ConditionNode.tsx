"use client";

import { useEffect, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ComparisonOp, ConditionField } from "../../../condition-builder/types";
import { OPERATOR_LABELS, type ConditionNodeData } from "../../types";
import { useConditionFieldCatalog } from "@/components/loyalty-rules/condition-field-catalog-context";
import { opsForCatalogField } from "@/lib/rules/condition-field-catalog";
import { useNodeErrorLevel } from "../../errorsContext";
import { useConditionFlowActions } from "../../actionsContext";
import { useConditionFlowReadOnly } from "../../viewModeContext";

export function ConditionNode({ id, data, selected }: NodeProps<ConditionNodeData>) {
  const catalog = useConditionFieldCatalog();
  const fieldMetadata = catalog.metadata;
  const readOnly = useConditionFlowReadOnly();
  const level = useNodeErrorLevel(id);
  const actions = useConditionFlowActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ field: data.field, operator: data.operator, value: data.value, negate: data.negate }));

  useEffect(() => {
    if (!editing) {
      setDraft({ field: data.field, operator: data.operator, value: data.value, negate: data.negate });
    }
  }, [data.field, data.operator, data.value, data.negate, editing]);

  const field = draft.field;
  const operator = draft.operator;
  const meta = field ? fieldMetadata[field] : null;
  const opOptions = useMemo(
    () => opsForCatalogField(catalog, field).map((o) => o.value),
    [catalog, field]
  );

  const save = () => {
    actions.updateNodeData(id, { field: draft.field, operator: draft.operator, value: draft.value, negate: draft.negate });
    setEditing(false);
  };

  const cancel = () => {
    setDraft({ field: data.field, operator: data.operator, value: data.value, negate: data.negate });
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "relative w-[220px] rounded-2xl border border-blue-200 bg-background p-4 shadow-sm dark:border-blue-900/60",
        selected && "ring-2 ring-brand-500 ring-offset-2 ring-offset-background",
        level === "error" && "ring-2 ring-red-500/60 ring-offset-2 ring-offset-background",
        level === "warning" && "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
            aria-hidden
          >
            IF
          </span>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">Condition</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {readOnly ? null : (
            <>
          <button
            type="button"
            className={cn(
              "text-[11px] px-2 py-1 rounded-full border transition-colors",
              draft.negate
                ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/20 dark:text-violet-300"
                : "border-border bg-[var(--surface-sunken)] text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setDraft((d) => ({ ...d, negate: !d.negate }))}
          >
            NOT
          </button>
          <Button type="button" variant="ghost" className="h-8 w-8 p-0" onClick={() => actions.deleteNode(id)} aria-label="Delete condition">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
            </>
          )}
        </div>
      </div>

      {readOnly || !editing ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {draft.negate ? "NOT " : ""}
            {draft.field ?? "Select field"} {draft.operator ? OPERATOR_LABELS[draft.operator as ComparisonOp] : "select operator"}{" "}
            {draft.operator === "IS_NULL" || draft.operator === "IS_NOT_NULL"
              ? ""
              : draft.value == null
                ? "…"
                : Array.isArray(draft.value)
                  ? draft.value.join(", ")
                  : String(draft.value)}
          </p>
          {readOnly ? null : (
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Field</Label>
                <select
                  className="h-8 w-full rounded-xl bg-[var(--surface-sunken)] px-2 text-xs outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
                  value={field ?? ""}
                  onChange={(e) => {
                    const nextField = (e.target.value || null) as ConditionField | null;
                    const nextOps = opsForCatalogField(catalog, nextField).map((o) => o.value);
                    setDraft((d) => ({
                      ...d,
                      field: nextField,
                      operator: (nextOps[0] ?? null) as ComparisonOp | null,
                      value: nextField && fieldMetadata[nextField]?.type === "number" ? 0 : "",
                    }));
                  }}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {catalog.fields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Operator</Label>
                <select
                  className="h-8 w-full rounded-xl bg-[var(--surface-sunken)] px-2 text-xs outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
                  value={operator ?? ""}
                  onChange={(e) => {
                    const op = (e.target.value || null) as ComparisonOp | null;
                    if (op === "BETWEEN") return setDraft((d) => ({ ...d, operator: op, value: [0, 0] }));
                    if (op === "IN" || op === "NOT_IN") return setDraft((d) => ({ ...d, operator: op, value: [] }));
                    if (op === "IS_NULL" || op === "IS_NOT_NULL") return setDraft((d) => ({ ...d, operator: op, value: null }));
                    return setDraft((d) => ({ ...d, operator: op }));
                  }}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {opOptions.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op] ?? op}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Value</Label>
                {operator === "IS_NULL" || operator === "IS_NOT_NULL" ? (
                  <div className="h-8 rounded-xl border border-dashed border-border px-2 text-[11px] text-muted-foreground flex items-center">No value</div>
                ) : (
                  <Input
                    className="h-8 rounded-xl text-xs"
                    value={draft.value == null ? "" : Array.isArray(draft.value) ? draft.value.join(", ") : String(draft.value)}
                    placeholder={meta?.placeholder ?? "Enter value"}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (operator === "IN" || operator === "NOT_IN") {
                        const parts = raw
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setDraft((d) => ({ ...d, value: meta?.type === "number" ? parts.map((p) => Number(p)) : parts }));
                        return;
                      }
                      if (operator === "BETWEEN") {
                        const parts = raw
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const low = parts[0] ?? "0";
                        const high = parts[1] ?? "0";
                        setDraft((d) => ({ ...d, value: meta?.type === "number" ? [Number(low), Number(high)] : [low, high] }));
                        return;
                      }
                      setDraft((d) => ({ ...d, value: meta?.type === "number" ? Number(raw) : raw }));
                    }}
                  />
                )}
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" className="h-8 rounded-full text-xs" onClick={cancel}>
                  Cancel
                </Button>
                <Button type="button" className="h-8 rounded-full text-xs" onClick={save}>
                  Save
                </Button>
              </div>
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-blue-500 !border-blue-600" />
      <Handle type="source" id="yes" position={Position.Bottom} className="!bg-emerald-500 !border-emerald-600" style={{ left: "35%" }} />
      <Handle type="source" id="no" position={Position.Bottom} className="!bg-zinc-500 !border-zinc-600" style={{ left: "65%" }} />
    </div>
  );
}

