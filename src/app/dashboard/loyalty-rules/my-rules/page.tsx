"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RuleStatusBadge } from "@/components/loyalty-rules/RuleStatusBadge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { loadTenantRulesForList } from "@/lib/rules/load-tenant-rules";
import type { EarnRuleResponse, RuleStatus, RuleType } from "@/types/rules";

const RULE_TYPE_OPTIONS: Array<{ value: RuleType | "ALL"; label: string }> = [
  { value: "ALL", label: "All types" },
  { value: "PROGRAMME", label: "Programme" },
  { value: "CAMPAIGN", label: "Campaign" },
];

const STATUS_OPTIONS: Array<{ value: RuleStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function MyRulesPage() {
  const searchParams = useSearchParams();
  const initialRuleType = (searchParams.get("ruleType") as RuleType | null) ?? "ALL";

  const [rules, setRules] = useState<EarnRuleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RuleStatus | "ALL">("ALL");
  const [ruleTypeFilter, setRuleTypeFilter] = useState<RuleType | "ALL">(initialRuleType);
  const [programmeFilter, setProgrammeFilter] = useState<string>("ALL");
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);

  useEffect(() => {
    setRuleTypeFilter(initialRuleType);
  }, [initialRuleType]);

  useEffect(() => {
    (async () => {
      try {
        const list = await programmeApiV2.listProgrammes();
        setProgrammes(mergeProgrammeDropdownRows(list));
      } catch {
        /* programme filter optional */
      }
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await loadTenantRulesForList(
          programmeFilter,
          programmes.map((p) => p.programmeUid),
          ruleTypeFilter === "ALL" ? undefined : ruleTypeFilter
        );
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
  }, [ruleTypeFilter, programmeFilter, programmes]);

  const programmeSelectOptions = useMemo(
    () => [
      { value: "ALL", label: "All programmes" },
      ...programmes.map((p) => ({
        value: p.programmeUid,
        label: p.name,
      })),
    ],
    [programmes]
  );

  const programmeLabelByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of programmes) {
      map.set(p.programmeUid, p.name);
    }
    return map;
  }, [programmes]);

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
            Programme and campaign earn rules stored in the same rule engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/loyalty-rules/create/basic-info?new=1">
            <Button variant="outline" className="rounded-full">
              + Programme Rule
            </Button>
          </Link>
          <Link href="/dashboard/campaign-rules/create/campaign?new=1">
            <Button className="rounded-full">+ Campaign Rule</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, UID, or event type…"
          />
        </div>
        <NativeSelect
          ariaLabel="Filter by programme"
          value={programmeFilter}
          onChange={setProgrammeFilter}
          options={programmeSelectOptions}
          className="w-full sm:w-[200px]"
        />
        <NativeSelect
          ariaLabel="Filter by rule type"
          value={ruleTypeFilter}
          onChange={(v) => setRuleTypeFilter(v as RuleType | "ALL")}
          options={RULE_TYPE_OPTIONS}
          className="w-full sm:w-[180px]"
        />
        <NativeSelect
          ariaLabel="Filter by status"
          value={status}
          onChange={(v) => setStatus(v as RuleStatus | "ALL")}
          options={STATUS_OPTIONS}
          className="w-full sm:w-[180px]"
        />
      </div>

      {loading ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <p className="text-sm font-semibold">No rules found</p>
          <p className="text-sm text-muted-foreground mt-1">Create a rule or adjust your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.ruleUid} className="p-5 border-border/70 bg-[var(--surface-card)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <RuleStatusBadge status={r.status} />
                    <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[var(--surface-sunken)] border border-border">
                      {r.ruleType ?? "PROGRAMME"}
                    </span>
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Programme: {programmeLabelByUid.get(r.programmeUid) ?? r.programmeUid} · Event:{" "}
                    {r.triggerEventType} · Execution: {r.executionMode} · UID: {r.ruleUid}
                    {r.campaignUid ? ` · Campaign: ${r.campaignUid}` : ""}
                  </p>
                </div>
                <Link
                  href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(r.ruleUid)}/details?programmeUid=${encodeURIComponent(r.programmeUid)}`}
                >
                  <Button variant="outline" className="rounded-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
