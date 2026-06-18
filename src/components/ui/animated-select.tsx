"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MENU_TRANSITION = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const,
};

function dropdownOptionClassName(selected: boolean, compact = false) {
  return cn(
    "flex w-full cursor-pointer items-center justify-between transition-all duration-200 ease-out active:scale-[0.98] text-left whitespace-nowrap",
    compact ? "gap-1 rounded-md px-2 py-1.5 text-sm font-semibold" : "gap-2 rounded-lg px-3 py-2 text-sm font-medium",
    selected
      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15"
      : cn(
          "text-foreground",
          "hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]",
          "dark:hover:bg-white/[0.08] dark:hover:text-foreground",
        ),
  );
}

const VIEWPORT_MARGIN_PX = 12;

export type AnimatedSelectOption = { value: string; label: string };

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

type AnimatedSelectProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: AnimatedSelectOption[];
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** `filter` matches dashboard period/programme dropdown triggers. */
  variant?: "default" | "filter";
};

function computeMenuPosition(root: HTMLElement, trigger: HTMLElement): MenuPosition {
  const rootRect = root.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const width = rootRect.width;
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX;
  const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(rootRect.left, maxLeft));
  const top = triggerRect.bottom + 6;
  return { top, left, width };
}

export function AnimatedSelect({
  ariaLabel,
  value,
  onChange,
  options,
  className,
  triggerClassName,
  disabled = false,
  variant = "default",
}: AnimatedSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  const closeMenu = useCallback(() => setOpen(false), []);

  const getTriggerElement = useCallback((): HTMLElement | null => {
    return rootRef.current?.querySelector<HTMLElement>('[data-slot="button"]') ?? rootRef.current;
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = getTriggerElement();
    const root = rootRef.current;
    if (!trigger || !root) return;
    setMenuPosition(computeMenuPosition(root, trigger));
  }, [getTriggerElement]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    const onReposition = () => updateMenuPosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, closeMenu, updateMenuPosition]);

  const menuContent = (
    <AnimatePresence initial={false}>
      {open && menuPosition ? (
        <motion.div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={MENU_TRANSITION}
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
          }}
          className="z-[100] overflow-hidden rounded-lg border border-border/70 bg-[var(--surface-card)] p-1 shadow-[var(--shadow-card)]"
        >
          <ul>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={dropdownOptionClassName(selected, variant === "default")}
                    onClick={() => {
                      onChange(option.value);
                      closeMenu();
                    }}
                  >
                    <span>{option.label}</span>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                      <span className="w-3.5 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 w-full max-w-full justify-between bg-background shadow-sm",
          variant === "filter"
            ? "gap-2 rounded-xl border-border/70 px-3 font-medium sm:w-auto sm:min-w-[11rem]"
            : "gap-1 rounded-lg border-input px-2.5 text-sm font-semibold",
          open && "ring-2 ring-[var(--accent-primary)]/20",
          triggerClassName,
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={MENU_TRANSITION}
          className="inline-flex shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </motion.span>
      </Button>

      {mounted ? createPortal(menuContent, document.body) : null}
    </div>
  );
}
