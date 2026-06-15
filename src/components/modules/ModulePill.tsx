"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Lock } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import styles from "./ModulePill.module.css";

export type ModulePillVariant = "onboarding" | "admin";

export interface ModulePillProps {
  label: string;
  description?: string;
  /** Extra lines shown in tooltip (e.g. entitlement source). */
  tooltipMeta?: string[];
  selected: boolean;
  locked?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  index?: number;
  variant?: ModulePillVariant;
}

function pillClassName(
  selected: boolean,
  locked: boolean,
  disabled: boolean,
  extra?: string
) {
  return cn(
    styles.pill,
    selected && styles.pillSelected,
    locked && styles.pillLocked,
    disabled && !locked && styles.pillDisabled,
    extra
  );
}

function PillContents({
  label,
  selected,
  locked,
}: Pick<ModulePillProps, "label" | "selected" | "locked">) {
  const showIcon = selected || locked;

  return (
    <>
      <span className={styles.pillLabel}>{label}</span>
      <span className={cn(styles.iconRail, showIcon && styles.iconRailOpen)} aria-hidden>
        <span className={cn(styles.iconBadge, locked ? styles.lockBadge : styles.checkBadge)}>
          {locked ? (
            <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
          ) : (
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          )}
        </span>
      </span>
    </>
  );
}

function buildTooltipText(description?: string, meta?: string[]) {
  const lines: string[] = [];
  const desc = description?.trim();
  if (desc) lines.push(desc);
  if (meta?.length) lines.push(...meta.filter(Boolean));
  return lines.length > 0 ? lines.join("\n\n") : undefined;
}

export function ModulePill({
  label,
  description,
  tooltipMeta,
  selected,
  locked = false,
  disabled = false,
  onToggle,
  index = 0,
  variant = "onboarding",
}: ModulePillProps) {
  const reduceMotion = useReducedMotion();
  const tooltipText = buildTooltipText(description, tooltipMeta);
  const themeClass = variant === "admin" ? styles.themeAdmin : styles.themeOnboarding;

  const handleClick = () => {
    if (!locked && !disabled) onToggle?.();
  };

  const pillButton = (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled || locked}
      disabled={disabled}
      onClick={handleClick}
      className={pillClassName(selected, locked, disabled)}
    >
      <PillContents label={label} selected={selected} locked={locked} />
    </button>
  );

  const interactive = tooltipText ? (
    <Tooltip>
      <TooltipTrigger
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-disabled={disabled || locked}
        disabled={disabled}
        onClick={handleClick}
        className={pillClassName(selected, locked, disabled, "max-w-full whitespace-pre-wrap")}
      >
        <PillContents label={label} selected={selected} locked={locked} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] leading-relaxed whitespace-pre-line">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  ) : (
    pillButton
  );

  return (
    <div className={cn(styles.pillWrap, themeClass)}>
      <motion.div
        className={styles.pillEntrance}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: reduceMotion ? 0 : index * 0.035,
          ease: [0.33, 1, 0.68, 1],
        }}
      >
        {interactive}
      </motion.div>
    </div>
  );
}
