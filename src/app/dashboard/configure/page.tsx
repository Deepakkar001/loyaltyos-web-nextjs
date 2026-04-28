"use client";

import { Card } from "@/components/ui/card";

export default function ConfigurePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <p className="text-lg font-bold">Configure</p>
        <p className="text-sm text-muted-foreground mt-2">
          Programme configuration (event schema, tiers, rewards catalog) will live here.
        </p>
      </Card>
    </div>
  );
}

