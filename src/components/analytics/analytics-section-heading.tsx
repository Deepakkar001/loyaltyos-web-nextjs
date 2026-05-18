"use client";

import { FieldHelp } from "@/components/ui/field-help";
import { cn } from "@/lib/utils";

/** Section title with the shared info tooltip used across forms. */
export function AnalyticsSectionHeading({
  title,
  helpText,
  className,
  titleClassName,
}: {
  title: string;
  helpText: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h2 className={cn("text-lg font-semibold", titleClassName)}>{title}</h2>
      <FieldHelp text={helpText} label={`${title} help`} />
    </div>
  );
}
