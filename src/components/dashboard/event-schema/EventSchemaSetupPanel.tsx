"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { campaignsAdminApi, programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import {
  buildEventSchemaJsonNode,
  defaultEventSchemaDraft,
  eventSchemaDraftFromCampaign,
  eventSchemaDraftFromConfigRoot,
  isLikelyCompleteProgrammeConfig,
  mergeEventSchemaIntoProgrammeConfig,
  type EventSchemaDraft,
} from "@/lib/programme/event-schema-merge";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { CampaignResponse } from "@/types/campaigns";
import { cn } from "@/lib/utils";

import { EventSchemaEditorForm, ReadOnlyEventSchema } from "./EventSchemaEditor";
import {
  cloneEventSchemaDraft,
  createEventSchemaMutators,
  validateEventSchemaDraft,
} from "./event-schema-editor-utils";

type SchemaScope = "programme" | "campaign";

const TERMINAL_CAMPAIGN_STATUSES = new Set(["ENDED", "EXHAUSTED", "EXPIRED"]);

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
  const [editing, setEditing] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [responseTenantId, setResponseTenantId] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);
  const [draft, setDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft());
  const [baselineDraft, setBaselineDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft());
  const mutators = useMemo(() => createEventSchemaMutators(setDraft), []);

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
        const empty = defaultEventSchemaDraft();
        setDraft(empty);
        setBaselineDraft(cloneEventSchemaDraft(empty));
        return;
      }
      setConfigMissing(false);
      const d = eventSchemaDraftFromConfigRoot(root);
      setDraft(d);
      setBaselineDraft(cloneEventSchemaDraft(d));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      setConfigMissing(true);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId, programmeUid]);

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
      setBaselineDraft(cloneEventSchemaDraft(d));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId, campaignUid, programmeUid]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (scope === "campaign") {
      void loadCampaigns();
    }
  }, [scope, loadCampaigns]);

  useEffect(() => {
    setEditing(false);
    if (scope === "programme") {
      void loadProgrammeSchema();
    } else if (campaignUid) {
      void loadCampaignSchema();
    }
  }, [scope, loadProgrammeSchema, loadCampaignSchema, campaignUid]);

  const cancelEdit = () => {
    setDraft(cloneEventSchemaDraft(baselineDraft));
    setEditing(false);
  };

  const persistProgramme = async () => {
    const err = validateEventSchemaDraft(draft);
    if (err) {
      toast.error(err);
      return;
    }
    if (!tenantId) return;
    setSaving(true);
    try {
      await ensureAuthSession();
      const fresh = await programmeApiV2.getProgrammeConfig(programmeUid);
      if (fresh.tenantId && tenantId && fresh.tenantId !== tenantId) {
        toast.error("Cannot save: tenant mismatch.");
        return;
      }
      const root = (fresh.config ?? {}) as Record<string, unknown>;
      if (!isLikelyCompleteProgrammeConfig(root)) {
        toast.error("Save a full programme configuration under Configure Programme first.");
        return;
      }
      const merged = mergeEventSchemaIntoProgrammeConfig(root, draft);
      await programmeApiV2.upsertProgrammeConfig(programmeUid, { config: merged });
      toast.success("Programme event schema saved");
      setEditing(false);
      await loadProgrammeSchema();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const persistCampaign = async () => {
    const err = validateEventSchemaDraft(draft);
    if (err) {
      toast.error(err);
      return;
    }
    if (!tenantId || !campaignUid) return;
    if (campaignSchemaLocked) {
      toast.error("Cannot edit schema for a ended or expired campaign.");
      return;
    }
    setSaving(true);
    try {
      await ensureAuthSession();
      await campaignsAdminApi.upsertCampaignEventSchema(campaignUid, {
        eventSchema: buildEventSchemaJsonNode(draft),
      });
      toast.success("Campaign event schema saved");
      setEditing(false);
      await loadCampaignSchema();
      await loadCampaigns();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const persist = scope === "programme" ? persistProgramme : persistCampaign;

  const previewJson = useMemo(() => JSON.stringify(buildEventSchemaJsonNode(draft), null, 2), [draft]);

  const showProgrammeMissing = scope === "programme" && configMissing;
  const showCampaignEmpty = scope === "campaign" && campaignRows.length === 0;
  const showSchemaSection = !showProgrammeMissing && !showCampaignEmpty;

  return (
    <SchemaSetupPanelView
      scope={scope}
      setScope={setScope}
      programmeRows={programmeRows}
      programmeUid={programmeUid}
      setProgrammeUid={setProgrammeUid}
      campaignRows={campaignRows}
      campaignUid={campaignUid}
      setCampaignUid={setCampaignUid}
      loadingList={loadingList}
      loadingConfig={loadingConfig}
      programmeLabel={programmeLabel}
      campaignLabel={campaignLabel}
      selectedCampaign={selectedCampaign}
      campaignSchemaLocked={campaignSchemaLocked}
      responseTenantId={responseTenantId}
      configVersion={configVersion}
      showProgrammeMissing={showProgrammeMissing}
      showCampaignEmpty={showCampaignEmpty}
      showSchemaSection={showSchemaSection}
      editing={editing}
      setEditing={setEditing}
      saving={saving}
      cancelEdit={cancelEdit}
      persist={persist}
      draft={draft}
      setDraft={setDraft}
      mutators={mutators}
      previewJson={previewJson}
    />
  );
}

function SchemaSetupPanelView(props: {
  scope: SchemaScope;
  setScope: (s: SchemaScope) => void;
  programmeRows: Array<{ programmeUid: string; name: string }>;
  programmeUid: string;
  setProgrammeUid: (v: string) => void;
  campaignRows: CampaignResponse[];
  campaignUid: string;
  setCampaignUid: (v: string) => void;
  loadingList: boolean;
  loadingConfig: boolean;
  programmeLabel: string;
  campaignLabel: string;
  selectedCampaign?: CampaignResponse;
  campaignSchemaLocked: boolean;
  responseTenantId: string | null;
  configVersion: number;
  showProgrammeMissing: boolean;
  showCampaignEmpty: boolean;
  showSchemaSection: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  saving: boolean;
  cancelEdit: () => void;
  persist: () => void;
  draft: EventSchemaDraft;
  setDraft: Dispatch<SetStateAction<EventSchemaDraft>>;
  mutators: ReturnType<typeof createEventSchemaMutators>;
  previewJson: string;
}) {
  const {
    scope,
    setScope,
    programmeRows,
    programmeUid,
    setProgrammeUid,
    campaignRows,
    campaignUid,
    setCampaignUid,
    loadingList,
    loadingConfig,
    programmeLabel,
    campaignLabel,
    selectedCampaign,
    campaignSchemaLocked,
    responseTenantId,
    configVersion,
    showProgrammeMissing,
    showCampaignEmpty,
    showSchemaSection,
    editing,
    setEditing,
    saving,
    cancelEdit,
    persist,
    draft,
    setDraft,
    mutators,
    previewJson,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Event schema</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configure JSON payload fields per event type for your <strong>programme</strong> (tenant-wide rules) or per{" "}
            <strong>campaign</strong> (campaign earn rules). Campaign schemas are stored on each campaign record.
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
                disabled={loadingList || loadingConfig}
                onChange={(v) => {
                  setProgrammeUid(v);
                  setEditing(false);
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
                  disabled={loadingList || loadingConfig || campaignRows.length === 0}
                  onChange={(v) => {
                    setCampaignUid(v);
                    setEditing(false);
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {scope === "programme" ? "Programme event schema" : "Campaign event schema"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  {scope === "programme"
                    ? "Stored in programme_config.config_json.eventSchema. Used by programme earn rules and as the default template for campaigns."
                    : "Stored in campaigns.event_schema. Used by campaign earn rules for condition fields. Saving also updates the campaign event type list."}
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
              {!editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => setEditing(true)}
                  disabled={loadingConfig || (scope === "campaign" && campaignSchemaLocked)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={persist}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              )}
            </div>

            {loadingConfig ? (
              <p className="text-sm text-muted-foreground">Loading schema…</p>
            ) : !editing ? (
              <ReadOnlyEventSchema draft={draft} />
            ) : (
              <EventSchemaEditorForm draft={draft} setDraft={setDraft} mutators={mutators} />
            )}
          </div>
        ) : null}

        {showSchemaSection && !editing ? (
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
