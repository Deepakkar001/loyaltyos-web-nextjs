export type EventSchemaFieldType = "string" | "number" | "integer" | "boolean" | "date-time" | "object";

export type EventSchemaCoreFieldDraft = {
  name: string;
  type: EventSchemaFieldType;
  required: boolean;
};

export type EventSchemaDefinitionDraft = {
  eventType: string;
  coreFields: EventSchemaCoreFieldDraft[];
};

export type EventSchemaCustomFieldDraft = {
  name: string;
  type: EventSchemaFieldType;
  required: boolean;
  /** Stored under `validation.dependsOn` in programme config JSON (custom fields only). */
  dependsOn?: string;
};

export type EventSchemaDraft = {
  version: number;
  backwardCompatibilityDays: number;
  eventDefinitions: EventSchemaDefinitionDraft[];
  customFields: EventSchemaCustomFieldDraft[];
};

function safeRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function safeArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function coerceFieldType(raw: string): EventSchemaFieldType {
  if (
    raw === "string" ||
    raw === "number" ||
    raw === "integer" ||
    raw === "boolean" ||
    raw === "date-time" ||
    raw === "object"
  ) {
    return raw;
  }
  return "string";
}

const DEFAULT_PURCHASE_CORE: EventSchemaCoreFieldDraft[] = [
  { name: "transactionId", type: "string", required: true },
  { name: "timestamp", type: "date-time", required: true },
  { name: "eventType", type: "string", required: true },
  { name: "customerId", type: "string", required: true },
  { name: "amount", type: "number", required: true },
];

export function defaultEventSchemaDraft(): EventSchemaDraft {
  return {
    version: 2,
    backwardCompatibilityDays: 30,
    eventDefinitions: [{ eventType: "PURCHASE", coreFields: DEFAULT_PURCHASE_CORE.map((c) => ({ ...c })) }],
    customFields: [],
  };
}

export function unionStandardFieldsFromDefinitions(defs: EventSchemaDefinitionDraft[]): EventSchemaCoreFieldDraft[] {
  const map = new Map<string, EventSchemaCoreFieldDraft>();
  for (const def of defs) {
    for (const f of def.coreFields) {
      const key = f.name.trim();
      if (!key) continue;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { name: key, type: f.type, required: f.required });
      } else {
        map.set(key, { name: key, type: f.type, required: prev.required || f.required });
      }
    }
  }
  return Array.from(map.values());
}

/** Parse `config_json.eventSchema` (or legacy shapes) into editable draft. */
export function eventSchemaDraftFromConfigRoot(configRoot: unknown): EventSchemaDraft {
  const root = safeRecord(configRoot);
  const eventSchema = safeRecord(root.eventSchema);
  const version = typeof eventSchema.version === "number" ? eventSchema.version : 2;
  const backwardCompatibilityDays =
    typeof eventSchema.backwardCompatibilityDays === "number" ? eventSchema.backwardCompatibilityDays : 30;

  const eds = safeArr(eventSchema.eventDefinitions);
  const eventDefinitions: EventSchemaDefinitionDraft[] = [];
  if (eds.length) {
    for (const raw of eds) {
      const o = safeRecord(raw);
      const eventType = String(o.eventType ?? "").trim();
      const cfs = safeArr(o.coreFields);
      const coreFields: EventSchemaCoreFieldDraft[] = [];
      for (const cf of cfs) {
        const f = safeRecord(cf);
        const name = String(f.name ?? "").trim();
        if (!name) continue;
        coreFields.push({
          name,
          type: coerceFieldType(String(f.type ?? "string")),
          required: Boolean(f.required),
        });
      }
      if (eventType && coreFields.length) {
        eventDefinitions.push({ eventType, coreFields });
      }
    }
  }
  if (eventDefinitions.length === 0) {
    const std = safeArr(eventSchema.standardFields);
    const coreFields: EventSchemaCoreFieldDraft[] = [];
    for (const cf of std) {
      const f = safeRecord(cf);
      const name = String(f.name ?? "").trim();
      if (!name) continue;
      coreFields.push({
        name,
        type: coerceFieldType(String(f.type ?? "string")),
        required: Boolean(f.required),
      });
    }
    if (coreFields.length) {
      eventDefinitions.push({ eventType: "PURCHASE", coreFields });
    }
  }
  if (eventDefinitions.length === 0) {
    return defaultEventSchemaDraft();
  }

  const cfRaw = safeArr(eventSchema.customFields);
  const customFields: EventSchemaCustomFieldDraft[] = cfRaw
    .map((row) => {
      const o = safeRecord(row);
      const validation = safeRecord(o.validation);
      const dependsOn = typeof validation.dependsOn === "string" ? validation.dependsOn.trim() : "";
      return {
        name: String(o.name ?? "").trim(),
        type: coerceFieldType(String(o.type ?? "string")),
        required: Boolean(o.required),
        dependsOn: dependsOn || undefined,
      };
    })
    .filter((c) => c.name.length > 0);

  return {
    version,
    backwardCompatibilityDays,
    eventDefinitions,
    customFields,
  };
}

