"use client";

import { cn } from "@/lib/utils";
export default function LoyaltyRulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto")}>
      {children}
    </div>
  );
}

