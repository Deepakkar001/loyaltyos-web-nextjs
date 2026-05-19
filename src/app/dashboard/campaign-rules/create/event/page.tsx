"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "@/app/dashboard/loyalty-rules/create/_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "@/app/dashboard/loyalty-rules/create/_components/rule-create-flow";
import { campaignsAdminApi } from "@/lib/api/client";
import { parseTriggerEventTypes } from "@/lib/campaigns/trigger-event-types";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default function CreateCampaignRuleEventPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { basePath } = useRuleCreateFlow();
  const [eventType, setEventType] = useState("");
  const [eventOptions, setEventOptions] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const draft = loadRuleDraft(tenantId, "campaign");
    if (!draft?.campaignUid) {
      router.replace(stepHref(basePath, "campaign"));
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const campaign = await campaignsAdminApi.getCampaign(draft.campaignUid!);
        if (!alive) return;

        const types = parseTriggerEventTypes(campaign.triggerEventType);
        if (types.length === 0) {
          toast.error("This campaign has no event types configured.");
          router.replace(stepHref(basePath, "campaign"));
          return;
        }

        setCampaignName(campaign.name);
        setEventOptions(types);
        saveRuleDraftFields(
          tenantId,
          {
            campaignName: campaign.name,
            programmeUid: campaign.programmeUid ?? "default",
            campaignTriggerEventTypes: campaign.triggerEventType.trim(),
          },
          "campaign"
        );

        const savedParts = parseTriggerEventTypes(draft.triggerEventType);
        const saved = savedParts.length === 1 ? savedParts[0] : "";
        if (saved && types.includes(saved)) {
          setEventType(saved);
        } else if (types.length === 1) {
          setEventType(types[0]);
        } else {
          setEventType("");
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load campaign");
        router.replace(stepHref(basePath, "campaign"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tenantId, router, basePath]);

  const onNext = () => {
    if (!tenantId || !eventType.trim()) {
      toast.error("Select an event type.");
      return;
    }
    if (!eventOptions.includes(eventType.trim().toUpperCase())) {
      toast.error("Selected event is not configured on this campaign.");
      return;
    }
    saveRuleDraftFields(
      tenantId,
      { triggerEventType: eventType.trim().toUpperCase() },
      "campaign"
    );
    router.push(stepHref(basePath, "basic-info"));
  };

  return (
    <CreateRuleShell title="Events">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-5">
        <p className="text-sm text-muted-foreground">
          Step 2 — Pick the event type for campaign{" "}
          <span className="font-medium text-foreground">{campaignName || "…"}</span>. Only event types
          configured on that campaign are listed.
        </p>

        {loading ? (
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="event-select">Event type</Label>
              <NativeSelect
                id="event-select"
                ariaLabel="Event type"
                value={eventType}
                onChange={setEventType}
                disabled={eventOptions.length === 0}
                options={[
                  { value: "", label: "Select an event type…" },
                  ...eventOptions.map((t) => ({ value: t, label: t })),
                ]}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {eventOptions.length} event type{eventOptions.length === 1 ? "" : "s"} available on this campaign.
            </p>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => router.push(stepHref(basePath, "campaign"))}
          >
            ← Back to campaigns
          </Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={onNext}
            disabled={!eventType || loading}
          >
            Next: Campaign rule →
          </Button>
        </div>
      </Card>
    </CreateRuleShell>
  );
}
