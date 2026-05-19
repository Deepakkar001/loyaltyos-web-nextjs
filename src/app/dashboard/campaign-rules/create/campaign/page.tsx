"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "@/app/dashboard/loyalty-rules/create/_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "@/app/dashboard/loyalty-rules/create/_components/rule-create-flow";
import { campaignsAdminApi } from "@/lib/api/client";
import {
  formatTriggerEventTypesLabel,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import type { CampaignResponse } from "@/types/campaigns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default function CreateCampaignRuleCampaignPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { basePath } = useRuleCreateFlow();
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await campaignsAdminApi.listCampaigns();
        if (!alive) return;
        setCampaigns(list);
        const draft = tenantId ? loadRuleDraft(tenantId, "campaign") : null;
        if (draft?.campaignUid && list.some((c) => c.campaignUid === draft.campaignUid)) {
          setSelectedUid(draft.campaignUid);
        } else if (list.length === 1) {
          setSelectedUid(list[0].campaignUid);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load campaigns");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantId]);

  const selected = campaigns.find((c) => c.campaignUid === selectedUid);
  const selectedEvents = selected ? parseTriggerEventTypes(selected.triggerEventType) : [];

  const onNext = () => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    if (!selected) {
      toast.error("Select a campaign to continue.");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("This campaign has no event types. Edit the campaign and add at least one event type.");
      return;
    }

    const existing = loadRuleDraft(tenantId, "campaign");
    const campaignChanged = existing?.campaignUid !== selected.campaignUid;

    saveRuleDraftFields(
      tenantId,
      {
        ruleType: "CAMPAIGN",
        programmeUid: selected.programmeUid ?? "default",
        campaignUid: selected.campaignUid,
        campaignName: selected.name,
        campaignTriggerEventTypes: selected.triggerEventType.trim(),
        triggerEventType: campaignChanged ? "" : (existing?.triggerEventType ?? ""),
        status: existing?.status ?? "DRAFT",
        priority: existing?.priority ?? 10,
        executionMode: existing?.executionMode ?? "ALL_MATCHING",
        conditionTree: existing?.conditionTree ?? {},
        actions: existing?.actions ?? [{ actionType: "AWARD_POINTS", formula: "event.amount * 0.01" }],
      },
      "campaign"
    );
    router.push(stepHref(basePath, "event"));
  };

  return (
    <CreateRuleShell title="Campaigns">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-5">
        <p className="text-sm text-muted-foreground">
          Step 1 — Choose the campaign. On the next step you will pick one of that campaign&apos;s event types,
          then configure the earn rule.
        </p>

        {loading ? (
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : campaigns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">No campaigns found</p>
            <p className="text-sm text-muted-foreground">Create a campaign first, then add rules for it.</p>
            <Button className="rounded-full" onClick={() => router.push("/dashboard/campaigns/create")}>
              Create campaign
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="campaign-select">Campaign</Label>
              <NativeSelect
                id="campaign-select"
                ariaLabel="Campaign"
                value={selectedUid}
                onChange={setSelectedUid}
                options={[
                  { value: "", label: "Select a campaign…" },
                  ...campaigns.map((c) => ({
                    value: c.campaignUid,
                    label: `${c.name} (${c.status})`,
                  })),
                ]}
              />
            </div>
            {selected ? (
              <div className="rounded-xl border border-border/60 bg-[var(--surface-sunken)] px-4 py-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Programme:</span>{" "}
                  <span className="font-medium">{selected.programmeUid}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Event types on this campaign:</span>{" "}
                  <span className="font-mono font-medium">
                    {formatTriggerEventTypesLabel(selected.triggerEventType)}
                  </span>
                </p>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This campaign has no event types yet. Add them in campaign settings before creating a rule.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={onNext}
                disabled={!selectedUid || selectedEvents.length === 0}
              >
                Next: Events →
              </Button>
            </div>
          </>
        )}
      </Card>
    </CreateRuleShell>
  );
}
