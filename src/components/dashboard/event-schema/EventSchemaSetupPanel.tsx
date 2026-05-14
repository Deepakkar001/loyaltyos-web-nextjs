"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PillToggle } from "@/components/ui/pill-toggle";
import { programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import {
  buildEventSchemaJsonNode,
  defaultEventSchemaDraft,
  eventSchemaDraftFromConfigRoot,
  isLikelyCompleteProgrammeConfig,
  mergeEventSchemaIntoProgrammeConfig,
  type EventSchemaCoreFieldDraft,
  type EventSchemaCustomFieldDraft,
  type EventSchemaDefinitionDraft,
  type EventSchemaDraft,
  type EventSchemaFieldType,
} from "@/lib/programme/event-schema-merge";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { cn } from "@/lib/utils";

const FIELD_TYPE_OPTIONS: { value: EventSchemaFieldType; label: string }[] = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "integer", label: "integer" },
  { value: "boolean", label: "boolean" },
  { value: "date-time", label: "date-time" },
  { value: "object", label: "object" },
];

const NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const EVENT_TYPE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function cloneDraft(d: EventSchemaDraft): EventSchemaDraft {
  return JSON.parse(JSON.stringify(d)) as EventSchemaDraft;
}

function validateDraft(d: EventSchemaDraft): string | null {
  for (const def of d.eventDefinitions) {
    if (!def.eventType.trim()) return "Each event definition needs an event type.";
    if (!EVENT_TYPE_RE.test(def.eventType.trim())) return `Invalid event type: ${def.eventType}`;
    if (!def.coreFields.length) return `Add at least one core field for ${def.eventType}.`;
    for (const f of def.coreFields) {
      if (!f.name.trim()) return "Core field names cannot be empty.";
      if (!NAME_RE.test(f.name.trim())) return `Invalid core field name: ${f.name}`;
    }
  }
  for (const c of d.customFields) {
    if (!c.name.trim()) return "Custom field names cannot be empty.";
    if (!NAME_RE.test(c.name.trim())) return `Invalid custom field name: ${c.name}`;
  }
  if (d.backwardCompatibilityDays < 0 || d.backwardCompatibilityDays > 365) {
    return "Backward compatibility days must be between 0 and 365.";
  }
  return null;
}

