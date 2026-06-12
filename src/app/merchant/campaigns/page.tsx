"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  getMerchantToken,
  merchantCreateCampaign,
  merchantListCampaigns,
} from "@/lib/api/merchant";
import type { CampaignResponse } from "@/types/campaigns";
import { Button } from "@/components/ui/button";

export default function MerchantCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [programmeUid, setProgrammeUid] = useState("default");
  const [budgetTotal, setBudgetTotal] = useState(10000);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await merchantListCampaigns());
    } catch {
      router.replace("/merchant/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace("/merchant/login");
      return;
    }
    void load();
  }, [load, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date();
      const validFrom = now.toISOString();
      const validUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      await merchantCreateCampaign({
        programmeUid,
        name,
        campaignType: "MERCHANT_FUNDED",
        triggerEventType: "PURCHASE",
        budgetTotal,
        validFrom,
        validUntil,
        offerConfig: {
          awardType: "POINTS_BONUS",
          bonusPoints: 100,
        },
      });
      toast.success("Campaign submitted for tenant approval");
      setName("");
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My campaigns</h1>
        <Link href="/merchant/dashboard" className="text-sm text-primary underline">
          Back to dashboard
        </Link>
      </div>

      <Button type="button" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "New campaign"}
      </Button>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-border p-4 space-y-3">
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Campaign name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Programme UID"
            required
            value={programmeUid}
            onChange={(e) => setProgrammeUid(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Budget"
            required
            value={budgetTotal}
            onChange={(e) => setBudgetTotal(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Merchant-funded campaigns require tenant approval before going live.
          </p>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for approval"}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Pending approval</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignUid} className="border-t border-border">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.status}</td>
                  <td className="p-2">{c.pendingMerchantApproval ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
