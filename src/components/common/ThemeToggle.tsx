"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

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

  return (
    <label className={styles.theme} aria-label="Toggle theme" title={isDark ? "Dark mode enabled" : "Light mode enabled"}>
      <span className={styles.toggleWrap}>
        <input
          id="theme"
          className={styles.input}
          type="checkbox"
          role="switch"
          name="theme"
          checked={isDark}
          onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
          aria-checked={isDark}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.trackIconLeft}>
            <Sun className={styles.iconSvg} />
          </span>
          <span className={styles.trackIconRight}>
            <Moon className={styles.iconSvg} />
          </span>
          <span className={styles.thumb}>
            {isDark ? <Moon className={styles.thumbIcon} /> : <Sun className={styles.thumbIcon} />}
          </span>
        </span>
      </span>
    </label>
  );
}

