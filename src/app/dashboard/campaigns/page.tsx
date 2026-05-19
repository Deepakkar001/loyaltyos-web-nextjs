"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CampaignBudgetProgress } from "@/components/campaigns/CampaignBudgetProgress";
import { CampaignRowActions } from "@/components/campaigns/CampaignRowActions";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { campaignsAdminApi, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import type { CampaignResponse, CampaignStatus } from "@/types/campaigns";

const STATUS_OPTIONS: Array<{ value: CampaignStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXHAUSTED", label: "Exhausted" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ENDED", label: "Ended" },
];

function formatSchedule(from: string, until: string): string {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
  try {
    const f = new Date(from).toLocaleString(undefined, opts);
    const u = new Date(until).toLocaleString(undefined, opts);
    return `${f} → ${u}`;
  } catch {
    return `${from} → ${until}`;
  }
}

function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Campaign window overlaps [filterStart, filterEnd] (inclusive days). */
function campaignOverlapsDateRange(
  campaign: CampaignResponse,
  filterStart: string,
  filterEnd: string
): boolean {
  const start = parseDateInput(filterStart);
  const end = parseDateInput(filterEnd);
  if (!start && !end) return true;

  const validFrom = new Date(campaign.validFrom);
  const validUntil = new Date(campaign.validUntil);
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) return true;

  if (start && validUntil < start) return false;
  if (end) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    if (validFrom > endOfDay) return false;
  }
  return true;
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);
  const [programmeUid, setProgrammeUid] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "ALL">("ALL");
  const [campaignType, setCampaignType] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await campaignsAdminApi.listCampaigns({
        programmeUid: programmeUid === "ALL" ? undefined : programmeUid,
        status: status === "ALL" ? undefined : status,
      });
      setCampaigns(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [programmeUid, status]);

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
    loadCampaigns();
  }, [loadCampaigns]);

  const campaignTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const c of campaigns) {
      if (c.campaignType?.trim()) types.add(c.campaignType.trim());
    }
    return [
      { value: "ALL", label: "All types" },
      ...Array.from(types)
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ value: t, label: t })),
    ];
  }, [campaigns]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (campaignType !== "ALL" && c.campaignType !== campaignType) return false;
      if (!campaignOverlapsDateRange(c, dateFrom, dateTo)) return false;
      return true;
    });
  }, [campaigns, query, campaignType, dateFrom, dateTo]);

  const clearFilters = () => {
    setQuery("");
    setStatus("ALL");
    setCampaignType("ALL");
    setDateFrom("");
    setDateTo("");
    setProgrammeUid("ALL");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage loyalty campaigns across programmes.</p>
        </div>
        <Link href="/dashboard/campaigns/create">
          <Button className="rounded-full shrink-0">+ Create Campaign</Button>
        </Link>
      </div>

      <Card className="p-4 border-border/70 bg-[var(--surface-card)] space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="campaign-search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <Input
              id="campaign-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by campaign name…"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <NativeSelect
              ariaLabel="Filter by status"
              value={status}
              onChange={(v) => setStatus(v as CampaignStatus | "ALL")}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Campaign type</Label>
            <NativeSelect
              ariaLabel="Filter by campaign type"
              value={campaignType}
              onChange={setCampaignType}
              options={
                campaignTypeOptions.length > 1
                  ? campaignTypeOptions
                  : [{ value: "ALL", label: "All types" }]
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              Valid from (range)
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              Valid until (range)
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Programme</Label>
            <NativeSelect
              ariaLabel="Filter by programme"
              value={programmeUid}
              onChange={setProgrammeUid}
              options={programmeSelectOptions}
            />
          </div>
        </div>
        {(query || status !== "ALL" || campaignType !== "ALL" || dateFrom || dateTo || programmeUid !== "ALL") && (
          <Button type="button" variant="ghost" size="sm" className="rounded-full -mt-1" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Card>

      {loading ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <p className="text-sm font-semibold">No campaigns found</p>
          <p className="text-sm text-muted-foreground mt-1">Create a campaign or adjust your filters.</p>
          <Link href="/dashboard/campaigns/create" className="inline-block mt-4">
            <Button className="rounded-full">Create Campaign</Button>
          </Link>
        </Card>
      ) : (
        <Card className="border-border/70 bg-[var(--surface-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 min-w-[160px]">Name</th>
                  <th className="px-4 py-3 min-w-[100px]">Type</th>
                  <th className="px-4 py-3 min-w-[90px]">Status</th>
                  <th className="px-4 py-3 min-w-[220px]">Valid from → Valid until</th>
                  <th className="px-4 py-3 min-w-[140px]">Budget progress</th>
                  <th className="px-4 py-3 w-16 text-center">Priority</th>
                  <th className="px-4 py-3 min-w-[200px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.campaignUid}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/dashboard/campaigns/${encodeURIComponent(c.campaignUid)}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.campaignType}</td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatSchedule(c.validFrom, c.validUntil)}
                    </td>
                    <td className="px-4 py-3">
                      <CampaignBudgetProgress consumedPct={c.budgetConsumedPct} />
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{c.priority ?? 0}</td>
                    <td className="px-4 py-3">
                      <CampaignRowActions campaign={c} onUpdated={loadCampaigns} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
