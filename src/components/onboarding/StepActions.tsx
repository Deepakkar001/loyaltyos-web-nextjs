"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

interface StepActionsProps {
  onNext: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  nextLabel?: string;
  isLastStep?: boolean;
  nextButtonClassName?: string;
}

export function StepActions({
  onNext,
  onBack,
  isLoading,
  nextLabel = "Continue",
  nextButtonClassName,
}: StepActionsProps) {
  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-surface-200">
      <div>
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="text-slate-500"
          >
            ← Back
          </Button>
        )}
      </div>
      <Button
        onClick={onNext}
        disabled={isLoading}
        size="lg"
        className={cn(
          "bg-brand-600 hover:bg-brand-700 text-white min-w-[140px]",
          nextButtonClassName
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
          </>
        ) : (
          <>
            {nextLabel} <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}

