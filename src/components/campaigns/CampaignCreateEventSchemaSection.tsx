"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import {
  EventSchemaEditorForm,
  ReadOnlyEventSchema,
} from "@/components/dashboard/event-schema/EventSchemaEditor";
import { createEventSchemaMutators } from "@/components/dashboard/event-schema/event-schema-editor-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { campaignCreateHasEventSchemaContent } from "@/lib/campaigns/campaign-create-event-schema";
import { ApiError, ensureAuthSession, programmeApiV2 } from "@/lib/api/client";
import {
  defaultEventSchemaDraft,
  eventSchemaDraftFromCampaign,
} from "@/lib/programme/event-schema-merge";

export function CampaignCreateEventSchemaSection() {
  const {
    form,
    eventSchemaDraft,
    setEventSchemaDraft,
    eventSchemaBootstrappedProgramme,
    setEventSchemaBootstrappedProgramme,
  } = useCampaignForm();
  const programmeUid = form.programmeUid?.trim() ?? "";

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(true);
  const mutators = useMemo(() => createEventSchemaMutators(setEventSchemaDraft), [setEventSchemaDraft]);

  const bootstrapFromProgramme = useCallback(async () => {
    if (!programmeUid) return;
    setLoading(true);
    try {
      await ensureAuthSession();
      const progBlob = await programmeApiV2.getProgrammeConfig(programmeUid).catch(() => null);
      const progRoot = (progBlob?.config ?? {}) as Record<string, unknown>;
      const empty = eventSchemaDraftFromCampaign({
        programmeConfigRoot: progRoot,
      });
      setEventSchemaDraft(empty);
      setEventSchemaBootstrappedProgramme(programmeUid);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Failed to load programme event template");
      setEventSchemaDraft(defaultEventSchemaDraft());
      setEventSchemaBootstrappedProgramme(null);
    } finally {
      setLoading(false);
    }
  }, [programmeUid, setEventSchemaDraft, setEventSchemaBootstrappedProgramme]);

  useEffect(() => {
    if (!programmeUid) {
      setEventSchemaDraft(defaultEventSchemaDraft());
      setEventSchemaBootstrappedProgramme(null);
      return;
    }
    // Keep user edits when navigating back to this step (context survives; local refs do not).
    if (eventSchemaBootstrappedProgramme === programmeUid) {
      return;
    }
    void bootstrapFromProgramme();
  }, [
    programmeUid,
    eventSchemaBootstrappedProgramme,
    bootstrapFromProgramme,
    setEventSchemaDraft,
    setEventSchemaBootstrappedProgramme,
  ]);

  const resetToTemplate = () => {
    void bootstrapFromProgramme();
    setEditing(true);
  };

  const startFromPurchaseTemplate = () => {
    setEventSchemaDraft(defaultEventSchemaDraft());
    setEventSchemaBootstrappedProgramme(programmeUid || null);
    setEditing(true);
  };

  const hasContent = campaignCreateHasEventSchemaContent(eventSchemaDraft);

  return (
    <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
      <div>
        <p className="text-sm font-semibold">Campaign event schema</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Define event types and payload fields for this campaign (optional). Saved to the campaign record on
          submit. You can change this later under Event Schema → Campaign schema, or add types when creating
          campaign rules.
        </p>
      </div>

      {!programmeUid ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Select a programme on Basic Info before configuring events.
        </p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading programme template…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={resetToTemplate}>
              Reset from programme template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={startFromPurchaseTemplate}
            >
              Start with PURCHASE template
            </Button>
            {hasContent ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setEventSchemaDraft(
                    eventSchemaDraftFromCampaign({ programmeConfigRoot: {} })
                  );
                  setEventSchemaBootstrappedProgramme(programmeUid || null);
                  setEditing(true);
                }}
              >
                Clear all events
              </Button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {hasContent
                  ? "Edit definitions below. Use Next to continue when ready."
                  : "Skip this step to define events later via rules or Event Schema setup."}
              </p>
              {hasContent ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? "Preview" : "Edit"}
                </Button>
              ) : null}
            </div>

            {editing || !hasContent ? (
              <EventSchemaEditorForm
                draft={eventSchemaDraft}
                setDraft={setEventSchemaDraft}
                mutators={mutators}
              />
            ) : (
              <ReadOnlyEventSchema draft={eventSchemaDraft} />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
