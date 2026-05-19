"use client";

import Link from "next/link";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { formatTriggerEventTypesLabel } from "@/lib/campaigns/trigger-event-types";
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
  const { form } = useCampaignForm();
  const { submit, saving } = useCampaignCreateSubmit();

  return (
    <CreateCampaignShell title="Review">
      <div className="space-y-6 pb-10">
        <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
          <div>
            <p className="text-sm font-semibold">Review your campaign</p>
            <p className="text-sm text-muted-foreground mt-1">
              Confirm details below, then save as draft or activate immediately.
            </p>
          </div>
          <Separator />
          <dl>
            <ReviewRow label="Name" value={form.name} />
            {form.description ? <ReviewRow label="Description" value={form.description} /> : null}
            <ReviewRow
              label="Schedule"
              value={`${form.validFromLocal || "—"} → ${form.validUntilLocal || "—"}`}
            />
            <ReviewRow label="Event types" value={formatTriggerEventTypesLabel(form.triggerEventType)} />
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
          <Button
            type="button"
            className="rounded-full"
            disabled={saving !== null}
            onClick={() => submit("activate")}
          >
            {saving === "activate" ? "Activating…" : "Save and activate"}
          </Button>
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="ghost" className="rounded-full" disabled={saving !== null}>
              Cancel
            </Button>
          </Link>
        </div>

        <CampaignCreateStepNav stepIndex={2} />
      </div>
    </CreateCampaignShell>
  );
}
