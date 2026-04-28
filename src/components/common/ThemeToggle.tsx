"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-9 w-[120px] rounded-xl border border-border bg-card animate-pulse" />
    );
  }

  const effectiveTheme = theme === "system" ? systemTheme : theme;
  const isDark = effectiveTheme !== "light";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer select-none transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Active-state highlight so it's obvious which theme is enabled
        isDark
          ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
          : "bg-[var(--surface-sunken)] text-foreground"
      )}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      title={isDark ? "Dark mode enabled" : "Light mode enabled"}
    >
      <Sun className={cn("h-4 w-4", isDark ? "opacity-60" : "opacity-100")} aria-hidden="true" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className={cn("h-4 w-4", isDark ? "opacity-100" : "opacity-60")} aria-hidden="true" />
    </button>
  );
}

