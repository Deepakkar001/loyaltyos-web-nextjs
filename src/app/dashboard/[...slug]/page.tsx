"use client";

import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardCatchAllPage() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params.slug ?? [];
  const title = slug.map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())).join(" / ");

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <p className="text-lg font-bold">{title || "Dashboard Section"}</p>
        <p className="text-sm text-muted-foreground mt-2">
          This page is wired for navigation and ready for detailed implementation.
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