export function EventSchemaSetupPanel() {
  const tenantId = useOnboardingStore((s) => s.tenantId);

  const [programmeRows, setProgrammeRows] = useState<Array<{ programmeUid: string; name: string }>>([
    { programmeUid: "default", name: "Default programme" },
  ]);
  const [programmeUid, setProgrammeUid] = useState("default");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [responseTenantId, setResponseTenantId] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState(0);
  const [draft, setDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft());
  const [baselineDraft, setBaselineDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft());

  const programmeLabel = useMemo(
    () => programmeRows.find((p) => p.programmeUid === programmeUid)?.name ?? programmeUid,
    [programmeRows, programmeUid]
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

  const loadConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoadingConfig(true);
    setConfigMissing(false);
    try {
      await ensureAuthSession();
      const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
      setResponseTenantId(blob.tenantId);
      setConfigVersion(blob.configVersion);
      if (blob.tenantId && tenantId && blob.tenantId !== tenantId) {
        toast.error("Loaded configuration does not match the signed-in tenant.");
      }
      const root = (blob.config ?? {}) as Record<string, unknown>;
      if (!isLikelyCompleteProgrammeConfig(root)) {
        setConfigMissing(true);
        const empty = defaultEventSchemaDraft();
        setDraft(empty);
        setBaselineDraft(cloneDraft(empty));
        return;
      }
      setConfigMissing(false);
      const d = eventSchemaDraftFromConfigRoot(root);
      setDraft(d);
      setBaselineDraft(cloneDraft(d));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      setConfigMissing(true);
    } finally {
      setLoadingConfig(false);
    }
  }, [tenantId, programmeUid]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const cancelEdit = () => {
    setDraft(cloneDraft(baselineDraft));
    setEditing(false);
  };

  const persist = async () => {
    const err = validateDraft(draft);
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
      toast.success("Event schema saved");
      setEditing(false);
      await loadConfig();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateEventType = (idx: number, eventType: string) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      next.eventDefinitions[idx] = { ...next.eventDefinitions[idx], eventType };
      return next;
    });
  };

  const updateCoreField = (defIdx: number, fieldIdx: number, patch: Partial<EventSchemaCoreFieldDraft>) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      const fields = [...next.eventDefinitions[defIdx].coreFields];
      fields[fieldIdx] = { ...fields[fieldIdx], ...patch };
      next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
      return next;
    });
  };

  const addCoreField = (defIdx: number) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      const fields = [...next.eventDefinitions[defIdx].coreFields];
      fields.push({ name: "", type: "string", required: false });
      next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
      return next;
    });
  };

  const removeCoreField = (defIdx: number, fieldIdx: number) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      const fields = next.eventDefinitions[defIdx].coreFields.filter((_, i) => i !== fieldIdx);
      next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
      return next;
    });
  };

  const addEventDefinition = () => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      next.eventDefinitions.push({
        eventType: `EVENT_${next.eventDefinitions.length + 1}`,
        coreFields: [
          { name: "transactionId", type: "string", required: true },
          { name: "eventType", type: "string", required: true },
        ],
      });
      return next;
    });
  };

  const removeEventDefinition = (idx: number) => {
    setDraft((prev) => {
      if (prev.eventDefinitions.length <= 1) return prev;
      const next = cloneDraft(prev);
      next.eventDefinitions.splice(idx, 1);
      return next;
    });
  };

  const updateCustomField = (idx: number, patch: Partial<EventSchemaCustomFieldDraft>) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      next.customFields[idx] = { ...next.customFields[idx], ...patch };
      return next;
    });
  };

  const addCustomField = () => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      next.customFields.push({ name: "", type: "string", required: false, dependsOn: "" });
      return next;
    });
  };

  const removeCustomField = (idx: number) => {
    setDraft((prev) => {
      const next = cloneDraft(prev);
      next.customFields.splice(idx, 1);
      return next;
    });
  };

  const previewJson = useMemo(() => JSON.stringify(buildEventSchemaJsonNode(draft), null, 2), [draft]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Event schema</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Schema stored in <code className="text-foreground">programme_config.config_json</code> for your tenant. Select a
            programme, review fields per event type, then edit and save to create a new config version.
          </p>
        </div>
        {responseTenantId ? (
          <p className="text-xs text-muted-foreground shrink-0">
            Tenant <span className="font-mono text-foreground">{responseTenantId}</span>
            {configVersion > 0 ? (
              <>
                {" "}
                · v{configVersion}
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <Card className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 min-w-0 flex-1">
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
          <Badge variant="secondary" className="shrink-0 self-start lg:self-center max-w-full truncate">
            {programmeLabel}
          </Badge>
        </div>

        {configMissing ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-foreground">No saved programme configuration for this programme yet.</p>
            <p className="mt-1 text-muted-foreground">
              Complete <strong>Configure Programme</strong> first so a valid config exists, then return here to view or adjust
              the event schema slice only.
            </p>
            <Link
              href={`/dashboard/configure?programmeUid=${encodeURIComponent(programmeUid)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex mt-3")}
            >
              Open Configure Programme
            </Link>
          </div>
        ) : null}

        {!configMissing ? (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Event Schema (custom fields)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  For each event type your systems emit, declare which fields appear on the JSON payload. Mark a field required
                  only when every producer will send it. A combined field list is stored automatically for backwards compatibility
                  with the rule engine.
                </p>
              </div>
              {!editing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => setEditing(true)}
                  disabled={loadingConfig}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={persist} disabled={saving}>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="bcd">
                      Backward compatibility (days)
                    </label>
                    <Input
                      id="bcd"
                      type="number"
                      min={0}
                      max={365}
                      value={draft.backwardCompatibilityDays}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...cloneDraft(p),
                          backwardCompatibilityDays: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="esv">
                      Schema version
                    </label>
                    <Input
                      id="esv"
                      type="number"
                      min={1}
                      value={draft.version}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...cloneDraft(p),
                          version: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {draft.eventDefinitions.map((def, defIdx) => (
                    <div key={`${def.eventType}-${defIdx}`} className="rounded-xl border border-border/70 bg-background p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor={`et-${defIdx}`}>
                            Event type key
                          </label>
                          <Input
                            id={`et-${defIdx}`}
                            className="h-9 max-w-md"
                            value={def.eventType}
                            onChange={(e) => updateEventType(defIdx, e.target.value)}
                          />
                        </div>
                        {draft.eventDefinitions.length > 1 ? (
                          <Button type="button" variant="ghost" size="sm" className="text-red-600 shrink-0" onClick={() => removeEventDefinition(defIdx)}>
                            Remove event
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-2 pl-0 sm:pl-3 border-l-2 border-border/50">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fields in payload</p>
                        {def.coreFields.map((f, fi) => (
                          <div
                            key={`${defIdx}-${fi}-${f.name}`}
                            className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-xl border border-border/70 bg-[var(--surface-sunken)]"
                          >
                            <Input
                              className="h-8 lg:w-44"
                              placeholder="fieldName"
                              value={f.name}
                              onChange={(e) => updateCoreField(defIdx, fi, { name: e.target.value })}
                            />
                            <NativeSelect
                              ariaLabel="Field type"
                              variant="compact"
                              className="lg:w-40"
                              value={f.type}
                              onChange={(v) => updateCoreField(defIdx, fi, { type: v as EventSchemaFieldType })}
                              options={FIELD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                            />
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 lg:min-w-[200px]">
                              <span className="text-sm font-medium text-foreground">{f.required ? "Required" : "Optional"}</span>
                              <PillToggle
                                pressed={f.required}
                                onPressedChange={(v) => updateCoreField(defIdx, fi, { required: v })}
                                srLabel={f.required ? "Turn off: mark core field as optional" : "Turn on: mark core field as required"}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCoreField(defIdx, fi)}
                              className="lg:ml-auto text-slate-400 hover:text-red-500 transition-colors"
                              aria-label="Remove field"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-slate-500" onClick={() => addCoreField(defIdx)}>
                          <Plus className="w-3.5 h-3.5 mr-2" />
                          Add core field
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-slate-500" onClick={addEventDefinition}>
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Add another event type
                  </Button>
                </div>

                <div className="rounded-xl border border-border/70 bg-[var(--surface-sunken)] p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Custom fields</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Applied across event types. Optional <strong>depends on</strong> is stored as{" "}
                    <code className="text-foreground">validation.dependsOn</code> in config JSON.
                  </p>
                  {draft.customFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No custom fields yet.</p>
                  ) : null}
                  {draft.customFields.map((c, ci) => (
                    <div
                      key={`cf-${ci}`}
                      className="flex flex-col xl:flex-row xl:items-center gap-2 p-3 rounded-xl border border-border/70 bg-background"
                    >
                      <Input
                        className="h-8 xl:w-40"
                        placeholder="fieldName"
                        value={c.name}
                        onChange={(e) => updateCustomField(ci, { name: e.target.value })}
                      />
                      <NativeSelect
                        ariaLabel="Custom field type"
                        variant="compact"
                        className="xl:w-36"
                        value={c.type}
                        onChange={(v) => updateCustomField(ci, { type: v as EventSchemaFieldType })}
                        options={FIELD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      />
                      <Input
                        className="h-8 xl:w-44"
                        placeholder="Depends on (field name)"
                        value={c.dependsOn ?? ""}
                        onChange={(e) => updateCustomField(ci, { dependsOn: e.target.value })}
                      />
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 min-w-[200px]">
                        <span className="text-sm font-medium text-foreground">{c.required ? "Required" : "Optional"}</span>
                        <PillToggle
                          size="sm"
                          pressed={c.required}
                          onPressedChange={(v) => updateCustomField(ci, { required: v })}
                          srLabel={
                            c.required ? "Turn off: mark custom field as optional" : "Turn on: mark custom field as required"
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(ci)}
                        className="xl:ml-auto text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Remove custom field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={addCustomField}>
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Add custom field
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!configMissing && !editing ? (
          <details className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <summary className="text-xs font-medium cursor-pointer text-muted-foreground">Raw eventSchema JSON</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-64 rounded-lg bg-background p-3 border border-border">{previewJson}</pre>
          </details>
        ) : null}
      </Card>
    </div>
  );
}

function ReadOnlyEventSchema({ draft }: { draft: EventSchemaDraft }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">
          Version <span className="font-medium text-foreground">{draft.version}</span>
        </span>
        <span className="text-muted-foreground">
          Backward compatibility{" "}
          <span className="font-medium text-foreground">{draft.backwardCompatibilityDays} days</span>
        </span>
      </div>
      {draft.eventDefinitions.map((def, di) => (
        <div key={`${def.eventType}-${di}`} className="rounded-xl border border-border/70 bg-background p-4 space-y-2">
          <p className="text-sm font-semibold">
            Event <code className="text-brand-700 dark:text-brand-300">{def.eventType}</code>
          </p>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
            {def.coreFields.map((f, fi) => (
              <li key={`${di}-${fi}-${f.name}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]">
                <span className="font-mono text-xs">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {f.type}
                  {f.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rounded-xl border border-border/70 bg-background p-4 space-y-2">
        <p className="text-sm font-semibold">Custom fields</p>
        {draft.customFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
            {draft.customFields.map((c, ci) => (
              <li key={`${ci}-${c.name}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]">
                <span className="font-mono text-xs">{c.name}</span>
                <span className={cn("text-xs text-muted-foreground shrink-0 text-right")}>
                  {c.type}
                  {c.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
                  {c.dependsOn ? (
                    <span className="block text-[10px] mt-0.5">depends on {c.dependsOn}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
