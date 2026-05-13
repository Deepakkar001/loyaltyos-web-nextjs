"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RuleStatus } from "@/types/rules";
import { CheckCircle2, Archive, PauseCircle, Pencil } from "lucide-react";

const styles: Record<RuleStatus, { cls: string; label: string; icon: React.ReactNode }> = {
  DRAFT: {
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    label: "Draft (not live)",
    icon: <Pencil className="h-3.5 w-3.5" />,
  },
  ACTIVE: {
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    label: "Active",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  PAUSED: {
    cls: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
    label: "Paused",
    icon: <PauseCircle className="h-3.5 w-3.5" />,
  },
  ARCHIVED: {
    cls: "bg-gray-100 text-gray-500 border-gray-200 opacity-70 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    label: "Archived",
    icon: <Archive className="h-3.5 w-3.5" />,
  },
};

export function RuleStatusBadge({ status, tooltip }: { status: RuleStatus; tooltip?: string }) {
  const s = styles[status];
  const badge = (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
        s.cls
      )}
    >
      {s.icon}
      <span>{s.label}</span>
    </Badge>
  );

  if (!tooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger>
        <span>{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

