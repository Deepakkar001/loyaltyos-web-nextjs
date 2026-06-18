"use client";

import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardCatchAllPage() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();
  const slug = params.slug ?? [];

  // Avoid shadowing /dashboard/analytics/* when the dev build is stale.
  if (slug[0] === "analytics") {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
          <p className="text-lg font-bold">Analytics route not loaded</p>
          <p className="text-sm text-muted-foreground mt-2">
            Stop the dev server, delete the <code className="text-xs">.next</code> folder, and run{" "}
            <code className="text-xs">npm run dev</code> again (only one instance on port 3000).
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push("/dashboard/analytics/custom-reports")}>Retry</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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

