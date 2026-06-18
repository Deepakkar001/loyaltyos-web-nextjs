"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { campaignsAdminApi, programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import {
  buildEventDefinitionPayload,
  buildEventSchemaJsonNode,
  buildEventSchemaSettingsPayload,
  defaultEventSchemaDraft,
  eventSchemaDraftFromCampaign,
  eventSchemaDraftFromConfigRoot,
  isLikelyCompleteProgrammeConfig,
  type EventSchemaDefinitionDraft,
  type EventSchemaDraft,
} from "@/lib/programme/event-schema-merge";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { CampaignResponse } from "@/types/campaigns";
import { cn } from "@/lib/utils";

import {
  EventDefinitionEditCard,
  ReadOnlyEventSchema,
  SchemaSettingsEditCard,
  eventKeysEqual,
} from "./EventSchemaEditor";
import {
  cloneEventSchemaDraft,
  validateEventDefinition,
  validateEventSchemaSettings,
} from "./event-schema-editor-utils";

type SchemaScope = "programme" | "campaign";

const NEW_EVENT_KEY = "__new__";
const TERMINAL_CAMPAIGN_STATUSES = new Set(["ENDED", "EXHAUSTED", "EXPIRED"]);

const DEFAULT_NEW_EVENT: EventSchemaDefinitionDraft = {
  eventType: "EVENT_1",
  coreFields: [
    { name: "transactionId", type: "string", required: true },
    { name: "eventType", type: "string", required: true },
  ],
};

