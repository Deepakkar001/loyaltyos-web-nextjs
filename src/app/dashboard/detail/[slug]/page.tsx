"use client";

import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <Card className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <p className="text-lg font-bold">{title} Detail</p>
        <p className="text-sm text-muted-foreground mt-2">
          Drill-down view with advanced filters, trend explorer, and exports will be rendered here.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => router.push("/dashboard/analytics/custom-reports")}>Open Reports</Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}

