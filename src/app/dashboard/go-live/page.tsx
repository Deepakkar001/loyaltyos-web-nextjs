"use client";

import { Card } from "@/components/ui/card";

export default function GoLivePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <p className="text-lg font-bold">Go Live</p>
        <p className="text-sm text-muted-foreground mt-2">
          Production readiness checklist and activation flow will live here.
        </p>
      </Card>
    </div>
  );
}

