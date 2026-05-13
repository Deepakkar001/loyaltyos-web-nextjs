import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FieldHelp } from "@/components/ui/field-help";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  helpText?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  helpText,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {helpText ? <FieldHelp text={helpText} label={`${label} help`} /> : null}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

