"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";

const Step4Programme = dynamic(
  () =>
    import("@/components/onboarding/steps/Step4Programme").then((m) => ({
      default: m.Step4Programme,
    })),
  { ssr: false }
);

export default function ConfigurePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <Step4Programme />
      </Card>
    </div>
  );
}