export function EventSchemaSetupPanel() {
  const tenantId = useOnboardingStore((s) => s.tenantId);

  const [scope, setScope] = useState<SchemaScope>("programme");
  const [programmeRows, setProgrammeRows] = useState<Array<{ programmeUid: string; name: string }>>([
    { programmeUid: "default", name: "Default programme" },
  ]);
  const [programmeUid, setProgrammeUid] = useState("default");
  const [campaignRows, setCampaignRows] = useState<CampaignResponse[]>([]);
  const [campaignUid, setCampaignUid] = useState("");

  const [loadingList, setLoadingList] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [responseTenantId, setResponseTenantId] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);
  const [draft, setDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft());

  const [editingEventKey, setEditingEventKey] = useState<string | null>(null);
  const [eventEditDraft, setEventEditDraft] = useState<EventSchemaDefinitionDraft | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsEditDraft, setSettingsEditDraft] = useState<EventSchemaDraft | null>(null);

  const resetEditState = useCallback(() => {
    setEditingEventKey(null);
    setEventEditDraft(null);
    setEditingSettings(false);
    setSettingsEditDraft(null);
  }, []);

  const programmeLabel = useMemo(
    () => programmeRows.find((p) => p.programmeUid === programmeUid)?.name ?? programmeUid,
    [programmeRows, programmeUid]
  );

  const selectedCampaign = useMemo(
    () => campaignRows.find((c) => c.campaignUid === campaignUid),
    [campaignRows, campaignUid]
  );

  const campaignLabel = selectedCampaign?.name ?? campaignUid;

  const campaignSchemaLocked = Boolean(
    selectedCampaign && TERMINAL_CAMPAIGN_STATUSES.has(selectedCampaign.status)
  );

  const applyDraftFromRoot = useCallback((root: Record<string, unknown>) => {
    const d = eventSchemaDraftFromConfigRoot(root);
    setDraft(d);
    resetEditState();
  }, [resetEditState]);

  const loadProgrammes = useCallback(async () => {
    if (!tenantId) return;
    setLoadingList(true);
    try {
      await ensureAuthSession();
      const list = await programmeApiV2.listProgrammes();
      setProgrammeRows(mergeProgrammeDropdownRows(list));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [tenantId]);

  const loadCampaigns = useCallback(async () => {
    if (!tenantId) return;
    try {
      await ensureAuthSession();
      const list = await campaignsAdminApi.listCampaigns({ programmeUid });
      setCampaignRows(list);
      if (list.length && !list.some((c) => c.campaignUid === campaignUid)) {
        setCampaignUid(list[0].campaignUid);
      }
      if (list.length === 0) {
        setCampaignUid("");
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, [tenantId, programmeUid, campaignUid]);

  const loadProgrammeSchema = useCallback(async () => {
    if (!tenantId) return;
    setLoadingConfig(true);
    setConfigMissing(false);
    try {
      await ensureAuthSession();
      const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
      setResponseTenantId(blob.tenantId);
      setConfigVersion(blob.configVersion);
      const root = (blob.config ?? {}) as Record<string, unknown>;
      if (!isLikelyCompleteProgrammeConfig(root)) {
        setConfigMissing(true);
        setDraft(defaultEventSchemaDraft());
        resetEditState();
        return;
      }
      setConfigMissing(false);
      applyDraftFromRoot(root);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      setConfigMissing(true);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId, programmeUid, applyDraftFromRoot, resetEditState]);

  const loadCampaignSchema = useCallback(async () => {
    if (!tenantId || !campaignUid) return;
    setLoadingConfig(true);
    try {
      await ensureAuthSession();
      const [campaign, progBlob] = await Promise.all([
        campaignsAdminApi.getCampaign(campaignUid),
        programmeApiV2.getProgrammeConfig(programmeUid).catch(() => null),
      ]);
      const progRoot = (progBlob?.config ?? {}) as Record<string, unknown>;
      setConfigMissing(false);
      const d = eventSchemaDraftFromCampaign({
        eventSchema: campaign.eventSchema,
        triggerEventType: campaign.triggerEventType,
        programmeConfigRoot: progRoot,
      });
      setDraft(d);
      resetEditState();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId, campaignUid, programmeUid, resetEditState]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (scope === "campaign") {
      void loadCampaigns();
    }
  }, [scope, loadCampaigns]);

  useEffect(() => {
    resetEditState();
    if (scope === "programme") {
      void loadProgrammeSchema();
    } else if (campaignUid) {
      void loadCampaignSchema();
    }
  }, [scope, loadProgrammeSchema, loadCampaignSchema, campaignUid, resetEditState]);

  const startEditEvent = (eventType: string) => {
    const def = draft.eventDefinitions.find((d) => eventKeysEqual(d.eventType, eventType));
    if (!def) return;
    setEditingSettings(false);
    setSettingsEditDraft(null);
    setEditingEventKey(eventType);
    setEventEditDraft({
      eventType: def.eventType,
      coreFields: def.coreFields.map((f) => ({ ...f })),
    });
  };

  const startAddEvent = () => {
    setEditingSettings(false);
    setSettingsEditDraft(null);
    setEditingEventKey(NEW_EVENT_KEY);
    setEventEditDraft({
      ...DEFAULT_NEW_EVENT,
      eventType: `EVENT_${draft.eventDefinitions.length + 1}`,
      coreFields: DEFAULT_NEW_EVENT.coreFields.map((f) => ({ ...f })),
    });
  };

  const startEditSettings = () => {
    setEditingEventKey(null);
    setEventEditDraft(null);
    setEditingSettings(true);
    setSettingsEditDraft(cloneEventSchemaDraft(draft));
  };

  const saveEventDefinition = async () => {
    if (!eventEditDraft || !editingEventKey || !tenantId) return;
    const err = validateEventDefinition(eventEditDraft);
    if (err) {
      toast.error(err);
      return;
    }
    if (scope === "campaign" && campaignSchemaLocked) {
      toast.error("Cannot edit schema for a ended or expired campaign.");
      return;
    }

    const payload = buildEventDefinitionPayload(eventEditDraft);
    const isNew = editingEventKey === NEW_EVENT_KEY;
    if (isNew) {
      const duplicate = draft.eventDefinitions.some((d) => eventKeysEqual(d.eventType, payload.eventType));
      if (duplicate) {
        toast.error(`Event type ${payload.eventType} already exists.`);
        return;
      }
    }

    setSaving(true);
    try {
      await ensureAuthSession();
      if (scope === "programme") {
        if (isNew) {
          await programmeApiV2.addProgrammeEventDefinition(programmeUid, payload);
        } else {
          await programmeApiV2.patchProgrammeEventDefinition(programmeUid, editingEventKey, payload);
        }
        toast.success(isNew ? "Event type added" : `Saved ${payload.eventType}`);
        await loadProgrammeSchema();
      } else if (campaignUid) {
        if (isNew) {
          await campaignsAdminApi.addCampaignEventDefinition(campaignUid, payload);
        } else {
          await campaignsAdminApi.patchCampaignEventDefinition(campaignUid, editingEventKey, payload);
        }
        toast.success(isNew ? "Event type added" : `Saved ${payload.eventType}`);
        await loadCampaignSchema();
        await loadCampaigns();
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeEventDefinition = async (eventType: string) => {
    if (!tenantId || draft.eventDefinitions.length <= 1) return;
    if (scope === "campaign" && campaignSchemaLocked) {
      toast.error("Cannot edit schema for a ended or expired campaign.");
      return;
    }
    if (!window.confirm(`Remove event type ${eventType}?`)) return;

    setSaving(true);
    try {
      await ensureAuthSession();
      if (scope === "programme") {
        await programmeApiV2.removeProgrammeEventDefinition(programmeUid, eventType);
        toast.success(`Removed ${eventType}`);
        await loadProgrammeSchema();
      } else if (campaignUid) {
        await campaignsAdminApi.removeCampaignEventDefinition(campaignUid, eventType);
        toast.success(`Removed ${eventType}`);
        await loadCampaignSchema();
        await loadCampaigns();
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settingsEditDraft || !tenantId) return;
    const err = validateEventSchemaSettings(settingsEditDraft);
    if (err) {
      toast.error(err);
      return;
    }
    if (scope === "campaign" && campaignSchemaLocked) {
      toast.error("Cannot edit schema for a ended or expired campaign.");
      return;
    }

    const payload = buildEventSchemaSettingsPayload(settingsEditDraft);
    setSaving(true);
    try {
      await ensureAuthSession();
      if (scope === "programme") {
        await programmeApiV2.patchProgrammeEventSchemaSettings(programmeUid, payload);
        toast.success("Schema settings saved");
        await loadProgrammeSchema();
      } else if (campaignUid) {
        await campaignsAdminApi.patchCampaignEventSchemaSettings(campaignUid, payload);
        toast.success("Schema settings saved");
        await loadCampaignSchema();
        await loadCampaigns();
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewJson = useMemo(() => JSON.stringify(buildEventSchemaJsonNode(draft), null, 2), [draft]);

  const showProgrammeMissing = scope === "programme" && configMissing;
  const showCampaignEmpty = scope === "campaign" && campaignRows.length === 0;
  const showSchemaSection = !showProgrammeMissing && !showCampaignEmpty;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Event schema</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configure JSON payload fields per event type for your <strong>programme</strong> (tenant-wide rules) or per{" "}
            <strong>campaign</strong> (campaign earn rules). Each event type is edited and saved independently.
          </p>
        </div>
        {responseTenantId && scope === "programme" ? (
          <p className="text-xs text-muted-foreground shrink-0">
            Tenant <span className="font-mono text-foreground">{responseTenantId}</span>
            {configVersion > 0 ? <> · v{configVersion}</> : null}
          </p>
        ) : null}
      </div>

      <Card className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="inline-flex rounded-full border border-border bg-[var(--surface-sunken)] p-1">
            <button
              type="button"
              onClick={() => setScope("programme")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                scope === "programme"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Programme schema
            </button>
            <button
              type="button"
              onClick={() => setScope("campaign")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                scope === "campaign"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Campaign schema
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Programme</p>
              <NativeSelect
                ariaLabel="Programme"
                className="max-w-md"
                value={programmeUid}
                disabled={loadingList || loadingConfig || saving}
                onChange={(v) => {
                  setProgrammeUid(v);
                  resetEditState();
                }}
                options={programmeRows.map((p) => ({ value: p.programmeUid, label: p.name }))}
              />
            </div>
            {scope === "campaign" ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Campaign</p>
                <NativeSelect
                  ariaLabel="Campaign"
                  className="max-w-md"
                  value={campaignUid}
                  disabled={loadingList || loadingConfig || saving || campaignRows.length === 0}
                  onChange={(v) => {
                    setCampaignUid(v);
                    resetEditState();
                  }}
                  options={
                    campaignRows.length === 0
                      ? [{ value: "", label: "No campaigns for this programme" }]
                      : campaignRows.map((c) => ({
                          value: c.campaignUid,
                          label: `${c.name} (${c.status})`,
                        }))
                  }
                />
              </div>
            ) : null}
          </div>
          <Badge variant="secondary" className="shrink-0 self-start lg:self-center max-w-full truncate">
            {scope === "programme" ? programmeLabel : campaignLabel || "—"}
          </Badge>
        </div>

        {showProgrammeMissing ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-foreground">No saved programme configuration for this programme yet.</p>
            <p className="mt-1 text-muted-foreground">
              Complete <strong>Configure Programme</strong> first so a valid config exists, then return here.
            </p>
            <Link
              href={`/dashboard/configure?programmeUid=${encodeURIComponent(programmeUid)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex mt-3")}
            >
              Open Configure Programme
            </Link>
          </div>
        ) : null}

        {showCampaignEmpty ? <CampaignEmptyState /> : null}

        {showSchemaSection ? (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {scope === "programme" ? "Programme event schema" : "Campaign event schema"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                {scope === "programme"
                  ? "Stored in programme_config.config_json.eventSchema. Edit one event type at a time — only that definition is updated on save."
                  : "Stored in campaigns.event_schema. Edit one event type at a time — other events are unchanged."}
              </p>
              {scope === "campaign" && selectedCampaign ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{selectedCampaign.status}</span>
                  {campaignSchemaLocked ? (
                    <span className="ml-2 text-amber-700 dark:text-amber-300">Schema cannot be edited.</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            {loadingConfig ? (
              <p className="text-sm text-muted-foreground">Loading schema…</p>
            ) : (
              <div className="space-y-4">
                {editingSettings && settingsEditDraft ? (
                  <SchemaSettingsEditCard
                    draft={settingsEditDraft}
                    setDraft={(updater) => {
                      setSettingsEditDraft((prev) => {
                        if (!prev) return prev;
                        return typeof updater === "function" ? updater(prev) : updater;
                      });
                    }}
                    saving={saving}
                    onCancel={() => {
                      setEditingSettings(false);
                      setSettingsEditDraft(null);
                    }}
                    onSave={() => void saveSettings()}
                  />
                ) : null}

                <ReadOnlyEventSchema
                  draft={{
                    ...draft,
                    eventDefinitions: draft.eventDefinitions.filter(
                      (def) => !editingEventKey || !eventKeysEqual(def.eventType, editingEventKey)
                    ),
                  }}
                  editingEventKey={editingEventKey}
                  editingSettings={editingSettings}
                  campaignSchemaLocked={campaignSchemaLocked}
                  saving={saving}
                  onEditEvent={startEditEvent}
                  onRemoveEvent={(eventType) => void removeEventDefinition(eventType)}
                  onAddEvent={startAddEvent}
                  onEditSettings={startEditSettings}
                />

                {editingEventKey && eventEditDraft ? (
                  <EventDefinitionEditCard
                    draft={eventEditDraft}
                    setDraft={(updater) => {
                      setEventEditDraft((prev) => {
                        if (!prev) return prev;
                        return typeof updater === "function" ? updater(prev) : updater;
                      });
                    }}
                    isNew={editingEventKey === NEW_EVENT_KEY}
                    saving={saving}
                    onCancel={() => {
                      setEditingEventKey(null);
                      setEventEditDraft(null);
                    }}
                    onSave={() => void saveEventDefinition()}
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {showSchemaSection && !editingEventKey && !editingSettings ? (
          <details className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <summary className="text-xs font-medium cursor-pointer text-muted-foreground">Raw eventSchema JSON</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-64 rounded-lg bg-background p-3 border border-border">
              {previewJson}
            </pre>
          </details>
        ) : null}
      </Card>
    </div>
  );
}

function CampaignEmptyState() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-3">
      <p className="font-medium text-foreground">No campaigns for this programme.</p>
      <p className="text-muted-foreground">Create a campaign first, then define its per-event payload schema here.</p>
      <Link
        href="/dashboard/campaigns/create"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
      >
        Create campaign
      </Link>
    </div>
  );
}
