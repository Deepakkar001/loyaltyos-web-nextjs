"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChipInputProps = {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (next: string[]) => void;
  normalize?: (raw: string) => string;
  /** When set to 1, adding a new chip replaces the existing value (e.g. single event type). */
  maxItems?: number;
  className?: string;
};

/** Multi-value chip input — type and press Enter or Add. */
export function ChipInput({
  label,
  placeholder = "Type and press Enter",
  values,
  onChange,
  normalize = (s) => s.trim(),
  maxItems,
  className,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const token = normalize(raw);
    if (!token) return;
    const key = token.toUpperCase();
    if (values.some((v) => v.toUpperCase() === key)) {
      setDraft("");
      return;
    }
    if (maxItems === 1) {
      onChange([token]);
    } else {
      onChange([...values, token]);
    }
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium leading-none">{label}</p>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1 rounded-full">
            {v}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" className="shrink-0 rounded-full" onClick={() => add(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}
