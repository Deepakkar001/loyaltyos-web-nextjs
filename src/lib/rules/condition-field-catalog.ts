import type { EventSchemaFieldType } from "@/lib/programme/event-schema-merge";
import { eventSchemaDraftFromConfigRoot } from "@/lib/programme/event-schema-merge";
import { extractChannelOptionsFromProgrammeConfig } from "@/lib/programme/programme-config-helpers";
import type { ComparisonOp } from "@/components/loyalty-rules/condition-builder/types";

/** UI value-type used for operator lists and editors. */
export type ConditionFieldValueType = "number" | "string" | "enum" | "datetime";

export type ConditionFieldOption = {
  value: string;
  label: string;
  type: ConditionFieldValueType;
  group: "event" | "customer";
  source: "schema" | "platform";
};

export type ConditionFieldMeta = {
  type: ConditionFieldValueType;
  label: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

export type ConditionFieldCatalog = {
  programmeUid: string;
  triggerEventType: string;
  /** True when triggerEventType matched an eventDefinitions entry. */
  eventDefinitionMatched: boolean;
  fields: ConditionFieldOption[];
  metadata: Record<string, ConditionFieldMeta>;
  loading: boolean;
  error?: string;
};

function normalizeEventType(value: string): string {
  return value.trim().toUpperCase();
}

function mapSchemaType(raw: EventSchemaFieldType): ConditionFieldValueType {
  if (raw === "number" || raw === "integer") return "number";
  if (raw === "date-time") return "datetime";
  if (raw === "boolean") return "enum";
  return "string";
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventFieldKey(name: string): string {
  return `event.${name}`;
}


export function catalogToFieldMetadata(
  catalog: Pick<ConditionFieldCatalog, "metadata">
): Record<string, ConditionFieldMeta> {
  return catalog.metadata;
}

/** Full operator set exposed in Classic + Diagram condition builders for any payload field. */
export const CONDITION_OPERATOR_OPTIONS: Array<{ value: ComparisonOp; label: string }> = [
  { value: "EQ", label: "Equals (=)" },
  { value: "NEQ", label: "Not equals (≠)" },
  { value: "GT", label: "Greater than (>)" },
  { value: "GTE", label: "Greater than or equal (≥)" },
  { value: "LT", label: "Less than (<)" },
  { value: "LTE", label: "Less than or equal (≤)" },
  { value: "BETWEEN", label: "Between" },
  { value: "CONTAINS", label: "Contains" },
  { value: "STARTS_WITH", label: "Starts with" },
  { value: "IN", label: "Any of" },
  { value: "NOT_IN", label: "None of" },
  { value: "IS_NULL", label: "Is empty" },
  { value: "IS_NOT_NULL", label: "Is not empty" },
];

export const ALL_COMPARISON_OPS: ComparisonOp[] = CONDITION_OPERATOR_OPTIONS.map((o) => o.value);

export const CONDITION_OPERATOR_LABELS: Record<ComparisonOp, string> = Object.fromEntries(
  CONDITION_OPERATOR_OPTIONS.map((o) => [o.value, o.label])
) as Record<ComparisonOp, string>;

export function resolveCatalogFieldType(
  catalog: Pick<ConditionFieldCatalog, "fields" | "metadata">,
  field: string | null | undefined
): ConditionFieldValueType {
  if (!field) return "string";
  const meta = catalog.metadata[field];
  if (meta?.type) return meta.type;
  const option = catalog.fields.find((f) => f.value === field);
  return option?.type ?? "string";
}

export function opsForFieldType(
  fieldType?: ConditionFieldValueType
): Array<{ value: ComparisonOp; label: string }> {
  switch (fieldType) {
    case "number":
    case "string":
    case "enum":
    case "datetime":
    default:
      return CONDITION_OPERATOR_OPTIONS;
  }
}

export function opsForCatalogField(
  catalog: Pick<ConditionFieldCatalog, "fields" | "metadata">,
  field: string | null | undefined
): Array<{ value: ComparisonOp; label: string }> {
  return opsForFieldType(resolveCatalogFieldType(catalog, field));
}

function buildMetadata(fields: ConditionFieldOption[]): Record<string, ConditionFieldMeta> {
  const metadata: Record<string, ConditionFieldMeta> = {};
  for (const f of fields) {
    metadata[f.value] = {
      type: f.type,
      label: f.label,
      placeholder: f.type === "number" ? "e.g. 500" : f.type === "datetime" ? "YYYY-MM-DD" : undefined,
      ...(f.type === "enum" ? { options: [] } : {}),
    };
  }
  return metadata;
}

/** Build catalog from a bare `eventSchema` JSON node (programme or campaign). */
export function buildConditionFieldCatalogFromEventSchema(args: {
  programmeUid: string;
  triggerEventType: string;
  eventSchema: unknown;
  programmeConfigRoot?: unknown;
}): ConditionFieldCatalog {
  return buildConditionFieldCatalog({
    programmeUid: args.programmeUid,
    triggerEventType: args.triggerEventType,
    configRoot: {
      ...(args.programmeConfigRoot && typeof args.programmeConfigRoot === "object"
        ? (args.programmeConfigRoot as Record<string, unknown>)
        : {}),
      eventSchema: args.eventSchema,
    },
  });
}

export function buildConditionFieldCatalog(args: {
  programmeUid: string;
  triggerEventType: string;
  configRoot: unknown;
}): ConditionFieldCatalog {
  const { programmeUid, triggerEventType, configRoot } = args;
  const draft = eventSchemaDraftFromConfigRoot(configRoot);
  const normalizedTrigger = normalizeEventType(triggerEventType);
  const matchedDef = draft.eventDefinitions.find(
    (d) => normalizeEventType(d.eventType) === normalizedTrigger
  );
  const eventDefinitionMatched = Boolean(matchedDef);

  const channelOptions = extractChannelOptionsFromProgrammeConfig(configRoot).map((v) => ({
    label: v,
    value: v,
  }));

  const fields: ConditionFieldOption[] = [];

  if (matchedDef) {
    // Strict: only payload fields declared on this event type (schema order preserved).
    for (const core of matchedDef.coreFields) {
      const name = core.name.trim();
      if (!name) continue;
      const type = mapSchemaType(core.type);
      fields.push({
        value: eventFieldKey(name),
        label: `${eventFieldKey(name)} (${humanizeFieldName(name)})`,
        type: name === "channel" ? "enum" : type,
        group: "event",
        source: "schema",
      });
    }
  }

  const metadata = buildMetadata(fields);
  if (metadata["event.channel"]) {
    metadata["event.channel"] = {
      ...metadata["event.channel"],
      type: "enum",
      options: channelOptions,
    };
  }
  for (const f of fields) {
    if (f.type === "enum" && f.value.startsWith("event.") && f.value !== "event.channel") {
      const meta = metadata[f.value];
      if (meta && (!meta.options || meta.options.length === 0)) {
        metadata[f.value] = { ...meta, type: "string" };
        f.type = "string";
      }
    }
  }

  return {
    programmeUid,
    triggerEventType,
    eventDefinitionMatched,
    fields,
    metadata,
    loading: false,
  };
}

/** Offline-safe catalog when programme config cannot be loaded. */
export function fallbackConditionFieldCatalog(args: {
  programmeUid: string;
  triggerEventType: string;
}): ConditionFieldCatalog {
  return buildConditionFieldCatalog({
    programmeUid: args.programmeUid,
    triggerEventType: args.triggerEventType,
    configRoot: null,
  });
}

export function defaultFieldFromCatalog(catalog: ConditionFieldCatalog): string {
  return (
    catalog.fields.find((f) => f.value === "event.amount")?.value ??
    catalog.fields[0]?.value ??
    ""
  );
}

export function resolveFieldMeta(
  catalog: ConditionFieldCatalog,
  field: string | null | undefined
): ConditionFieldMeta | null {
  if (!field) return null;
  return catalog.metadata[field] ?? null;
}
