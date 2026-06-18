"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type NativeSelectOption = { value: string; label: string };

/**
 * Real `<select>` with chevron — avoids popover/stacking issues inside `overflow-hidden` cards
 * and matches native OS dropdown behaviour.
 */
export function NativeSelect({
  id,
  name,
  ariaLabel,
  value,
  onChange,
  options,
  className,
  disabled,
  variant = "default",
}: {
  id?: string;
  name?: string;
  ariaLabel: string;
  value: string;
  onChange: (next: string) => void;
  options: NativeSelectOption[];
  className?: string;
  disabled?: boolean;
  /** `compact` matches dense configure rows; `admin-dark` for admin portal slate panels. */
  variant?: "default" | "compact" | "admin-dark";
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        id={id}
        name={name}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-lg border outline-none transition-colors shadow-sm",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variant === "admin-dark"
            ? cn(
                "border-slate-600 bg-slate-800 text-slate-100",
                "[color-scheme:dark]",
                "hover:border-slate-500 focus-visible:border-amber-500/70 focus-visible:ring-2 focus-visible:ring-amber-500/30",
                "h-10 min-h-10 px-3 pr-10 text-sm font-medium"
              )
            : cn(
                "border-input bg-background text-foreground",
                "[color-scheme:light] dark:[color-scheme:dark]",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
                "dark:bg-input/30 dark:focus-visible:ring-offset-background",
                "hover:border-input/80",
                variant === "compact"
                  ? "h-9 min-h-9 px-2.5 pr-8 text-xs"
                  : "h-10 min-h-10 px-3 pr-10 text-sm"
              )
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2",
          variant === "admin-dark" ? "text-slate-300" : "text-muted-foreground",
          variant === "compact" ? "right-2 size-3.5" : "right-3 size-4"
        )}
        aria-hidden
      />
    </div>
  );
}
