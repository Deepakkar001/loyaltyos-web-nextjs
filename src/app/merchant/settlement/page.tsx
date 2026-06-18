"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, FileText } from "lucide-react";

import {
  MerchantEmptyState,
  MerchantOutlineButton,
  MerchantPageHeader,
  MerchantPageLoader,
  MerchantPanelCard,
  MerchantStatusBadge,
} from "@/components/merchant/merchant-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMerchantToken,
  merchantCreateSettlementDispute,
  merchantDownloadSettlement,
  merchantListSettlements,
  merchantSettlementLineItems,
} from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import type { MerchantSettlementCycle, SettlementLineItem } from "@/types/merchant";
import { cn } from "@/lib/utils";

export default function MerchantSettlementPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<MerchantSettlementCycle[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<SettlementLineItem[]>([]);
  const [disputeLineUid, setDisputeLineUid] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void merchantListSettlements()
      .then(setCycles)
      .catch(() => toast.error("Failed to load settlements"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedUid) {
      setLineItems([]);
      return;
    }
    void merchantSettlementLineItems(selectedUid).then(setLineItems).catch(() => setLineItems([]));
  }, [selectedUid]);

  async function downloadStatement(format: "csv" | "pdf" | "xlsx") {
    if (!selectedUid || !selected) return;
    try {
      const blob = await merchantDownloadSettlement(selectedUid, format);
      const ext = format === "xlsx" ? "xlsx" : format;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `settlement-${selected.periodStart}_${selected.periodEnd}.${ext}`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function submitDispute() {
    if (!selectedUid || !disputeLineUid.trim() || !disputeReason.trim()) return;
    try {
      await merchantCreateSettlementDispute(selectedUid, {
        lineItemUid: disputeLineUid,
        reason: disputeReason.trim(),
      });
      toast.success("Dispute submitted");
      setDisputeReason("");
      setDisputeLineUid("");
      setCycles(await merchantListSettlements());
      setLineItems(await merchantSettlementLineItems(selectedUid));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispute failed");
    }
  }

  if (loading) {
    return <MerchantPageLoader label="Loading settlement statements…" />;
  }

  const selected = cycles.find((c) => c.cycleUid === selectedUid) ?? null;

  return (
    <div className="space-y-8">
      <MerchantPageHeader
        title="Settlement"
        description="Review period-end statements, download reports, and raise disputes when needed."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <MerchantPanelCard
          title="Statements"
          description="Select a period to view details"
          className="lg:col-span-2"
        >
          {cycles.length === 0 ? (
            <MerchantEmptyState
              icon={FileText}
              title="No statements yet"
              description="Your programme administrator will generate period-end settlement statements. They will appear here when ready."
            />
          ) : (
            <ul className="space-y-2">
              {cycles.map((c) => {
                const isSelected = c.cycleUid === selectedUid;
                return (
                  <li key={c.cycleUid}>
                    <button
                      type="button"
                      onClick={() => setSelectedUid(c.cycleUid)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left text-sm transition-all",
                        isSelected
                          ? "border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/20"
                          : "border-border/50 bg-muted/15 hover:border-emerald-500/25 hover:bg-emerald-500/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {c.periodStart} – {c.periodEnd}
                        </span>
                        <MerchantStatusBadge status={c.status} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {Number(c.totalMonetaryValue).toLocaleString()} total · {c.lineItemCount}{" "}
                        line items
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </MerchantPanelCard>

        <div className="lg:col-span-3">
          {selected ? (
            <MerchantPanelCard
              title="Statement detail"
              description={`${selected.periodStart} – ${selected.periodEnd}`}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total value
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {Number(selected.totalMonetaryValue).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Line items
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{selected.lineItemCount}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(["csv", "pdf", "xlsx"] as const).map((format) => (
                  <MerchantOutlineButton
                    key={format}
                    onClick={() => void downloadStatement(format)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {format.toUpperCase()}
                  </MerchantOutlineButton>
                ))}
              </div>

              {lineItems.length > 0 && (
                <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Reference</th>
                        <th className="px-4 py-3 text-right">Points</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((line) => (
                        <tr key={line.lineItemUid} className="border-t border-border/40">
                          <td className="px-4 py-3 font-mono text-xs">{line.txnReference}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{line.pointsAmount}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {Number(line.monetaryValue).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {line.disputed ? (
                              <span className="text-amber-600">Disputed</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selected.status !== "FINAL" && (
                <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-muted/15 p-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Raise a dispute</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Disputes must be raised within 5 business days of statement publication.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dispute-line">Line item UID</Label>
                      <Input
                        id="dispute-line"
                        value={disputeLineUid}
                        onChange={(e) => setDisputeLineUid(e.target.value)}
                        placeholder="SLI_…"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="dispute-reason">Reason</Label>
                      <Input
                        id="dispute-reason"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the discrepancy"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void submitDispute()}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500"
                  >
                    Submit dispute
                  </Button>
                </div>
              )}
            </MerchantPanelCard>
          ) : (
            <MerchantPanelCard>
              <MerchantEmptyState
                icon={FileText}
                title="Select a statement"
                description="Choose a settlement period from the list to view line items, download reports, or raise a dispute."
              />
            </MerchantPanelCard>
          )}
        </div>
      </div>
    </div>
  );
}
