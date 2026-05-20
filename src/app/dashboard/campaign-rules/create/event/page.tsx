"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "@/app/dashboard/loyalty-rules/create/_components/CreateRuleShell";
import { stepHref, useRuleCreateFlow } from "@/app/dashboard/loyalty-rules/create/_components/rule-create-flow";
import { campaignsAdminApi } from "@/lib/api/client";
import { loadCampaignTriggerEventOptions } from "@/lib/campaigns/load-campaign-trigger-event-options";
import { parseTriggerEventTypes } from "@/lib/campaigns/trigger-event-types";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FieldHelp } from "@/components/ui/field-help";

export default function CreateCampaignRuleEventPage() {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { basePath } = useRuleCreateFlow();
  const [eventType, setEventType] = useState("");
  const [eventOptions, setEventOptions] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [programmeUid, setProgrammeUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError(null);
      try {
        const campaign = await campaignsAdminApi.getCampaign(draft.campaignUid!);
        if (!alive) return;

        const progUid = campaign.programmeUid?.trim() || "default";
        const savedParts = parseTriggerEventTypes(draft.triggerEventType);
        const preserveSelected = savedParts.length === 1 ? savedParts : [];

        const types = await loadCampaignTriggerEventOptions({
          mode: "edit",
          programmeUid: progUid,
          campaignUid: campaign.campaignUid,
          preserveSelected,
        });

        if (types.length === 0) {
          setLoadError(
            "No event types found in the campaign or programme schema. Configure events under Programme or Campaign schema first."
          );
        }

        setCampaignName(campaign.name);
        setProgrammeUid(progUid);
        setEventOptions(types);
        saveRuleDraftFields(
          tenantId,
          {
            campaignName: campaign.name,
            programmeUid: progUid,
            campaignTriggerEventTypes: campaign.triggerEventType.trim(),
          },
          "campaign"
        );

        const saved = savedParts.length === 1 ? savedParts[0] : "";
        if (saved && types.some((t) => t.toUpperCase() === saved.toUpperCase())) {
          setEventType(saved);
        } else if (types.length === 1) {
          setEventType(types[0]);
        } else {
          setEventType("");
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load event types");
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
    const normalized = eventType.trim().toUpperCase();
    if (!eventOptions.some((t) => t.toUpperCase() === normalized)) {
      toast.error("Selected event is not in the campaign or programme schema.");
      return;
    }
    saveRuleDraftFields(
      tenantId,
      { triggerEventType: normalized },
      "campaign"
    );
    router.push(stepHref(basePath, "basic-info"));
  };

  return (
    <CreateRuleShell title="Events">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-5">
        <p className="text-sm text-muted-foreground">
          Step 2 — Pick the trigger event type for campaign{" "}
          <span className="font-medium text-foreground">{campaignName || "…"}</span>. Options come from
          this campaign&apos;s event schema, or from the programme schema when the campaign has none yet.
        </p>

        {loading ? (
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="event-select">Event type</Label>
                <FieldHelp text="Event types are loaded from the campaign event schema (Campaign schema tab) or, if empty, from Configure Programme → Events. Pick the event this rule should react to." />
              </div>
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
            {loadError ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">{loadError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {eventOptions.length} event type{eventOptions.length === 1 ? "" : "s"} available
                {programmeUid ? ` for programme ${programmeUid}` : ""}.
              </p>
            )}
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
            disabled={!eventType || loading || eventOptions.length === 0}
          >
            Next: Campaign rule →
          </Button>
        </div>
      </Card>
    </CreateRuleShell>
  );
}
