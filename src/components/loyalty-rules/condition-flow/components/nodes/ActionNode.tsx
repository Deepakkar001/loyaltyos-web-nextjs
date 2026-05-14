"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { ActionNodeData } from "../../types";
import { useNodeErrorLevel } from "../../errorsContext";
import { useConditionFlowActions } from "../../actionsContext";
import { useConditionFlowReadOnly } from "../../viewModeContext";

function titleFor(a: ActionNodeData) {
  if (a.displayTitle) return a.displayTitle;
  if (a.actionType === "award_points") return "Award Points";
  if (a.actionType === "tier_upgrade") return "Tier Upgrade";
  if (a.actionType === "notify") return "Notify";
  if (a.actionType === "badge_award") return "Badge Award";
  return "No Action";
}

export function ActionNode({ id, data, selected }: NodeProps<ActionNodeData>) {
  const readOnly = useConditionFlowReadOnly();
  const level = useNodeErrorLevel(id);
  const actions = useConditionFlowActions();
  const [open, setOpen] = useState(false);
  const multiplier = typeof data.params.multiplier === "string" ? data.params.multiplier : "";

  return (
    <div
      className={cn(
        "w-[220px] rounded-2xl border p-4 shadow-sm",
        selected && "ring-2 ring-brand-500",
        level === "error" && "ring-2 ring-red-500/60",
        level === "warning" && "ring-2 ring-amber-500/60",
        data.actionType === "noop" ? "border-border bg-background" : "border-orange-200 bg-orange-50/40 dark:border-orange-900/60 dark:bg-orange-950/20"
      )}
    >
      <p className={cn("text-xs font-semibold", data.actionType === "noop" ? "text-muted-foreground" : "text-orange-700 dark:text-orange-300")}>
        Action
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{titleFor(data)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {data.displayTypeLine ?? `Type: ${data.actionType}`}
      </p>

      {readOnly ? null : (
      <div className="mt-3 flex gap-2">
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
              <DialogTitle>Edit Action</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Action type</Label>
                <select
                  className="h-9 w-full rounded-xl bg-[var(--surface-sunken)] px-3 text-sm outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-white/5"
                  value={data.actionType}
                  onChange={(e) =>
                    actions.updateNodeData(id, {
                      actionType: e.target.value as ActionNodeData["actionType"],
                      params: {},
                    })
                  }
                >
                  <option value="award_points">award_points</option>
                  <option value="tier_upgrade">tier_upgrade</option>
                  <option value="notify">notify</option>
                  <option value="badge_award">badge_award</option>
                  <option value="noop">noop</option>
                </select>
              </div>

              {data.actionType === "award_points" ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Multiplier</Label>
                  <Input
                    placeholder="e.g. 2x"
                    value={multiplier}
                    onChange={(e) => actions.updateNodeData(id, { params: { ...(data.params ?? {}), multiplier: e.target.value } })}
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => actions.deleteNode(id)}>
                  Delete
                </Button>
                <Button type="button" className="rounded-full" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-orange-500 !border-orange-600" />
    </div>
  );
}

