"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DASHBOARD_PERIOD_OPTIONS,
  PRESET_LABELS,
  type DashboardDateRange,
  type DashboardPeriodPreset,
  getPeriodTriggerLabel,
} from "@/lib/analytics/dashboard-period";
import { cn } from "@/lib/utils";

const MENU_TRANSITION = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const,
};

function periodOptionClassName(selected: boolean) {
  return cn(
    "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
    "transition-all duration-200 ease-out active:scale-[0.98]",
    selected
      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15"
      : cn(
          "text-foreground",
          "hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]",
          "dark:hover:bg-white/[0.08] dark:hover:text-foreground",
        ),
  );
}

const MENU_WIDTH_PX = 272;
const VIEWPORT_MARGIN_PX = 12;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

type DashboardPeriodDropdownProps = {
  preset: DashboardPeriodPreset;
  appliedRange: DashboardDateRange;
  draftFrom: string;
  draftTo: string;
  maxDate: string;
  busy?: boolean;
  onPresetSelect: (preset: Exclude<DashboardPeriodPreset, "custom">) => void;
  onEnterCustomMode: () => void;
  onDraftFromChange: (value: string) => void;
  onDraftToChange: (value: string) => void;
  onApplyCustom: () => boolean;
  onClearCustom: () => void;
};

function computeMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(MENU_WIDTH_PX, window.innerWidth - VIEWPORT_MARGIN_PX * 2);
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX;
  const preferredLeft = rect.right - width;
  const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(preferredLeft, maxLeft));
  const top = rect.bottom + 6;
  return { top, left, width };
}

export function DashboardPeriodDropdown({
  preset,
  appliedRange,
  draftFrom,
  draftTo,
  maxDate,
  busy = false,
  onPresetSelect,
  onEnterCustomMode,
  onDraftFromChange,
  onDraftToChange,
  onApplyCustom,
  onClearCustom,
}: DashboardPeriodDropdownProps) {
  const [open, setOpen] = useState(false);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const triggerLabel = getPeriodTriggerLabel(preset, appliedRange);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setCustomPanelOpen(false);
  }, []);

  const getTriggerElement = useCallback((): HTMLElement | null => {
    return rootRef.current?.querySelector<HTMLElement>('[data-slot="button"]') ?? rootRef.current;
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = getTriggerElement();
    if (!trigger) return;
    setMenuPosition(computeMenuPosition(trigger));
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
  }, [open, customPanelOpen, updateMenuPosition]);

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

  const handlePresetClick = (next: Exclude<DashboardPeriodPreset, "custom">) => {
    onPresetSelect(next);
    closeMenu();
  };

  const handleCustomClick = () => {
    onEnterCustomMode();
    setCustomPanelOpen(true);
  };

  const menuContent = (
    <AnimatePresence initial={false}>
      {open && menuPosition ? (
        <motion.div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label="Dashboard period"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={MENU_TRANSITION}
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            maxHeight: `min(28rem, calc(100vh - ${menuPosition.top + VIEWPORT_MARGIN_PX}px))`,
          }}
          className="z-[100] flex flex-col overflow-hidden overflow-y-auto rounded-xl border border-border/70 bg-[var(--surface-card)] shadow-[var(--shadow-card)]"
        >
          <ul className="shrink-0 p-1.5">
            {DASHBOARD_PERIOD_OPTIONS.map((option) => {
              const selected = preset === option;
              return (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={periodOptionClassName(selected)}
                    onClick={() => handlePresetClick(option)}
                  >
                    <span>{PRESET_LABELS[option]}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={preset === "custom"}
                className={periodOptionClassName(preset === "custom" || customPanelOpen)}
                onClick={handleCustomClick}
              >
                <span>{PRESET_LABELS.custom}</span>
                {preset === "custom" ? (
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                ) : null}
              </button>
            </li>
          </ul>

          <AnimatePresence initial={false}>
            {customPanelOpen ? (
              <motion.div
                key="custom-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={MENU_TRANSITION}
                className="shrink-0 overflow-hidden border-t border-border/60"
                onAnimationComplete={updateMenuPosition}
              >
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="dashboard-period-from" className="text-xs text-muted-foreground">
                        From
                      </Label>
                      <Input
                        id="dashboard-period-from"
                        type="date"
                        value={draftFrom}
                        max={draftTo || maxDate}
                        onChange={(e) => onDraftFromChange(e.target.value)}
                        className="w-full min-w-0 max-w-full bg-background"
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="dashboard-period-to" className="text-xs text-muted-foreground">
                        To
                      </Label>
                      <Input
                        id="dashboard-period-to"
                        type="date"
                        value={draftTo}
                        min={draftFrom}
                        max={maxDate}
                        onChange={(e) => onDraftToChange(e.target.value)}
                        className="w-full min-w-0 max-w-full bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (onApplyCustom()) closeMenu();
                      }}
                      disabled={busy}
                    >
                      {busy ? "Applying…" : "Apply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClearCustom();
                        closeMenu();
                      }}
                      disabled={busy}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className="relative w-full min-w-0 max-w-full sm:ml-auto sm:w-auto">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={busy}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-9 w-full max-w-full justify-between gap-2 rounded-xl border-border/70 bg-background px-3 font-medium shadow-sm sm:w-auto sm:min-w-[11rem]",
          preset === "custom" && "sm:max-w-[18rem]",
          open && "ring-2 ring-[var(--accent-primary)]/20"
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn(preset === "custom" ? "truncate" : "whitespace-nowrap")}>
            {triggerLabel}
          </span>
        </span>
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
