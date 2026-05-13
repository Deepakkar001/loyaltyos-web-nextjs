"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RuleStatusBadge } from "@/components/loyalty-rules/RuleStatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loyaltyRulesAdminApi } from "@/lib/api/client";
import type { EarnRuleResponse, RuleStatus } from "@/types/rules";

export default function MyRulesPage() {
  const [rules, setRules] = useState<EarnRuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RuleStatus | "ALL">("ALL");
  const programmeUid = "default";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await loyaltyRulesAdminApi.listRules(programmeUid);
        if (!alive) return;
        setRules(res);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load rules");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.ruleUid.toLowerCase().includes(q) ||
        r.triggerEventType.toLowerCase().includes(q)
      );
    });
  }, [rules, query, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Loyalty Rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all earn rules for your loyalty programmes.
          </p>
        </div>
        <Link href="/dashboard/loyalty-rules/create/basic-info">
          <Button className="rounded-full">+ Create New Rule</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, UID, or event type…"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as RuleStatus | "ALL")}>
          <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl bg-[var(--surface-sunken)] border-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <p className="text-sm font-semibold">No rules found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new rule, or adjust your filters/search.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/dashboard/loyalty-rules/create/basic-info">
              <Button className="rounded-full">Create Rule</Button>
            </Link>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
                toast("Filters cleared");
              }}
            >
              Clear filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.ruleUid} className="p-5 border-border/70 bg-[var(--surface-card)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <RuleStatusBadge status={r.status} />
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Event Type: {r.triggerEventType} · Execution: {r.executionMode} · UID: {r.ruleUid}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(r.ruleUid)}/details?programmeUid=${encodeURIComponent(programmeUid)}`}>
                    <Button variant="outline" className="rounded-full">View Details</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

