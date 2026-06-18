"use client";

import { Card } from "@/components/ui/card";

type Props = {
  totalRequests: number;
  successful: number;
  failed: number;
  successRate: number;
  avgLatency: number;
  p99Latency: number;
  errorBreakdown?: Record<string, number>;
};

export function UsageStatistics({
  totalRequests,
  successful,
  failed,
  successRate,
  avgLatency,
  p99Latency,
  errorBreakdown,
}: Props) {
  return (
    <Card className="p-6 space-y-3">
      <h2 className="font-medium">Usage statistics (24h)</h2>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-muted-foreground">Total requests</p>
          <p className="text-xl font-semibold">{totalRequests}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Success rate</p>
          <p className="text-xl font-semibold">{successRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Errors</p>
          <p className="text-xl font-semibold">{failed}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Avg latency</p>
          <p className="text-xl font-semibold">{avgLatency}ms</p>
        </div>
        <div>
          <p className="text-muted-foreground">P99 latency</p>
          <p className="text-xl font-semibold">{p99Latency}ms</p>
        </div>
        <div>
          <p className="text-muted-foreground">Successful</p>
          <p className="text-xl font-semibold">{successful}</p>
        </div>
      </div>
      {errorBreakdown && Object.keys(errorBreakdown).length > 0 && (
        <div className="text-sm">
          <p className="font-medium mb-1">Error breakdown (HTTP status)</p>
          <ul className="space-y-1 text-muted-foreground">
            {Object.entries(errorBreakdown).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
