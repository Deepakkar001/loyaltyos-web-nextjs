"use client";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { summarizeCampaignCreateEventSchema } from "@/lib/campaigns/campaign-create-event-schema";
import { useProgrammeDropdown } from "@/lib/programme/use-programme-dropdown";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { CreateCampaignShell } from "../_components/CreateCampaignShell";
import { CampaignCreateStepNav } from "../_components/CampaignCreateStepNav";
import { useCampaignCreateSubmit } from "../_components/useCampaignCreateSubmit";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:col-span-2">{value || "—"}</dd>
    </div>
  );
}

export default function CreateCampaignReviewPage() {
  const { form, eventSchemaDraft } = useCampaignForm();
  const { submit, saving } = useCampaignCreateSubmit();
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const { resolveLabel } = useProgrammeDropdown(tenantId, form.programmeUid);

  return (
    <CreateCampaignShell title="Review">
      <div className="space-y-6 pb-10">
        <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
          <div>
            <p className="text-sm font-semibold">Review your campaign</p>
            <p className="text-sm text-muted-foreground mt-1">
              Confirm details below, then save as draft to finish.
            </p>
          </div>
          <Separator />
          <dl>
            <ReviewRow label="Programme" value={resolveLabel(form.programmeUid)} />
            <ReviewRow label="Name" value={form.name} />
            {form.description ? <ReviewRow label="Description" value={form.description} /> : null}
            <ReviewRow
              label="Schedule"
              value={`${form.validFromLocal || "—"} → ${form.validUntilLocal || "—"}`}
            />
            <ReviewRow
              label="Event schema"
              value={summarizeCampaignCreateEventSchema(eventSchemaDraft)}
            />
            <ReviewRow label="Budget" value={form.budgetTotal} />
            <ReviewRow label="Alert threshold %" value={form.alertThresholdPct} />
          </dl>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={saving !== null}
            onClick={() => submit("draft")}
          >
            {saving === "draft" ? "Saving…" : "Save as draft"}
          </Button>
        </div>

        <CampaignCreateStepNav stepIndex={3} />
      </div>
    </CreateCampaignShell>
  );
}
