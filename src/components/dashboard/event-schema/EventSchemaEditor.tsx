"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PillToggle } from "@/components/ui/pill-toggle";
import type {
  EventSchemaDefinitionDraft,
  EventSchemaDraft,
  EventSchemaFieldType,
} from "@/lib/programme/event-schema-merge";
import { cn } from "@/lib/utils";

import {
  FIELD_TYPE_OPTIONS,
  cloneEventSchemaDraft,
  createEventSchemaMutators,
  type EventSchemaDraftMutators,
} from "./event-schema-editor-utils";

function eventKeysEqual(a: string, b: string) {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

/** Static preview without per-event edit controls (campaign create, etc.). */
export function EventSchemaPreview({ draft }: { draft: EventSchemaDraft }) {
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
      {draft.eventDefinitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No event types defined yet.</p>
      ) : (
        draft.eventDefinitions.map((def, di) => (
          <div key={`event-def-${di}`} className="rounded-xl border border-border/70 bg-background p-4 space-y-2">
            <p className="text-sm font-semibold">
              Event <code className="text-brand-700 dark:text-brand-300">{def.eventType}</code>
            </p>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
              {def.coreFields.map((f, fi) => (
                <li
                  key={`core-field-${di}-${fi}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]"
                >
                  <span className="font-mono text-xs">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {f.type}
                    {f.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <div className="rounded-xl border border-border/70 bg-background p-4 space-y-2">
        <p className="text-sm font-semibold">Custom fields</p>
        {draft.customFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
            {draft.customFields.map((c, ci) => (
              <li
                key={`custom-field-${ci}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]"
              >
                <span className="font-mono text-xs">{c.name}</span>
                <span className={cn("text-xs text-muted-foreground shrink-0 text-right")}>
                  {c.type}
                  {c.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
                  {c.dependsOn ? <span className="block text-[10px] mt-0.5">depends on {c.dependsOn}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ReadOnlyEventSchema({
  draft,
  editingEventKey,
  editingSettings,
  campaignSchemaLocked,
  saving,
  onEditEvent,
  onRemoveEvent,
  onAddEvent,
  onEditSettings,
}: {
  draft: EventSchemaDraft;
  editingEventKey: string | null;
  editingSettings: boolean;
  campaignSchemaLocked?: boolean;
  saving: boolean;
  onEditEvent: (eventType: string) => void;
  onRemoveEvent: (eventType: string) => void;
  onAddEvent: () => void;
  onEditSettings: () => void;
}) {
  const busy = saving || editingEventKey != null || editingSettings;
  const locked = Boolean(campaignSchemaLocked);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            Version <span className="font-medium text-foreground">{draft.version}</span>
          </span>
          <span className="text-muted-foreground">
            Backward compatibility{" "}
            <span className="font-medium text-foreground">{draft.backwardCompatibilityDays} days</span>
          </span>
        </div>
        {!editingSettings ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            disabled={busy || locked}
            onClick={onEditSettings}
          >
            <Pencil className="h-4 w-4" />
            Edit schema settings
          </Button>
        ) : null}
      </div>

      {draft.eventDefinitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No event types defined yet.</p>
      ) : (
        draft.eventDefinitions.map((def, di) => (
          <EventDefinitionReadOnlyCard
            key={`event-def-${di}-${def.eventType}`}
            def={def}
            canRemove={draft.eventDefinitions.length > 1}
            disabled={busy || locked}
            onEdit={() => onEditEvent(def.eventType)}
            onRemove={() => onRemoveEvent(def.eventType)}
          />
        ))
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed text-slate-500"
        disabled={busy || locked}
        onClick={onAddEvent}
      >
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add another event type
      </Button>

      <div className="rounded-xl border border-border/70 bg-background p-4 space-y-2">
        <p className="text-sm font-semibold">Custom fields</p>
        {draft.customFields.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
            {draft.customFields.map((c, ci) => (
              <li
                key={`custom-field-${ci}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]"
              >
                <span className="font-mono text-xs">{c.name}</span>
                <span className={cn("text-xs text-muted-foreground shrink-0 text-right")}>
                  {c.type}
                  {c.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
                  {c.dependsOn ? <span className="block text-[10px] mt-0.5">depends on {c.dependsOn}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Custom fields are programme-wide. Use <strong>Edit schema settings</strong> to change them.
        </p>
      </div>
    </div>
  );
}

function EventDefinitionReadOnlyCard({
  def,
  canRemove,
  disabled,
  onEdit,
  onRemove,
}: {
  def: EventSchemaDefinitionDraft;
  canRemove: boolean;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm font-semibold">
          Event <code className="text-brand-700 dark:text-brand-300">{def.eventType}</code>
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" className="gap-2" disabled={disabled} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600"
              disabled={disabled}
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
        {def.coreFields.map((f, fi) => (
          <li
            key={`core-field-${fi}`}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[var(--surface-sunken)]"
          >
            <span className="font-mono text-xs">{f.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {f.type}
              {f.required ? <span className="ml-2 text-amber-700 dark:text-amber-400">required</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventDefinitionEditCard({
  draft,
  setDraft,
  isNew,
  saving,
  onCancel,
  onSave,
}: {
  draft: EventSchemaDefinitionDraft;
  setDraft: Dispatch<SetStateAction<EventSchemaDefinitionDraft>>;
  isNew: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const mutators = createSingleEventMutators(setDraft);

  return (
    <div className="rounded-xl border border-brand-500/40 bg-brand-500/5 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="event-type-edit">
            Event type key
          </label>
          <Input
            id="event-type-edit"
            className="h-9 max-w-md"
            value={draft.eventType}
            onChange={(e) => setDraft((p) => ({ ...p, eventType: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : isNew ? "Add event" : "Save event"}
          </Button>
        </div>
      </div>
      <SchemaCoreFields defIdx={0} def={draft} mutators={mutators} />
    </div>
  );
}

export function SchemaSettingsEditCard({
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  draft: EventSchemaDraft;
  setDraft: Dispatch<SetStateAction<EventSchemaDraft>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const mutators = createEventSchemaMutators(setDraft);

  return (
    <div className="rounded-xl border border-brand-500/40 bg-brand-500/5 p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm font-semibold">Schema settings</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
      <SchemaMetaFields draft={draft} setDraft={setDraft} />
      <SchemaCustomFieldsSection draft={draft} mutators={mutators} />
    </div>
  );
}

/** Full-schema editor (campaign create flow and legacy bulk edit). */
export function EventSchemaEditorForm({
  draft,
  setDraft,
  mutators,
}: {
  draft: EventSchemaDraft;
  setDraft: Dispatch<SetStateAction<EventSchemaDraft>>;
  mutators: EventSchemaDraftMutators;
}) {
  return (
    <div className="space-y-6">
      <SchemaMetaFields draft={draft} setDraft={setDraft} />
      <SchemaEventDefinitions draft={draft} mutators={mutators} />
      <SchemaCustomFieldsSection draft={draft} mutators={mutators} />
    </div>
  );
}

function createSingleEventMutators(
  setDraft: Dispatch<SetStateAction<EventSchemaDefinitionDraft>>
): Pick<EventSchemaDraftMutators, "updateCoreField" | "addCoreField" | "removeCoreField"> {
  return {
    updateCoreField: (_defIdx, fieldIdx, patch) => {
      setDraft((prev) => {
        const fields = [...prev.coreFields];
        fields[fieldIdx] = { ...fields[fieldIdx], ...patch };
        return { ...prev, coreFields: fields };
      });
    },
    addCoreField: () => {
      setDraft((prev) => ({
        ...prev,
        coreFields: [...prev.coreFields, { name: "", type: "string", required: false }],
      }));
    },
    removeCoreField: (_defIdx, fieldIdx) => {
      setDraft((prev) => ({
        ...prev,
        coreFields: prev.coreFields.filter((_, i) => i !== fieldIdx),
      }));
    },
  };
}

function SchemaMetaFields({
  draft,
  setDraft,
}: {
  draft: EventSchemaDraft;
  setDraft: Dispatch<SetStateAction<EventSchemaDraft>>;
}) {
  return (
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
              ...cloneEventSchemaDraft(p),
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
              ...cloneEventSchemaDraft(p),
              version: Math.max(1, Number(e.target.value) || 1),
            }))
          }
        />
      </div>
    </div>
  );
}

function SchemaEventDefinitions({
  draft,
  mutators,
}: {
  draft: EventSchemaDraft;
  mutators: EventSchemaDraftMutators;
}) {
  return (
    <div className="space-y-4">
      {draft.eventDefinitions.map((def, defIdx) => (
        <div key={`event-def-${defIdx}`} className="rounded-xl border border-border/70 bg-background p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={`et-${defIdx}`}>
                Event type key
              </label>
              <Input
                id={`et-${defIdx}`}
                className="h-9 max-w-md"
                value={def.eventType}
                onChange={(e) => mutators.updateEventType(defIdx, e.target.value)}
              />
            </div>
            {draft.eventDefinitions.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 shrink-0"
                onClick={() => mutators.removeEventDefinition(defIdx)}
              >
                Remove event
              </Button>
            ) : null}
          </div>
          <SchemaCoreFields defIdx={defIdx} def={def} mutators={mutators} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed text-slate-500"
        onClick={mutators.addEventDefinition}
      >
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add another event type
      </Button>
    </div>
  );
}

function SchemaCoreFields({
  defIdx,
  def,
  mutators,
}: {
  defIdx: number;
  def: EventSchemaDefinitionDraft;
  mutators: Pick<EventSchemaDraftMutators, "updateCoreField" | "addCoreField" | "removeCoreField">;
}) {
  return (
    <div className="space-y-2 pl-0 sm:pl-3 border-l-2 border-border/50">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fields in payload</p>
      {def.coreFields.map((f, fi) => (
        <div
          key={`core-field-${defIdx}-${fi}`}
          className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-xl border border-border/70 bg-[var(--surface-sunken)]"
        >
          <Input
            className="h-8 lg:w-44"
            placeholder="fieldName"
            value={f.name}
            onChange={(e) => mutators.updateCoreField(defIdx, fi, { name: e.target.value })}
          />
          <NativeSelect
            ariaLabel="Field type"
            variant="compact"
            className="lg:w-40"
            value={f.type}
            onChange={(v) => mutators.updateCoreField(defIdx, fi, { type: v as EventSchemaFieldType })}
            options={FIELD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 lg:min-w-[200px]">
            <span className="text-sm font-medium text-foreground">{f.required ? "Required" : "Optional"}</span>
            <PillToggle
              pressed={f.required}
              onPressedChange={(v) => mutators.updateCoreField(defIdx, fi, { required: v })}
              srLabel={
                f.required ? "Turn off: mark core field as optional" : "Turn on: mark core field as required"
              }
            />
          </div>
          <button
            type="button"
            onClick={() => mutators.removeCoreField(defIdx, fi)}
            className="lg:ml-auto text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Remove field"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed text-slate-500"
        onClick={() => mutators.addCoreField(defIdx)}
      >
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add core field
      </Button>
    </div>
  );
}

function SchemaCustomFieldsSection({
  draft,
  mutators,
}: {
  draft: EventSchemaDraft;
  mutators: EventSchemaDraftMutators;
}) {
  return (
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
        <SchemaCustomFieldRow key={`cf-${ci}`} c={c} ci={ci} mutators={mutators} />
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={mutators.addCustomField}>
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add custom field
      </Button>
    </div>
  );
}

function SchemaCustomFieldRow({
  c,
  ci,
  mutators,
}: {
  c: EventSchemaDraft["customFields"][number];
  ci: number;
  mutators: EventSchemaDraftMutators;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-2 p-3 rounded-xl border border-border/70 bg-background">
      <Input
        className="h-8 xl:w-40"
        placeholder="fieldName"
        value={c.name}
        onChange={(e) => mutators.updateCustomField(ci, { name: e.target.value })}
      />
      <NativeSelect
        ariaLabel="Custom field type"
        variant="compact"
        className="xl:w-36"
        value={c.type}
        onChange={(v) => mutators.updateCustomField(ci, { type: v as EventSchemaFieldType })}
        options={FIELD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Input
        className="h-8 xl:w-44"
        placeholder="Depends on (field name)"
        value={c.dependsOn ?? ""}
        onChange={(e) => mutators.updateCustomField(ci, { dependsOn: e.target.value })}
      />
      <SchemaCustomRequiredToggle c={c} ci={ci} mutators={mutators} />
      <button
        type="button"
        onClick={() => mutators.removeCustomField(ci)}
        className="xl:ml-auto text-slate-400 hover:text-red-500 transition-colors"
        aria-label="Remove custom field"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SchemaCustomRequiredToggle({
  c,
  ci,
  mutators,
}: {
  c: EventSchemaDraft["customFields"][number];
  ci: number;
  mutators: EventSchemaDraftMutators;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 min-w-[200px]">
      <span className="text-sm font-medium text-foreground">{c.required ? "Required" : "Optional"}</span>
      <PillToggle
        size="sm"
        pressed={c.required}
        onPressedChange={(v) => mutators.updateCustomField(ci, { required: v })}
        srLabel={c.required ? "Turn off: mark custom field as optional" : "Turn on: mark custom field as required"}
      />
    </div>
  );
}

export { eventKeysEqual };
