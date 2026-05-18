"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { campaignsAdminApi, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import type { CampaignResponse, CampaignStatsResponse } from "@/types/campaigns";

type Row = CampaignResponse & { stats?: CampaignStatsResponse };

export default function CampaignReportsPage() {
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);
  const [programmeUid, setProgrammeUid] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const programmeSelectOptions = useMemo(
    () =>
      programmes.map((p) => ({
        value: p.programmeUid,
        label: p.programmeUid === "default" ? p.name : `${p.name}`,
      })),
    [programmes]
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await programmeApiV2.listProgrammes();
        const merged = mergeProgrammeDropdownRows(list);
        setProgrammes(merged);
        if (merged.length === 1) setProgrammeUid(merged[0].programmeUid);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load programmes");
      }
    })();
  }, []);

  useEffect(() => {
    if (!programmeUid) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const campaigns = await campaignsAdminApi.listCampaigns({ programmeUid });
        const withStats = await Promise.all(
          campaigns.map(async (c) => {
            try {
              const stats = await campaignsAdminApi.getStats(c.campaignUid);
              return { ...c, stats };
            } catch {
              return { ...c };
            }
          })
        );
        if (alive) setRows(withStats);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load reports");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [programmeUid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance from live participation data.</p>
      </div>

      <NativeSelect
        className="w-full sm:w-[280px]"
        ariaLabel="Programme"
        value={programmeUid}
        disabled={programmeSelectOptions.length === 0}
        onChange={setProgrammeUid}
        options={
          programmeSelectOptions.length === 0
            ? [{ value: "", label: "Select programme…" }]
            : [{ value: "", label: "Select programme…" }, ...programmeSelectOptions]
        }
      />

      {loading ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.campaignUid} className="p-5 border-border/70 bg-[var(--surface-card)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <CampaignStatusBadge status={r.status} />
                    <p className="font-semibold">{r.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Points: {r.stats?.totalPointsIssued ?? "—"} · Cashback: {r.stats?.totalCashbackRecorded ?? "—"} ·
                    Participations: {r.stats?.totalParticipations ?? "—"}
                  </p>
                </div>
                <Link href={`/dashboard/campaigns/${encodeURIComponent(r.campaignUid)}`}>
                  <Button variant="outline" className="rounded-full">
                    Details
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
