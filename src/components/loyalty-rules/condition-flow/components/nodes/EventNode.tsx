"use client";

import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";

import type { EventNodeData } from "../../types";
import { FIELD_METADATA } from "../../types";
import { useNodeErrorLevel } from "../../errorsContext";
import { cn } from "@/lib/utils";
import { useConditionFlowActions } from "../../actionsContext";
import { useConditionFlowReadOnly } from "../../viewModeContext";

const EVENT_OPTIONS = [
  { label: "Purchase", value: "purchase" },
  { label: "Login", value: "login" },
  { label: "Referral", value: "referral" },
] as const;

export function EventNode({ id, data, selected }: NodeProps<EventNodeData>) {
  const readOnly = useConditionFlowReadOnly();
  const level = useNodeErrorLevel(id);
  const actions = useConditionFlowActions();
  const [open, setOpen] = useState(false);
  const current = data.eventType || "purchase";
  const fields = useMemo(() => Object.values(FIELD_METADATA), []);

  return (
    <div
      className={cn(
        "w-[240px] rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20",
        selected && "ring-2 ring-brand-500",
        level === "error" && "ring-2 ring-red-500/60",
        level === "warning" && "ring-2 ring-amber-500/60"
      )}
    >
      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Event</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{data.eventType ? data.eventType.toUpperCase() : "Select event"}</p>
      <p className="mt-2 text-xs text-muted-foreground">Start of the rule evaluation.</p>

      {readOnly ? null : (
      <div className="mt-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <span
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 rounded-full text-xs px-3"
              )}
            >
              Edit
            </span>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Event type</p>
                <select
                  className="h-9 w-full rounded-xl bg-[var(--surface-sunken)] px-3 text-sm outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
                  value={current}
                  onChange={(e) => actions.updateNodeData(id, { eventType: e.target.value })}
                >
                  {EVENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Available fields</p>
                <div className="rounded-xl border border-border bg-background p-3 max-h-44 overflow-auto">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {fields.map((f) => (
                      <li key={f.label}>
                        <span className="text-foreground">{f.label}</span> <span className="text-muted-foreground">({f.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !border-emerald-600" />
    </div>
  );
}

