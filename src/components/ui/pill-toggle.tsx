"use client";

import { cn } from "@/lib/utils";

/**
 * Pill-shaped toggle (pressed = on). Used for boolean flags such as “required” on schema fields.
 */
export function PillToggle({
  pressed,
  onPressedChange,
  srLabel,
  size = "md",
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  srLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => onPressedChange(!pressed)}
      aria-pressed={pressed}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors",
        size === "sm" ? "h-7 w-[44px]" : "h-8 w-[52px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        pressed ? "border-primary/50 bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 rounded-full shadow-sm ring-1 ring-black/5 transition-transform",
          size === "sm" ? "h-5 w-5" : "h-6 w-6",
          "dark:ring-white/10",
          pressed
            ? cn("bg-amber-300", size === "sm" ? "translate-x-4" : "translate-x-5")
            : "bg-slate-300 dark:bg-slate-300 translate-x-0"
        )}
      />
      <span className="sr-only">{srLabel}</span>
    </button>
  );
}
