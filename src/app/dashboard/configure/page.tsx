"use client";

import { Step4Programme } from "@/components/onboarding/steps/Step4Programme";
import { Card } from "@/components/ui/card";

export default function ConfigurePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <Step4Programme />
      </Card>
    </div>
  );
}