/**
 * Lists trigger event types from `programme_config.config` / `eventSchema` only.
 * Uses `eventDefinitions[].eventType` (same as configure programme UI). Legacy configs with
 * only `standardFields` expose a single `PURCHASE` type. No hardcoded fallback list.
 */
export function extractEventTypesFromProgrammeConfig(
  configRoot: unknown,
  preserveExact: readonly string[] = []
): string[] {
  const draft = eventSchemaDraftFromConfigRoot(configRoot);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    const s = t.trim();
    if (!s) return;
    const key = s.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const def of draft.eventDefinitions) {
    push(def.eventType);
  }

  for (const p of preserveExact) {
    if (typeof p === "string" && p.trim()) push(p);
  }

  return out;
}

export function buildEventSchemaJsonNode(draft: EventSchemaDraft): Record<string, unknown> {
  const evDefs = draft.eventDefinitions.map((d) => ({
    eventType: d.eventType.trim(),
    coreFields: d.coreFields.map((f) => ({
      name: f.name.trim(),
      type: f.type,
      required: f.required,
    })),
  }));
  return {
    version: draft.version,
    eventDefinitions: evDefs,
    standardFields: unionStandardFieldsFromDefinitions(draft.eventDefinitions),
    customFields: draft.customFields
      .map((c) => {
        const name = c.name.trim();
        if (!name) return null;
        const base: Record<string, unknown> = {
          name,
          type: c.type,
          required: c.required,
        };
        const dep = (c.dependsOn ?? "").trim();
        if (dep) base.validation = { dependsOn: dep };
        return base;
      })
      .filter((x): x is Record<string, unknown> => x != null),
    backwardCompatibilityDays: draft.backwardCompatibilityDays,
  };
}

/** Replace only `eventSchema` on a full programme config object (for versioned PUT). */
export function mergeEventSchemaIntoProgrammeConfig(
  existingConfig: Record<string, unknown>,
  draft: EventSchemaDraft
): Record<string, unknown> {
  return {
    ...existingConfig,
    eventSchema: buildEventSchemaJsonNode(draft),
  };
}

export function isLikelyCompleteProgrammeConfig(configRoot: unknown): boolean {
  const root = safeRecord(configRoot);
  return Boolean(safeRecord(root.programmeIdentity).programmeName);
}

/** Parse campaign `eventSchema` JSON (same shape as programme `config.eventSchema`). */
export function eventSchemaDraftFromEventSchemaNode(eventSchema: unknown): EventSchemaDraft {
  return eventSchemaDraftFromConfigRoot({ eventSchema });
}

/** True when the node has at least one `eventDefinitions` entry. */
export function hasPopulatedEventSchema(eventSchema: unknown): boolean {
  if (!eventSchema || typeof eventSchema !== "object" || Array.isArray(eventSchema)) return false;
  return eventSchemaDraftFromEventSchemaNode(eventSchema).eventDefinitions.length > 0;
}

/**
 * Build editable campaign schema from stored JSON, legacy trigger list, and optional programme template.
 */
export function eventSchemaDraftFromCampaign(args: {
  eventSchema?: unknown;
  triggerEventType?: string;
  programmeConfigRoot?: unknown;
}): EventSchemaDraft {
  const es = args.eventSchema;
  if (es && typeof es === "object" && !Array.isArray(es)) {
    const draft = eventSchemaDraftFromEventSchemaNode(es);
    if (draft.eventDefinitions.length > 0) {
      return draft;
    }
  }

  const programmeDraft = args.programmeConfigRoot
    ? eventSchemaDraftFromConfigRoot(args.programmeConfigRoot)
    : defaultEventSchemaDraft();

  const types = (args.triggerEventType ?? "")
    .split(/[,;]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const uniqueTypes = Array.from(new Set(types));

  if (uniqueTypes.length === 0) {
    return {
      version: 1,
      backwardCompatibilityDays: 30,
      eventDefinitions: [],
      customFields: [],
    };
  }

  const eventDefinitions: EventSchemaDefinitionDraft[] = uniqueTypes.map((eventType) => {
    const progDef = programmeDraft.eventDefinitions.find(
      (d) => d.eventType.trim().toUpperCase() === eventType
    );
    const coreFields = progDef
      ? progDef.coreFields.map((f) => ({ ...f }))
      : [{ name: "", type: "string" as EventSchemaFieldType, required: false }];
    return { eventType, coreFields };
  });

  return {
    version: 1,
    backwardCompatibilityDays: programmeDraft.backwardCompatibilityDays,
    eventDefinitions,
    customFields: [],
  };
}
