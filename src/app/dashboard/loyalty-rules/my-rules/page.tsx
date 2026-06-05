"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RuleStatusBadge } from "@/components/loyalty-rules/RuleStatusBadge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  campaignsAdminApi,
  programmeApiV2,
  loyaltyRulesAdminApi,
  ApiError,
  ensureAuthSession,
} from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { loadTenantRulesForList } from "@/lib/rules/load-tenant-rules";
import type { EarnRuleResponse, RuleStatus, RuleType } from "@/types/rules";

const RULE_TYPE_OPTIONS: Array<{ value: RuleType | "ALL"; label: string }> = [
  { value: "ALL", label: "All types" },
  { value: "PROGRAMME", label: "Programme" },
  { value: "CAMPAIGN", label: "Campaign" },
];

const STATUS_OPTIONS: Array<{ value: RuleStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Active rules" },
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
  const [campaigns, setCampaigns] = useState<Array<{ campaignUid: string; name: string }>>([]);
  const [removeTarget, setRemoveTarget] = useState<EarnRuleResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setRuleTypeFilter(initialRuleType);
  }, [initialRuleType]);

  useEffect(() => {
    (async () => {
      try {
        const [programmeList, campaignList] = await Promise.all([
          programmeApiV2.listProgrammes(),
          campaignsAdminApi.listCampaigns().catch(() => []),
        ]);
        setProgrammes(mergeProgrammeDropdownRows(programmeList));
        setCampaigns(
          campaignList.map((c) => ({
            campaignUid: c.campaignUid,
            name: c.name,
          }))
        );
      } catch {
        /* programme filter optional */
      }
    })();
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadTenantRulesForList(
        programmeFilter,
        programmes.map((p) => p.programmeUid),
        ruleTypeFilter === "ALL" ? undefined : ruleTypeFilter
      );
      setRules(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [programmeFilter, programmes, ruleTypeFilter]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

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

  const campaignLabelByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of campaigns) {
      map.set(c.campaignUid, c.name);
    }
    return map;
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((r) => {
      if (status === "ALL") {
        if (r.status === "ARCHIVED") return false;
      } else if (r.status !== status) {
        return false;
      }
      if (!q) return true;
      const programmeLabel = programmeLabelByUid.get(r.programmeUid) ?? r.programmeUid;
      const campaignLabel = r.campaignUid
        ? (campaignLabelByUid.get(r.campaignUid) ?? r.campaignUid)
        : "";
      return (
        r.name.toLowerCase().includes(q) ||
        r.ruleUid.toLowerCase().includes(q) ||
        r.triggerEventType.toLowerCase().includes(q) ||
        programmeLabel.toLowerCase().includes(q) ||
        r.programmeUid.toLowerCase().includes(q) ||
        campaignLabel.toLowerCase().includes(q) ||
        (r.campaignUid?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rules, query, status, programmeLabelByUid, campaignLabelByUid]);

  const confirmRemoveRule = useCallback(async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await ensureAuthSession();
      await loyaltyRulesAdminApi.archiveRule(removeTarget.ruleUid, removeTarget.programmeUid);
      setRules((prev) => prev.filter((r) => r.ruleUid !== removeTarget.ruleUid));
      toast.success(`"${removeTarget.name}" removed from My Rules.`);
      setRemoveTarget(null);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Could not remove rule");
    } finally {
      setRemoving(false);
    }
  }, [removeTarget]);

  return (
    <div className="space-y-6">
      <Dialog open={removeTarget != null} onOpenChange={(open) => !open && !removing && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove rule?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{removeTarget?.name}</span> will be archived and hidden
            from your active rule list. It will no longer earn points on new events. Change history is kept; you can
            view archived rules using the status filter.
          </p>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemoveRule()}
            >
              {removing ? "Removing…" : "Remove from list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            placeholder="Search by rule, programme, campaign, or event…"
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
          <p className="text-sm text-muted-foreground mt-1">
            {status === "ARCHIVED"
              ? "No archived rules match your filters."
              : "Create a rule or adjust your filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RuleListCard
              key={r.ruleUid}
              rule={r}
              programmeLabel={programmeLabelByUid.get(r.programmeUid) ?? r.programmeUid}
              campaignLabel={
                r.campaignUid
                  ? (campaignLabelByUid.get(r.campaignUid) ?? r.campaignUid)
                  : undefined
              }
              onRemove={() => setRemoveTarget(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Rule list row: actions stay on the header row; metadata wraps on its own row so long
 * campaign UIDs never push buttons to a second line.
 */
function RuleListCard({
  rule,
  programmeLabel,
  campaignLabel,
  onRemove,
}: {
  rule: EarnRuleResponse;
  programmeLabel: string;
  campaignLabel?: string;
  onRemove: () => void;
}) {
  const detailsHref = `/dashboard/loyalty-rules/my-rules/${encodeURIComponent(rule.ruleUid)}/details?programmeUid=${encodeURIComponent(rule.programmeUid)}`;

  return (
    <Card className="p-5 border-border/70 bg-[var(--surface-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RuleStatusBadge status={rule.status} />
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[var(--surface-sunken)] border border-border shrink-0">
              {rule.ruleType ?? "PROGRAMME"}
            </span>
            <p className="text-sm font-semibold leading-snug">{rule.name}</p>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              Programme:{" "}
              <span className="font-medium text-foreground">{programmeLabel}</span>
            </span>
            {rule.campaignUid && campaignLabel ? (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span>
                  Campaign:{" "}
                  <span className="font-medium text-foreground">{campaignLabel}</span>
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Link href={detailsHref}>
            <Button variant="outline" className="rounded-full whitespace-nowrap" size="sm">
              <Eye className="w-3.5 h-3.5 mr-2 shrink-0" />
              View Details
            </Button>
          </Link>
          {rule.status !== "ARCHIVED" ? (
            <Button
              variant="outline"
              className="rounded-full whitespace-nowrap text-destructive hover:text-destructive"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
        <RuleMetaItem label="Programme" value={programmeLabel} subValue={rule.programmeUid} mono />
        {rule.campaignUid ? (
          <RuleMetaItem
            label="Campaign"
            value={campaignLabel ?? rule.campaignUid}
            subValue={campaignLabel ? rule.campaignUid : undefined}
            mono={Boolean(campaignLabel)}
          />
        ) : null}
        <RuleMetaItem label="Event" value={rule.triggerEventType} />
        <RuleMetaItem label="Execution" value={rule.executionMode} />
        <RuleMetaItem label="Rule UID" value={rule.ruleUid} mono />
      </dl>
    </Card>
  );
}

function RuleMetaItem({
  label,
  value,
  subValue,
  mono = false,
}: {
  label: string;
  value: string;
  subValue?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-medium text-foreground/70">{label}</dt>
      <dd className="min-w-0">
        <p
          className={`truncate ${mono ? "font-mono text-[11px]" : ""}`}
          title={value}
        >
          {value}
        </p>
        {subValue ? (
          <p className="truncate font-mono text-[10px] text-muted-foreground/80" title={subValue}>
            {subValue}
          </p>
        ) : null}
      </dd>
    </div>
  );
}
