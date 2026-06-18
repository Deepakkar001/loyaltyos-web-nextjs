"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LogicNodeData } from "../../types";
import { useNodeErrorLevel } from "../../errorsContext";
import { useConditionFlowActions } from "../../actionsContext";
import { useConditionFlowReadOnly } from "../../viewModeContext";

export function LogicNode({ id, data, selected }: NodeProps<LogicNodeData>) {
  const readOnly = useConditionFlowReadOnly();
  const level = useNodeErrorLevel(id);
  const actions = useConditionFlowActions();
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        selected && "ring-2 ring-brand-500",
        level === "error" && "ring-2 ring-red-500/60",
        level === "warning" && "ring-2 ring-amber-500/60"
      )}
    >
      <div className="h-[96px] w-[96px] rounded-full border border-violet-200 bg-violet-50/40 shadow-sm flex flex-col items-center justify-center gap-2 dark:border-violet-900/60 dark:bg-violet-950/20">
        <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">LOGIC</p>
        {readOnly ? (
          <p className="text-sm font-semibold text-foreground" aria-label="Logic operator">
            {data.logic}
          </p>
        ) : (
          <>
        <select
          className="h-8 rounded-full bg-background px-3 text-xs font-semibold outline-none ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-500"
          value={data.logic}
          onChange={(e) => actions.updateNodeData(id, { logic: e.target.value as LogicNodeData["logic"] })}
          aria-label="Logic operator"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>

        <Button type="button" variant="ghost" className="h-7 text-[11px]" onClick={() => actions.deleteNode(id)}>
          Delete
        </Button>
          </>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="!bg-violet-500 !border-violet-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !border-violet-600" />
    </div>
  );
}

