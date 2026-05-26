import type {
  EventSchemaDraft,
  EventSchemaFieldType,
} from "@/lib/programme/event-schema-merge";
import { extractChannelOptionsFromProgrammeConfig } from "@/lib/programme/programme-config-helpers";

/** Filled server-side / controlled elsewhere; omit from the dynamic grid. */
const AUTO_PAYLOAD_KEYS = new Set(["eventType", "timestamp"]);

export type SandboxFormField = {
  name: string;
  type: EventSchemaFieldType;
  required: boolean;
  source: "core" | "custom";
  /** Channel picks up programme enum options when available. */
  widget: "text" | "channel" | "number" | "integer" | "boolean" | "datetime" | "object";
  channelOptions?: string[];
};

function normalizeEventType(value: string): string {
  return value.trim().toUpperCase();
}

function baseWidgetForSchemaType(t: EventSchemaFieldType): SandboxFormField["widget"] {
  if (t === "boolean") return "boolean";
  if (t === "number") return "number";
  if (t === "integer") return "integer";
  if (t === "date-time") return "datetime";
  if (t === "object") return "object";
  return "text";
}

export function resolveSandboxFormFields(args: {
  draft: EventSchemaDraft;
  eventType: string;
  programmeConfigRoot: unknown;
}): { eventDefinitionMatched: boolean; fields: SandboxFormField[] } {
  const normalizedTrigger = normalizeEventType(args.eventType);
  const matchedDef = args.draft.eventDefinitions.find(
    (d) => normalizeEventType(d.eventType) === normalizedTrigger
  );

  const channelOpts = extractChannelOptionsFromProgrammeConfig(args.programmeConfigRoot);

  const fields: SandboxFormField[] = [];
  const seen = new Set<string>();

  const pushField = (row: Omit<SandboxFormField, "channelOptions"> & { channelOptions?: string[] }) => {
    const name = row.name.trim();
    if (!name || AUTO_PAYLOAD_KEYS.has(name) || seen.has(name)) return;
    seen.add(name);
    const isChannel = name === "channel";
    const widget: SandboxFormField["widget"] = isChannel
      ? "channel"
      : row.widget;
    fields.push({
      ...row,
      name,
      widget,
      ...(isChannel && channelOpts.length
        ? { channelOptions: channelOpts }
        : {}),
    });
  };

  if (matchedDef) {
    for (const core of matchedDef.coreFields) {
      const name = core.name.trim();
      if (!name || AUTO_PAYLOAD_KEYS.has(name)) continue;
      pushField({
        name,
        type: core.type,
        required: core.required,
        source: "core",
        widget: baseWidgetForSchemaType(core.type),
      });
    }
  }

  for (const cf of args.draft.customFields) {
    const name = cf.name.trim();
    if (!name || AUTO_PAYLOAD_KEYS.has(name)) continue;
    pushField({
      name,
      type: cf.type,
      required: cf.required,
      source: "custom",
      widget: baseWidgetForSchemaType(cf.type),
    });
  }

  return {
    eventDefinitionMatched: Boolean(matchedDef),
    fields,
  };
}

export function listEventTypesFromDraft(draft: EventSchemaDraft): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of draft.eventDefinitions) {
    const t = d.eventType.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function defaultSandboxInputForField(f: SandboxFormField): string {
  if (f.name === "transactionId") return `txn_${Date.now()}`;
  if (f.name === "amount") return "500";
  if (f.name === "customerId" || f.name === "CustomerId") return "cust_123";
  if (f.name === "channel" || f.name === "Channel") return "MOBILE_APP";
  if (f.widget === "boolean") return "false";
  if (f.widget === "number" || f.widget === "integer") return "0";
  if (f.widget === "object") return "{}";
  return "";
}

export function coerceSandboxFieldValue(f: SandboxFormField, raw: string): unknown {
  const t = raw.trim();
  if (f.widget === "boolean") {
    return t === "true";
  }
  if (f.widget === "integer") {
    if (t === "") return f.required ? 0 : undefined;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : f.required ? 0 : undefined;
  }
  if (f.widget === "number") {
    if (t === "") return f.required ? 0 : undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : f.required ? 0 : undefined;
  }
  if (f.widget === "datetime") {
    if (!t) return undefined;
    const asDate = new Date(t);
    return Number.isNaN(asDate.getTime()) ? t : asDate.toISOString();
  }
  if (f.widget === "object") {
    if (!t) return f.required ? {} : undefined;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return {};
    }
  }
  if (f.widget === "channel") {
    if (!t) return f.required ? "" : undefined;
    return t;
  }
  if (!t) return f.required ? "" : undefined;
  return t;
}

export function buildSandboxPayloadFromFields(args: {
  programmeUid: string;
  eventType: string;
  fields: SandboxFormField[];
  fieldValues: Record<string, string>;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    programmeUid: args.programmeUid,
    eventType: args.eventType.trim(),
    timestamp: new Date().toISOString(),
  };

  for (const f of args.fields) {
    const hasKey = Object.prototype.hasOwnProperty.call(args.fieldValues, f.name);
    const raw = hasKey ? args.fieldValues[f.name] : defaultSandboxInputForField(f);
    const v = coerceSandboxFieldValue(f, raw);
    if (v !== undefined) {
      out[f.name] = v;
    }
  }

  return out;
}

/** Legacy flat shape when schema-driven inputs are not available. */
export function buildLegacySandboxPayload(args: {
  programmeUid: string;
  eventType: string;
  transactionId: string;
  customerId: string;
  amount: string;
  channel: string;
}): Record<string, unknown> {
  return {
    programmeUid: args.programmeUid,
    eventType: args.eventType.trim(),
    timestamp: new Date().toISOString(),
    transactionId: args.transactionId,
    customerId: args.customerId,
    amount: Number(args.amount),
    channel: args.channel,
  };
}
