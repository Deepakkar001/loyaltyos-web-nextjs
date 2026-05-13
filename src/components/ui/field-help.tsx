"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FieldHelp({
  text,
  label = "Field help",
}: {
  text: string;
  label?: string;
}) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Info className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

