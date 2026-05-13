"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationError } from "../types";

interface ValidationPanelProps {
  errors: ValidationError[];
  onSelectNode?: (nodeId: string) => void;
  onClose?: () => void;
}

export function ValidationPanel({ errors, onSelectNode, onClose }: ValidationPanelProps) {
  if (!errors.length) return null;

  const sorted = [...errors].sort((a, b) => {
    const rank = (s: "error" | "warning") => (s === "error" ? 0 : 1);
    const r = rank(a.severity) - rank(b.severity);
    if (r !== 0) return r;
    return a.message.localeCompare(b.message);
  });

  const errCount = sorted.filter((e) => e.severity === "error").length;
  const warnCount = sorted.filter((e) => e.severity === "warning").length;

  return (
    <div className="rounded-2xl border border-border bg-[var(--surface-card)] p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Validation</p>
          <div className="flex items-center gap-1.5">
            {errCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {errCount} error{errCount > 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {warnCount} warning{warnCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-[var(--surface-sunken)] hover:text-foreground"
            aria-label="Dismiss validation panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Error grid — 1 col on small, 2 col when ≥4 errors */}
      <div
        className={cn(
          "mt-3 gap-2",
          sorted.length >= 4 ? "grid grid-cols-1 sm:grid-cols-2" : "flex flex-col"
        )}
      >
        {sorted.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => (e.nodeId && onSelectNode ? onSelectNode(e.nodeId) : undefined)}
            className={cn(
              "w-full text-left rounded-xl border px-3 py-2.5 transition-colors",
              e.severity === "error"
                ? "border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30",
              e.nodeId && onSelectNode
                ? "cursor-pointer hover:bg-background"
                : "cursor-default"
            )}
            aria-disabled={!e.nodeId || !onSelectNode}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wide",
                  e.severity === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {e.severity}
                {e.nodeId ? " · node" : ""}
              </p>
              {e.field && (
                <p className="shrink-0 text-[10px] text-muted-foreground">
                  {e.field}
                </p>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground leading-snug">{e.message}</p>
            {e.suggestedFix && (
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                → {e.suggestedFix}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
