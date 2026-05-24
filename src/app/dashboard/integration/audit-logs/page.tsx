"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrationDashboardApi, type AuditLogEntry } from "@/lib/api/integrationDashboard";

export default function IntegrationAuditLogsPage() {
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    void (async () => {
      const res = await integrationDashboardApi.getAuditLogs(page, 50);
      setLogs(res.content ?? []);
      setTotalPages(res.totalPages ?? 0);
    })();
  }, [page]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/integration" className="text-sm text-primary underline">
          ← Integration
        </Link>
        <h1 className="text-2xl font-semibold">API Audit Log</h1>
      </div>

      <Card className="p-4 space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">
                  {log.httpMethod} {log.requestPath}
                </span>
                <span className={log.httpStatus >= 400 ? "text-red-600" : "text-green-600"}>
                  {log.httpStatus} · {log.processingTimeMs}ms
                </span>
              </div>
              <p className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
              {log.eventId && <p>Event: {log.eventId}</p>}
              {log.customerId && <p>Customer: {log.customerId}</p>}
              {log.errorMessage && <p className="text-red-600">{log.errorMessage}</p>}
            </div>
          ))
        )}
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-sm self-center">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
