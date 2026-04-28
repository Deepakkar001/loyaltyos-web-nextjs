"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  options: DropdownOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  "aria-invalid"?: boolean;
};

export function Dropdown({
  id,
  name,
  value,
  placeholder = "Select an option",
  options,
  disabled,
  onChange,
  onBlur,
  className,
  ...aria
}: Props) {
  const hasValue = Boolean((value ?? "").trim());
  return (
    <select
      id={id}
      name={name}
      value={value ?? ""}
      disabled={disabled}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-popover dark:text-popover-foreground",
        hasValue ? "text-foreground" : "text-slate-500",
        className
      )}
      {...aria}
    >
      <option value="" disabled className="text-muted-foreground">
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-foreground">
          {o.label}
        </option>
      ))}
    </select>
  );
}
