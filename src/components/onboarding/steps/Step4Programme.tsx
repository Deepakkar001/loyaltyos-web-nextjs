"use client";

import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "../FormField";
import { StepHeader } from "../StepHeader";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi, programmeApiV2, ApiError, ensureAuthSession } from "@/lib/api/client";
import type { OnboardingSelectOption } from "@/types/onboarding";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Plus, Trash2, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { FieldHelp } from "@/components/ui/field-help";
import { NativeSelect } from "@/components/ui/native-select";

const PRESETS = {
  RETAIL: {
    programmeName: "Rewards Club",
    pointsName: "Points",
    pointsSymbol: "pts",
    basePointsRate: 1,
    tiers: [
      {
        name: "Silver",
        rank: 1,
        minPoints: 0,
        maxPoints: 4999,
        multiplier: 1.0,
        benefits: [],
      },
      {
        name: "Gold",
        rank: 2,
        minPoints: 5000,
        maxPoints: 19999,
        multiplier: 2.0,
        benefits: [],
      },
      {
        name: "Platinum",
        rank: 3,
        minPoints: 20000,
        maxPoints: null,
        multiplier: 3.0,
        benefits: [],
      },
    ],
  },
  GAMING: {
    programmeName: "XP Rewards",
    pointsName: "XP",
    pointsSymbol: "xp",
    basePointsRate: 10,
    tiers: [
      {
        name: "Bronze",
        rank: 1,
        minPoints: 0,
        maxPoints: 9999,
        multiplier: 1.0,
        benefits: [],
      },
      {
        name: "Silver",
        rank: 2,
        minPoints: 10000,
        maxPoints: 49999,
        multiplier: 1.5,
        benefits: [],
      },
      {
        name: "Gold",
        rank: 3,
        minPoints: 50000,
        maxPoints: 199999,
        multiplier: 2.5,
        benefits: [],
      },
      {
        name: "Diamond",
        rank: 4,
        minPoints: 200000,
        maxPoints: null,
        multiplier: 4.0,
        benefits: [],
      },
    ],
  },
};

const tierSchema = z.object({
  name: z.string().min(1),
  rank: z.number(),
  entryThreshold: z.number().min(0),
  maintenanceThreshold: z.number().min(0),
  maxPoints: z.number().nullable().optional(),
  multiplier: z.number().min(0.1),
  expiryExtensionMonths: z.number().int().min(0).max(120).nullable().optional(),
  benefits: z.array(z.string()),
});

const customFieldSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use letters, numbers, underscores"),
  type: z.enum(["string", "number", "integer", "boolean", "date-time", "object"]),
  required: z.boolean(),
});

const eventCoreFieldSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use letters, numbers, underscores"),
  type: z.enum(["string", "number", "integer", "boolean", "date-time", "object"]),
  required: z.boolean(),
});

const eventDefinitionSchema = z.object({
  eventType: z
    .string()
    .min(1, "Event type is required")
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, dashes, underscores"),
  coreFields: z.array(eventCoreFieldSchema).min(1, "Add at least one field for this event"),
});

const DEFAULT_EVENT_DEFINITIONS: z.infer<typeof eventDefinitionSchema>[] = [
  {
    eventType: "PURCHASE",
    coreFields: [
      { name: "transactionId", type: "string", required: true },
      { name: "timestamp", type: "date-time", required: true },
      { name: "eventType", type: "string", required: true },
      { name: "customerId", type: "string", required: true },
      { name: "amount", type: "number", required: true },
    ],
  },
];

function parseStoredEventDefinitions(eventSchema: Record<string, unknown>): z.infer<typeof eventDefinitionSchema>[] {
  const safeArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const safeObj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const eds = safeArr(eventSchema.eventDefinitions);
  if (eds.length) {
    const out: z.infer<typeof eventDefinitionSchema>[] = [];
    for (const raw of eds) {
      const o = safeObj(raw);
      const eventType = String(o.eventType ?? "").trim();
      const cfs = safeArr(o.coreFields);
      const coreFields = cfs
        .map((cf) => {
          const f = safeObj(cf);
          const tn = String(f.type ?? "string");
          const type =
            tn === "string" || tn === "number" || tn === "integer" || tn === "boolean" || tn === "date-time" || tn === "object"
              ? tn
              : "string";
          const name = String(f.name ?? "").trim();
          if (!name) return null;
          return { name, type: type as z.infer<typeof eventCoreFieldSchema>["type"], required: Boolean(f.required) };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (eventType && coreFields.length) out.push({ eventType, coreFields });
    }
    if (out.length) return out;
  }
  const std = safeArr(eventSchema.standardFields);
  const coreFields = std
    .map((cf) => {
      const f = safeObj(cf);
      const tn = String(f.type ?? "string");
      const type =
        tn === "string" || tn === "number" || tn === "integer" || tn === "boolean" || tn === "date-time" || tn === "object"
          ? tn
          : "string";
      const name = String(f.name ?? "").trim();
      if (!name) return null;
      return { name, type: type as z.infer<typeof eventCoreFieldSchema>["type"], required: Boolean(f.required) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (coreFields.length) return [{ eventType: "PURCHASE", coreFields }];
  return DEFAULT_EVENT_DEFINITIONS.map((d) => ({
    eventType: d.eventType,
    coreFields: d.coreFields.map((c) => ({ ...c })),
  }));
}

const schema = z
  .object({
  programmeUid: z.string().min(1),
  programmeName: z.string().min(2, "Programme name is required"),
  pointsName: z.string().min(1, "Points name is required"),
  pointsSymbol: z.string().min(1, "Symbol is required").max(6),
  baseCurrency: z.string(),
  basePointsRate: z.number().min(0.01),
  pointsMonetaryValue: z.number().min(0.000001),
  conflictPolicy: z.enum(["BEST_FOR_CUSTOMER", "BEST_FOR_BUSINESS"]),
  dailyPointsCap: z.number().min(0).nullable(),
  monthlyPointsCap: z.number().min(0).nullable(),
  welcomeBonusEnabled: z.boolean(),
  welcomeBonusAmount: z.number().min(0),
  minRedemptionPoints: z.number().min(1),
  maxRedemptionPctPerTxn: z.number().min(1).max(100),
  tiersEnabled: z.boolean(),
  tierThresholdType: z.enum(["LIFETIME_POINTS", "ROLLING_SPEND_12M", "TXN_COUNT"]),
  tierReviewCycle: z.enum(["ANNUAL", "QUARTERLY"]),
  gracePeriodDays: z.number().int().min(0).max(365),
  downgradeWarningDays: z.number().int().min(0).max(365),
  tiers: z.array(tierSchema).min(1),
  expiryModel: z.enum(["ROLLING", "FIXED_DATE"]),
  rollingMonths: z.number().int().min(1).max(240),
  fixedDate: z.string().optional(),
  tierExtensionsEnabled: z.boolean(),
  notificationScheduleDaysCsv: z.string().min(1),
  breakageEnabled: z.boolean(),
  breakageReportFrequency: z.enum(["DAILY", "MONTHLY"]),
  breakageAccountingCutoffTimezone: z.string().min(1),
  breakageExportEnabled: z.boolean(),
  breakageExportFormatsCsv: z.string().optional().or(z.literal("")),
  breakageIncludeTierBreakdown: z.boolean(),
  breakageIncludeProgrammeBreakdown: z.boolean(),
  eventSchemaBackwardCompatibilityDays: z.number().int().min(0).max(365),
  eventDefinitions: z.array(eventDefinitionSchema).min(1).max(25),
  customFields: z.array(customFieldSchema),
  webhookEndpoint: z.string().url("Enter a valid HTTPS URL").or(z.literal("")),
})
  .refine(
    (d) => !d.breakageExportEnabled || Boolean(d.breakageExportFormatsCsv && d.breakageExportFormatsCsv.trim().length),
    { message: "Select at least one export format", path: ["breakageExportFormatsCsv"] }
  )
  .refine(
    (d) => {
      const keys = d.eventDefinitions.map((e) => e.eventType.trim().toUpperCase());
      return new Set(keys).size === keys.length;
    },
    { message: "Each event type must be unique", path: ["eventDefinitions"] }
  )
  .refine(
    (d) => {
      for (const ev of d.eventDefinitions) {
        const names = ev.coreFields.map((f) => f.name.trim().toLowerCase()).filter(Boolean);
        if (new Set(names).size !== names.length) return false;
      }
      return true;
    },
    { message: "Field names must be unique within each event type", path: ["eventDefinitions"] }
  );

type FormData = z.infer<typeof schema>;

/** Fields validated before leaving each configure sub-step (index matches `configStep`). */
const CONFIG_STEP_FIELD_GROUPS: Array<Array<keyof FormData>> = [
  [
    "programmeUid",
    "programmeName",
    "pointsName",
    "pointsSymbol",
    "basePointsRate",
    "pointsMonetaryValue",
    "conflictPolicy",
    "dailyPointsCap",
    "monthlyPointsCap",
    "welcomeBonusEnabled",
    "welcomeBonusAmount",
    "minRedemptionPoints",
    "maxRedemptionPctPerTxn",
  ],
  [
    "tiersEnabled",
    "tierThresholdType",
    "tierReviewCycle",
    "gracePeriodDays",
    "downgradeWarningDays",
    "tierExtensionsEnabled",
    "tiers",
  ],
  [
    "expiryModel",
    "rollingMonths",
    "fixedDate",
    "notificationScheduleDaysCsv",
    "breakageEnabled",
    "breakageReportFrequency",
    "breakageAccountingCutoffTimezone",
    "breakageExportEnabled",
    "breakageExportFormatsCsv",
    "breakageIncludeTierBreakdown",
    "breakageIncludeProgrammeBreakdown",
  ],
  [
    "eventSchemaBackwardCompatibilityDays",
    "eventDefinitions",
    "customFields",
    "webhookEndpoint",
  ],
];

function PillToggle({
  pressed,
  onPressedChange,
  srLabel,
  size = "md",
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  srLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => onPressedChange(!pressed)}
      aria-pressed={pressed}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors",
        size === "sm" ? "h-7 w-[44px]" : "h-8 w-[52px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        pressed ? "border-primary/50 bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 rounded-full shadow-sm ring-1 ring-black/5 transition-transform",
          size === "sm" ? "h-5 w-5" : "h-6 w-6",
          "dark:ring-white/10",
          pressed
            ? cn("bg-amber-300", size === "sm" ? "translate-x-4" : "translate-x-5")
            : "bg-slate-300 dark:bg-slate-300 translate-x-0"
        )}
      />
      <span className="sr-only">{srLabel}</span>
    </button>
  );
}

function unionStandardFieldsFromEventDefinitions(defs: z.infer<typeof eventDefinitionSchema>[]) {
  const map = new Map<string, { name: string; type: z.infer<typeof eventCoreFieldSchema>["type"]; required: boolean }>();
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

function EventDefinitionCoreFields({
  nestIndex,
  control,
  register,
  setValue,
  watch,
}: {
  nestIndex: number;
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
  watch: UseFormWatch<FormData>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `eventDefinitions.${nestIndex}.coreFields`,
  });

  return (
    <div className="space-y-2 pl-0 sm:pl-3 border-l-2 border-border/50">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fields in payload</p>
      {fields.map((row, i) => (
        <div
          key={row.id}
          className="flex flex-col lg:flex-row lg:items-center gap-2 p-3 rounded-xl border border-border/70 bg-[var(--surface-sunken)]"
        >
          <Input
            className="h-8 lg:w-44"
            placeholder="fieldName"
            {...register(`eventDefinitions.${nestIndex}.coreFields.${i}.name` as const)}
          />
          <NativeSelect
            ariaLabel="Field type"
            variant="compact"
            className="lg:w-40"
            value={watch(`eventDefinitions.${nestIndex}.coreFields.${i}.type`)}
            onChange={(v) => {
              const t =
                v === "string" ||
                v === "number" ||
                v === "integer" ||
                v === "boolean" ||
                v === "date-time" ||
                v === "object"
                  ? v
                  : "string";
              setValue(`eventDefinitions.${nestIndex}.coreFields.${i}.type`, t);
            }}
            options={[
              { value: "string", label: "string" },
              { value: "number", label: "number" },
              { value: "integer", label: "integer" },
              { value: "boolean", label: "boolean" },
              { value: "date-time", label: "date-time" },
              { value: "object", label: "object" },
            ]}
          />
          <div className="flex items-center gap-3">
            <PillToggle
              pressed={watch(`eventDefinitions.${nestIndex}.coreFields.${i}.required`)}
              onPressedChange={(v) => setValue(`eventDefinitions.${nestIndex}.coreFields.${i}.required`, v)}
              srLabel={
                watch(`eventDefinitions.${nestIndex}.coreFields.${i}.required`)
                  ? "Mark core field as optional"
                  : "Mark core field as required"
              }
            />
            <span className="text-sm font-medium">Required</span>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
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
        onClick={() => append({ name: "", type: "string", required: false })}
      >
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add core field
      </Button>
    </div>
  );
}

function EventDefinitionCard({
  index,
  control,
  register,
  setValue,
  watch,
  removeEvent,
  canRemove,
}: {
  index: number;
  control: Control<FormData>;
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
  watch: UseFormWatch<FormData>;
  removeEvent: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor={`event-type-${index}`}>
            Event type key
          </label>
          <Input
            id={`event-type-${index}`}
            className="h-9 max-w-md"
            placeholder="e.g. PURCHASE, REFUND, LOGIN"
            {...register(`eventDefinitions.${index}.eventType` as const)}
          />
          <p className="text-[11px] text-muted-foreground">
            Must match the <code className="text-foreground">eventType</code> value your systems send on the wire.
          </p>
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" className="text-red-600 shrink-0" onClick={removeEvent}>
            Remove event
          </Button>
        ) : null}
      </div>
      <EventDefinitionCoreFields nestIndex={index} control={control} register={register} setValue={setValue} watch={watch} />
    </div>
  );
}

export function Step4Programme() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantId, setProgrammeData, setSubmitting, isSubmitting, syncStatusFromBackend } =
    useOnboardingStore();
  const [tiersEnabled, setTiersEnabled] = useState(true);
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([
    { programmeUid: "default", name: "Default programme" },
  ]);
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);
  const [timezoneOptions, setTimezoneOptions] = useState<OnboardingSelectOption[]>([]);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [newProgrammeDialogOpen, setNewProgrammeDialogOpen] = useState(false);
  const [newProgrammeNameDraft, setNewProgrammeNameDraft] = useState("");
  const [creatingProgramme, setCreatingProgramme] = useState(false);
  type ConfigStep = 0 | 1 | 2 | 3;
  const [configStep, setConfigStep] = useState<ConfigStep>(0);

  const STEP_META: Array<{ title: string; subtitle: string }> = [
    {
      title: "Identity & Economics",
      subtitle: "Programme name, points currency, earn rate, redemption caps, conflict policy.",
    },
    {
      title: "Tiers",
      subtitle: "Tier thresholds, multipliers, grace periods, expiry extensions per tier.",
    },
    {
      title: "Expiry & Breakage",
      subtitle: "Points expiry model, breakage frequency, exports, breakdowns.",
    },
    {
      title: "Events & Webhook",
      subtitle:
        "Per-event type core fields, optional custom fields, backward compatibility window, sandbox webhook URL.",
    },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      programmeUid: "default",
      baseCurrency: "INR",
      basePointsRate: 1,
      pointsMonetaryValue: 0.01,
      conflictPolicy: "BEST_FOR_CUSTOMER",
      dailyPointsCap: null,
      monthlyPointsCap: null,
      welcomeBonusEnabled: false,
      welcomeBonusAmount: 0,
      minRedemptionPoints: 100,
      maxRedemptionPctPerTxn: 50,
      tiersEnabled: true,
      tierThresholdType: "LIFETIME_POINTS",
      tierReviewCycle: "ANNUAL",
      gracePeriodDays: 90,
      downgradeWarningDays: 60,
      tiers: PRESETS.RETAIL.tiers.map((t) => ({
        name: t.name,
        rank: t.rank,
        entryThreshold: t.minPoints,
        maintenanceThreshold: t.minPoints,
        maxPoints: t.maxPoints,
        multiplier: t.multiplier,
        expiryExtensionMonths: null,
        benefits: t.benefits,
      })),
      expiryModel: "ROLLING",
      rollingMonths: 24,
      fixedDate: "",
      tierExtensionsEnabled: true,
      notificationScheduleDaysCsv: "60,7,1",
      breakageEnabled: true,
      breakageReportFrequency: "MONTHLY",
      breakageAccountingCutoffTimezone: "Asia/Kolkata",
      breakageExportEnabled: true,
      breakageExportFormatsCsv: "CSV",
      breakageIncludeTierBreakdown: true,
      breakageIncludeProgrammeBreakdown: true,
      eventSchemaBackwardCompatibilityDays: 30,
      eventDefinitions: DEFAULT_EVENT_DEFINITIONS.map((d) => ({
        eventType: d.eventType,
        coreFields: d.coreFields.map((c) => ({ ...c })),
      })),
      customFields: [],
      webhookEndpoint: "",
    },
  });

  const {
    fields: tierFields,
    append,
    remove,
  } = useFieldArray({ control, name: "tiers" });

  const {
    fields: customFieldFields,
    append: appendCustomField,
    remove: removeCustomField,
  } = useFieldArray({ control, name: "customFields" });

  const {
    fields: eventDefinitionFields,
    append: appendEventDefinition,
    remove: removeEventDefinition,
  } = useFieldArray({ control, name: "eventDefinitions" });

  const selectedProgrammeUid = watch("programmeUid");
  const welcomeBonusEnabled = watch("welcomeBonusEnabled");
  const tierExtensionsEnabled = watch("tierExtensionsEnabled");
  const breakageEnabled = watch("breakageEnabled");
  const breakageExportEnabled = watch("breakageExportEnabled");
  const breakageIncludeTierBreakdown = watch("breakageIncludeTierBreakdown");
  const breakageIncludeProgrammeBreakdown = watch("breakageIncludeProgrammeBreakdown");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTimezoneLoading(true);
      try {
        const md = await onboardingApi.getMetadata();
        if (cancelled) return;
        setTimezoneOptions(md.timezones ?? []);
      } catch (e) {
        if (!cancelled) {
          // Best effort: keep free-text as a fallback if metadata isn't available.
          if (e instanceof ApiError) toast.error(e.message);
        }
      } finally {
        if (!cancelled) setTimezoneLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      setLoadingProgrammes(true);
      try {
        const list = await programmeApiV2.listProgrammes();
        if (cancelled) return;
        const merged = mergeProgrammeDropdownRows(list);
        setProgrammes(merged);
        const requestedUid = searchParams?.get("programmeUid");
        if (requestedUid && merged.some((p) => p.programmeUid === requestedUid)) {
          setValue("programmeUid", requestedUid);
        }
      } catch {
        // ignore; keep default
      } finally {
        if (!cancelled) setLoadingProgrammes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, searchParams, setValue]);

  const refreshProgrammeList = useCallback(async () => {
    if (!tenantId) return;
    try {
      const list = await programmeApiV2.listProgrammes();
      setProgrammes(mergeProgrammeDropdownRows(list));
    } catch {
      // non-blocking: keep existing dropdown rows
    }
  }, [tenantId]);

  const createNewProgramme = useCallback(async () => {
    const trimmed = newProgrammeNameDraft.trim();
    if (trimmed.length < 2) {
      toast.error("Enter a programme name (at least 2 characters).");
      return;
    }
    setCreatingProgramme(true);
    try {
      await ensureAuthSession();
      const created = await programmeApiV2.createProgramme({ name: trimmed });
      await refreshProgrammeList();
      setValue("programmeUid", created.programmeUid);
      setValue("programmeName", trimmed);
      setNewProgrammeDialogOpen(false);
      setNewProgrammeNameDraft("");
      toast.success("Programme created");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Could not create programme");
    } finally {
      setCreatingProgramme(false);
    }
  }, [newProgrammeNameDraft, refreshProgrammeList, setValue]);

  useEffect(() => {
    if (!tenantId) return;
    if (!selectedProgrammeUid) return;
    if (selectedProgrammeUid === "default") return; // default configured via legacy + v2 upsert on save
    let cancelled = false;
    (async () => {
      try {
        const cfg = await programmeApiV2.getProgrammeConfig(selectedProgrammeUid);
        if (cancelled) return;
        const c: unknown = cfg?.config ?? {};
        const safeObj = (v: unknown): Record<string, unknown> =>
          v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
        const safeArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

        const root = safeObj(c);
        const pi = safeObj(root.programmeIdentity);
        const pe = safeObj(root.pointsEconomics);
        const tiers = safeObj(root.tiers);
        const expiry = safeObj(root.expiry);
        const eventSchema = safeObj(root.eventSchema);

        if (pi.programmeName) setValue("programmeName", String(pi.programmeName));
        if (pi.pointsName) setValue("pointsName", String(pi.pointsName));
        if (pi.pointsSymbol) setValue("pointsSymbol", String(pi.pointsSymbol));
        if (pi.baseCurrency) setValue("baseCurrency", String(pi.baseCurrency));

        if (pe.basePointsRate != null) setValue("basePointsRate", Number(pe.basePointsRate));
        if (pe.pointsMonetaryValue != null) setValue("pointsMonetaryValue", Number(pe.pointsMonetaryValue));
        const caps = safeObj(pe.caps);
        if (caps.daily != null) setValue("dailyPointsCap", Number(caps.daily));
        if (caps.monthly != null) setValue("monthlyPointsCap", Number(caps.monthly));
        const welcomeBonus = safeObj(pe.welcomeBonus);
        if (welcomeBonus.enabled != null) setValue("welcomeBonusEnabled", Boolean(welcomeBonus.enabled));
        if (welcomeBonus.amount != null) setValue("welcomeBonusAmount", Number(welcomeBonus.amount));

        const conflictPolicy = safeObj(root.conflictPolicy);
        if (typeof conflictPolicy.defaultStrategy === "string") {
          const v = conflictPolicy.defaultStrategy;
          if (v === "BEST_FOR_CUSTOMER" || v === "BEST_FOR_BUSINESS") setValue("conflictPolicy", v);
        }

        if (tiers.thresholdType === "LIFETIME_POINTS" || tiers.thresholdType === "ROLLING_SPEND_12M" || tiers.thresholdType === "TXN_COUNT") {
          setValue("tierThresholdType", tiers.thresholdType);
        }
        if (tiers.reviewCycle === "ANNUAL" || tiers.reviewCycle === "QUARTERLY") {
          setValue("tierReviewCycle", tiers.reviewCycle);
        }
        if (tiers.gracePeriodDays != null) setValue("gracePeriodDays", Number(tiers.gracePeriodDays));
        if (tiers.downgradeWarningDays != null) setValue("downgradeWarningDays", Number(tiers.downgradeWarningDays));

        const tierList = safeArr(tiers.tiers);
        if (tierList.length) {
          setValue(
            "tiers",
            tierList.map((t, idx: number) => {
              const o = safeObj(t);
              return {
                name: String(o.name ?? `Tier ${idx + 1}`),
                rank: Number(o.rank ?? idx + 1),
                entryThreshold: Number(o.entryThreshold ?? 0),
                maintenanceThreshold: Number(o.maintenanceThreshold ?? 0),
                maxPoints: o.maxPoints == null ? null : Number(o.maxPoints),
                multiplier: Number(o.multiplier ?? 1),
                expiryExtensionMonths:
                  o.expiryExtensionMonths == null ? null : Number(o.expiryExtensionMonths),
                benefits: [],
              };
            })
          );
        }

        if (expiry.model === "ROLLING" || expiry.model === "FIXED_DATE") {
          setValue("expiryModel", expiry.model);
        }
        if (expiry.rollingMonths != null) setValue("rollingMonths", Number(expiry.rollingMonths));
        if (expiry.fixedDate) setValue("fixedDate", String(expiry.fixedDate));
        if (expiry.tierExtensionsEnabled != null) setValue("tierExtensionsEnabled", Boolean(expiry.tierExtensionsEnabled));
        if (Array.isArray(expiry.notificationScheduleDays)) {
          setValue("notificationScheduleDaysCsv", expiry.notificationScheduleDays.join(","));
        }
        const breakage = safeObj(expiry.breakage);
        if (breakage.enabled != null) setValue("breakageEnabled", Boolean(breakage.enabled));
        if (breakage.reportFrequency === "DAILY" || breakage.reportFrequency === "MONTHLY") {
          setValue("breakageReportFrequency", breakage.reportFrequency);
        }
        if (breakage.accountingCutoffTimezone != null) {
          setValue("breakageAccountingCutoffTimezone", String(breakage.accountingCutoffTimezone));
        }
        if (breakage.exportEnabled != null) setValue("breakageExportEnabled", Boolean(breakage.exportEnabled));
        const exportFormatsArr = safeArr(breakage.exportFormats).map((x) => String(x));
        if (exportFormatsArr.length) setValue("breakageExportFormatsCsv", exportFormatsArr.join(","));
        if (breakage.includeTierBreakdown != null) setValue("breakageIncludeTierBreakdown", Boolean(breakage.includeTierBreakdown));
        if (breakage.includeProgrammeBreakdown != null) setValue("breakageIncludeProgrammeBreakdown", Boolean(breakage.includeProgrammeBreakdown));

        if (eventSchema.backwardCompatibilityDays != null) setValue("eventSchemaBackwardCompatibilityDays", Number(eventSchema.backwardCompatibilityDays));
        const cf = safeArr(eventSchema.customFields);
        if (cf.length) {
          setValue(
            "customFields",
            cf.map((f) => {
              const o = safeObj(f);
              const t = String(o.type ?? "string");
              const type =
                t === "string" || t === "number" || t === "integer" || t === "boolean" || t === "date-time" || t === "object"
                  ? t
                  : "string";
              return {
                name: String(o.name ?? ""),
                type,
                required: Boolean(o.required),
              };
            })
          );
        }
        setValue("eventDefinitions", parseStoredEventDefinitions(eventSchema));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, selectedProgrammeUid, setValue]);

  const applyPreset = (category: keyof typeof PRESETS) => {
    const preset = PRESETS[category];
    setValue("programmeName", preset.programmeName);
    setValue("pointsName", preset.pointsName);
    setValue("pointsSymbol", preset.pointsSymbol);
    setValue("basePointsRate", preset.basePointsRate);
    setValue(
      "tiers",
      preset.tiers.map((t) => ({
        name: t.name,
        rank: t.rank,
        entryThreshold: t.minPoints,
        maintenanceThreshold: t.minPoints,
        maxPoints: t.maxPoints,
        multiplier: t.multiplier,
        expiryExtensionMonths: null,
        benefits: t.benefits,
      }))
    );
    toast.success(`${category} preset applied!`);
  };

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return;
    setSubmitting(true);
    try {
      // 1) Legacy save (required for onboarding state + tier_definitions). Applies to default programme.
      if (data.programmeUid === "default") {
        await onboardingApi.submitConfiguration(tenantId, {
          programmeName: data.programmeName,
          pointsName: data.pointsName,
          pointsSymbol: data.pointsSymbol,
          baseCurrency: data.baseCurrency,
          basePointsRate: data.basePointsRate,
          minRedemptionPoints: data.minRedemptionPoints,
          maxRedemptionPctPerTxn: data.maxRedemptionPctPerTxn,
          tiersEnabled: data.tiersEnabled,
          tiers: data.tiersEnabled
            ? data.tiers.map((t) => ({
                name: t.name,
                rank: t.rank,
                minPoints: t.entryThreshold,
                maxPoints: t.maxPoints ?? null,
                multiplier: t.multiplier,
                benefits: t.benefits ?? [],
              }))
            : [],
          notificationPreferences: {
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
            webhookEnabled: !!data.webhookEndpoint,
          },
          webhookConfig: {
            sandboxEndpointUrl: data.webhookEndpoint || "",
          },
        });
      }

      // 2) Canonical v2 programme config upsert (schema-validated + versioned)
      const notificationScheduleDays = data.notificationScheduleDaysCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 0);
      const exportFormats = (data.breakageExportFormatsCsv ?? "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const evDefs = data.eventDefinitions.map((d) => ({
        eventType: d.eventType.trim(),
        coreFields: d.coreFields.map((f) => ({
          name: f.name.trim(),
          type: f.type,
          required: f.required,
        })),
      }));

      const programmeConfig = {
        programmeIdentity: {
          programmeName: data.programmeName,
          pointsName: data.pointsName,
          pointsSymbol: data.pointsSymbol,
          baseCurrency: data.baseCurrency,
        },
        pointsEconomics: {
          pointsMonetaryValue: data.pointsMonetaryValue,
          basePointsRate: data.basePointsRate,
          caps: { daily: data.dailyPointsCap, monthly: data.monthlyPointsCap },
          welcomeBonus: {
            enabled: data.welcomeBonusEnabled,
            amount: data.welcomeBonusAmount,
            tierOverrides: [],
          },
        },
        conflictPolicy: {
          defaultStrategy: data.conflictPolicy,
          allowRuleOverride: true,
        },
        tiers: {
          enabled: data.tiersEnabled,
          thresholdType: data.tierThresholdType,
          reviewCycle: data.tierReviewCycle,
          gracePeriodDays: data.gracePeriodDays,
          downgradeWarningDays: data.downgradeWarningDays,
          tiers: data.tiersEnabled
            ? data.tiers.map((t) => ({
                tierUid: `rank-${t.rank}`,
                name: t.name,
                rank: t.rank,
                entryThreshold: t.entryThreshold,
                maintenanceThreshold: t.maintenanceThreshold,
                multiplier: t.multiplier,
                expiryExtensionMonths: t.expiryExtensionMonths ?? null,
              }))
            : [
                {
                  tierUid: "standard",
                  name: "Standard",
                  rank: 1,
                  entryThreshold: 0,
                  maintenanceThreshold: 0,
                  multiplier: 1,
                  expiryExtensionMonths: null,
                },
              ],
        },
        expiry: {
          model: data.expiryModel,
          rollingMonths: data.expiryModel === "ROLLING" ? data.rollingMonths : null,
          fixedDate: data.expiryModel === "FIXED_DATE" ? (data.fixedDate || null) : null,
          tierExtensionsEnabled: data.tierExtensionsEnabled,
          notificationScheduleDays,
          processMode: "OVERNIGHT_BATCH",
          breakage: {
            enabled: data.breakageEnabled,
            reportFrequency: data.breakageReportFrequency,
            accountingCutoffTimezone: data.breakageAccountingCutoffTimezone,
            exportEnabled: data.breakageExportEnabled,
            exportFormats,
            includeTierBreakdown: data.breakageIncludeTierBreakdown,
            includeProgrammeBreakdown: data.breakageIncludeProgrammeBreakdown,
          },
        },
        eventSchema: {
          version: 2,
          eventDefinitions: evDefs,
          standardFields: unionStandardFieldsFromEventDefinitions(evDefs),
          customFields: data.customFields,
          backwardCompatibilityDays: data.eventSchemaBackwardCompatibilityDays,
        },
        webhooks: {
          sandboxEndpointUrl: data.webhookEndpoint || "",
          subscribedEvents: [],
        },
      };

      await programmeApiV2.upsertProgrammeConfig(data.programmeUid, { config: programmeConfig });

      await refreshProgrammeList();

      setProgrammeData({
        programmeName: data.programmeName,
        pointsName: data.pointsName,
      });
      // Guided flow: after configuration is saved, go to Rules Setup.
      // Status progression:
      // - backend transitions AGREEMENT_SIGNED → CONFIGURED when config is saved (default via legacy; non-default via v2)
      syncStatusFromBackend("CONFIGURED");
      toast.success("Programme configured successfully!");
      router.replace("/dashboard/loyalty-rules/create/basic-info");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const tryGoToStep = useCallback(
    async (next: ConfigStep) => {
      if (next === configStep) return;
      if (next < configStep) {
        setConfigStep(next);
        return;
      }
      for (let s = configStep; s < next; s++) {
        const fieldList = CONFIG_STEP_FIELD_GROUPS[s];
        const ok = await trigger(fieldList, { shouldFocus: false });
        if (!ok) {
          setConfigStep(s as ConfigStep);
          toast.error("Please complete the required fields in this step before continuing.");
          await trigger(fieldList, { shouldFocus: true });
          return;
        }
      }
      setConfigStep(next);
    },
    [configStep, trigger]
  );

  const onInvalid = (errs: Record<string, unknown>) => {
    const errKeys = Object.keys(errs);
    if (!errKeys.length) return;
    const offending = CONFIG_STEP_FIELD_GROUPS.findIndex((group) =>
      errKeys.some((k) => group.some((f) => k === f || k.startsWith(`${f}.`)))
    );
    if (offending >= 0) setConfigStep(offending as ConfigStep);
    toast.error("Please fix the highlighted fields and try again.");
  };

  return (
    <div className="w-full">
      <Dialog open={newProgrammeDialogOpen} onOpenChange={setNewProgrammeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New programme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This name appears in the programme list and can match your public loyalty programme name. You can refine it
            in Identity & Economics.
          </p>
          <Input
            autoFocus
            placeholder="e.g. North Region Rewards"
            value={newProgrammeNameDraft}
            onChange={(e) => setNewProgrammeNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createNewProgramme();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setNewProgrammeDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={creatingProgramme} onClick={() => void createNewProgramme()}>
              {creatingProgramme ? "Creating…" : "Create programme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepHeader
        badge="Step 4 of 6"
        title="Configure your programme"
        description="Define your points currency, economics, tiers, expiry, event schema, and notifications."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Programme
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:max-w-sm">
              <select
                aria-label="Select programme"
                value={selectedProgrammeUid}
                disabled={loadingProgrammes}
                onChange={(e) => setValue("programmeUid", e.target.value)}
                className={cn(
                  "h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm text-foreground",
                  "[color-scheme:light] dark:[color-scheme:dark]",
                  "outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-input/30 dark:focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {programmes.map((p) => (
                  <option key={p.programmeUid} value={p.programmeUid}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setNewProgrammeNameDraft("");
                setNewProgrammeDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-2" /> New programme
            </Button>
          </div>
          {selectedProgrammeUid !== "default" ? (
            <p className="text-xs text-muted-foreground">
              Note: onboarding completion is based on configuring the <b>default</b> programme.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick-start preset
          </p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key)}
                className="text-xs"
              >
                <Zap className="w-3 h-3 mr-1.5" />
                {key} Preset
              </Button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* Configure stepper */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4">
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEP_META.map((s, idx) => {
              const active = configStep === idx;
              const done = configStep > idx;
              return (
                <li key={s.title} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => void tryGoToStep(idx as ConfigStep)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2 transition-colors",
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100 dark:border-brand-700/50"
                        : done
                        ? "border-emerald-300/70 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/50"
                        : "border-border/70 bg-[var(--surface-sunken)] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                          active
                            ? "bg-brand-600 text-white"
                            : done
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-foreground/70"
                        )}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <span className="text-sm font-semibold truncate">{s.title}</span>
                    </div>
                    <p className="hidden sm:block mt-1 text-[11px] text-muted-foreground truncate">
                      {s.subtitle}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Step 1: Identity & Economics */}
        <div className={cn(configStep === 0 ? "space-y-6" : "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Programme Identity & Economics
            </h3>

          <FormField
            label="Programme Name"
            htmlFor="programmeName"
            error={errors.programmeName?.message}
            helpText="The name of your loyalty programme (shown in admin UI and often customer-facing copy). Example: Acme Rewards Club."
            required
          >
            <Input
              id="programmeName"
              placeholder="Acme Rewards Club"
              {...register("programmeName")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label="Points Name"
              htmlFor="pointsName"
              error={errors.pointsName?.message}
              helpText="What you call the loyalty currency. Example: Points, Coins, Stars."
              required
            >
              <Input
                id="pointsName"
                placeholder="Points, Coins, Stars…"
                {...register("pointsName")}
              />
            </FormField>
            <FormField
              label="Symbol"
              htmlFor="pointsSymbol"
              error={errors.pointsSymbol?.message}
              hint="Max 6 chars"
              helpText="Short symbol used in UI and exports. Example: pts, ★. Keep it short for receipts and dashboards."
              required
            >
              <Input
                id="pointsSymbol"
                placeholder="pts"
                maxLength={6}
                {...register("pointsSymbol")}
              />
            </FormField>
            <FormField
              label="Earn Rate"
              htmlFor="basePointsRate"
              hint="Points per ₹1 spent"
              helpText="Base earning before promotions. Example: 1 = 1 point per ₹1. Rules can still add bonuses on top."
              required
            >
              <Input
                id="basePointsRate"
                type="number"
                step="0.01"
                {...register("basePointsRate", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Points monetary value (₹ per point)"
              htmlFor="pointsMonetaryValue"
              error={errors.pointsMonetaryValue?.message}
              helpText="Accounting value per point (liability). Example: 0.01 means 1 point = ₹0.01."
              required
            >
              <Input
                id="pointsMonetaryValue"
                type="number"
                step="0.000001"
                {...register("pointsMonetaryValue", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Conflict policy" htmlFor="conflictPolicy" required>
              <NativeSelect
                ariaLabel="Conflict policy"
                value={watch("conflictPolicy")}
                onChange={(v) =>
                  setValue(
                    "conflictPolicy",
                    v === "BEST_FOR_CUSTOMER" || v === "BEST_FOR_BUSINESS" ? v : "BEST_FOR_CUSTOMER"
                  )
                }
                options={[
                  { value: "BEST_FOR_CUSTOMER", label: "Best for Customer" },
                  { value: "BEST_FOR_BUSINESS", label: "Best for Business" },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Daily points cap (per customer)"
              htmlFor="dailyPointsCap"
              helpText="Maximum points a single customer can earn per day. Useful for fraud control and budget limits. Leave empty for no cap."
            >
              <Input
                id="dailyPointsCap"
                type="number"
                step="1"
                placeholder="Leave empty for no cap"
                {...register("dailyPointsCap", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Monthly points cap (per customer)"
              htmlFor="monthlyPointsCap"
              helpText="Maximum points a single customer can earn per month. Useful for budget limits. Leave empty for no cap."
            >
              <Input
                id="monthlyPointsCap"
                type="number"
                step="1"
                placeholder="Leave empty for no cap"
                {...register("monthlyPointsCap", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3">
            <PillToggle
              pressed={welcomeBonusEnabled}
              onPressedChange={(v) => setValue("welcomeBonusEnabled", v)}
              srLabel={welcomeBonusEnabled ? "Disable welcome bonus" : "Enable welcome bonus"}
            />
            <p className="text-sm font-medium">Enable welcome bonus</p>
          </div>
          {welcomeBonusEnabled ? (
            <FormField
              label="Welcome bonus amount (points)"
              htmlFor="welcomeBonusAmount"
              helpText="Optional one-time points granted for new members (exact triggering depends on your rules/engine)."
            >
              <Input
                id="welcomeBonusAmount"
                type="number"
                step="1"
                {...register("welcomeBonusAmount", { valueAsNumber: true })}
              />
            </FormField>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Min. Redemption (pts)"
              htmlFor="minRedemptionPoints"
              helpText="Minimum points a customer must have to redeem. Example: 100 means you can’t redeem with less than 100 points."
            >
              <Input
                id="minRedemptionPoints"
                type="number"
                {...register("minRedemptionPoints", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Max Redemption per Txn (%)"
              htmlFor="maxRedemptionPctPerTxn"
              helpText="Caps how much of a single transaction can be paid with points. Example: 50 means at most 50% of the bill."
            >
              <Input
                id="maxRedemptionPctPerTxn"
                type="number"
                min={1}
                max={100}
                {...register("maxRedemptionPctPerTxn", { valueAsNumber: true })}
              />
            </FormField>
          </div>
          </div>
        </div>

        {/* Step 2: Tier Structure */}
        <div className={cn(configStep === 1 ? "space-y-6" : "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tier Structure
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tiers automatically unlock better rewards and multipliers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <PillToggle
                  pressed={tiersEnabled}
                  onPressedChange={(v) => {
                    setTiersEnabled(v);
                    setValue("tiersEnabled", v);
                  }}
                  srLabel={tiersEnabled ? "Disable tiers" : "Enable tiers"}
                />
                <p className="text-sm font-medium">Tiers enabled</p>
                <FieldHelp text="Enable tiering (Silver/Gold/Platinum) so loyal customers unlock better multipliers and benefits." label="Tiers enabled help" />
              </div>

              {tiersEnabled ? (
                <div className="flex items-center gap-2">
                  <PillToggle
                    pressed={tierExtensionsEnabled}
                    onPressedChange={(v) => setValue("tierExtensionsEnabled", v)}
                    srLabel={tierExtensionsEnabled ? "Disable tier expiry extensions" : "Enable tier expiry extensions"}
                  />
                  <p className="text-sm font-medium">Tier expiry extensions</p>
                  <FieldHelp text="If enabled, each tier can extend point expiry (Expiry +months column). Example: Gold +12 months, Platinum +24 months." label="Tier expiry extensions help" />
                </div>
              ) : null}
            </div>
          </div>

          {tiersEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Tier threshold type"
                  htmlFor="tierThresholdType"
                  helpText="How customers qualify for tiers. Lifetime points is simplest; rolling spend and transaction count are alternative models."
                >
                  <NativeSelect
                    ariaLabel="Tier threshold type"
                    value={watch("tierThresholdType")}
                    onChange={(v) =>
                      setValue(
                        "tierThresholdType",
                        v === "LIFETIME_POINTS" || v === "ROLLING_SPEND_12M" || v === "TXN_COUNT"
                          ? v
                          : "LIFETIME_POINTS"
                      )
                    }
                    options={[
                      { value: "LIFETIME_POINTS", label: "Lifetime points" },
                      { value: "ROLLING_SPEND_12M", label: "Rolling 12m spend" },
                      { value: "TXN_COUNT", label: "Transaction count" },
                    ]}
                  />
                </FormField>
                <FormField
                  label="Review cycle"
                  htmlFor="tierReviewCycle"
                  helpText="How often tier eligibility is re-evaluated (e.g., quarterly). Combined with grace period and warnings to prevent sudden downgrades."
                >
                  <NativeSelect
                    ariaLabel="Review cycle"
                    value={watch("tierReviewCycle")}
                    onChange={(v) =>
                      setValue("tierReviewCycle", v === "ANNUAL" || v === "QUARTERLY" ? v : "ANNUAL")
                    }
                    options={[
                      { value: "ANNUAL", label: "Annual" },
                      { value: "QUARTERLY", label: "Quarterly" },
                    ]}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Grace period (days)"
                  htmlFor="gracePeriodDays"
                  helpText="Extra time a customer keeps their tier even if they fall below the maintain threshold. Example: 90 days."
                >
                  <Input id="gracePeriodDays" type="number" {...register("gracePeriodDays", { valueAsNumber: true })} />
                </FormField>
                <FormField
                  label="Downgrade warning (days)"
                  htmlFor="downgradeWarningDays"
                  helpText="How many days before a downgrade we warn the customer (and/or admin). Example: warn 60 days before tier drop."
                >
                  <Input id="downgradeWarningDays" type="number" {...register("downgradeWarningDays", { valueAsNumber: true })} />
                </FormField>
              </div>

              <div
                className={cn(
                  "hidden md:grid gap-3 px-1",
                  tierExtensionsEnabled
                    ? "md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr_.8fr_auto]"
                    : "md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr_auto]"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tier name</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Entry</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Maintain</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Multiplier</p>
                {tierExtensionsEnabled ? (
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Expiry +months
                  </p>
                ) : null}
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-right"> </p>
              </div>

              {tierFields.map((field, index) => (
                <div
                  key={field.id}
                  className={cn(
                    "grid grid-cols-1 gap-3 p-4 bg-[var(--surface-sunken)] rounded-xl border border-border/70",
                    tierExtensionsEnabled
                      ? "md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr_.8fr_auto]"
                      : "md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_.7fr_auto]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Trophy
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        index === 0
                          ? "text-amber-400"
                          : index === 1
                            ? "text-slate-400"
                            : index === 2
                              ? "text-amber-600"
                              : "text-brand-500"
                      )}
                    />
                    <Input
                      className="text-sm h-8"
                      placeholder="Tier name"
                      aria-label={`Tier ${index + 1} name`}
                      {...register(`tiers.${index}.name`)}
                    />
                  </div>
                  <Input
                    className="text-sm h-8"
                    type="number"
                    placeholder="Entry"
                    aria-label={`Tier ${index + 1} entry threshold`}
                    {...register(`tiers.${index}.entryThreshold`, { valueAsNumber: true })}
                  />
                  <Input
                    className="text-sm h-8"
                    type="number"
                    placeholder="Maintain"
                    aria-label={`Tier ${index + 1} maintenance threshold`}
                    {...register(`tiers.${index}.maintenanceThreshold`, { valueAsNumber: true })}
                  />
                  <Input
                    className="text-sm h-8"
                    type="number"
                    step="0.1"
                    placeholder="Mult."
                    aria-label={`Tier ${index + 1} multiplier`}
                    {...register(`tiers.${index}.multiplier`, {
                      valueAsNumber: true,
                    })}
                  />
                  {tierExtensionsEnabled ? (
                    <Input
                      className="text-sm h-8"
                      type="number"
                      step="1"
                      min={0}
                      placeholder="+months"
                      aria-label={`Tier ${index + 1} expiry extension months`}
                      {...register(`tiers.${index}.expiryExtensionMonths`, { valueAsNumber: true })}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="md:ml-auto text-slate-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove tier ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    name: "",
                    rank: tierFields.length + 1,
                    entryThreshold: 0,
                    maintenanceThreshold: 0,
                    maxPoints: null,
                    multiplier: 1,
                    expiryExtensionMonths: tierExtensionsEnabled ? 0 : null,
                    benefits: [],
                  })
                }
                className="w-full border-dashed text-slate-500"
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Tier
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Step 3: Expiry & Breakage */}
        <div className={cn(configStep === 2 ? "space-y-6" : "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Points Expiry & Breakage
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Expiry model"
                htmlFor="expiryModel"
                helpText="Rolling expiry means points expire a fixed number of months after earning. Fixed date means points expire on one calendar date you choose."
              >
              <NativeSelect
                ariaLabel="Expiry model"
                value={watch("expiryModel")}
                onChange={(v) => setValue("expiryModel", v === "ROLLING" || v === "FIXED_DATE" ? v : "ROLLING")}
                options={[
                  { value: "ROLLING", label: "Rolling" },
                  { value: "FIXED_DATE", label: "Fixed date" },
                ]}
              />
            </FormField>
            {watch("expiryModel") === "ROLLING" ? (
              <FormField
                label="Rolling months"
                htmlFor="rollingMonths"
                helpText="How long points stay valid from the earn date. Example: 24 means points expire 24 months after earning."
              >
                <Input id="rollingMonths" type="number" {...register("rollingMonths", { valueAsNumber: true })} />
              </FormField>
            ) : (
              <FormField
                label="Fixed expiry date"
                htmlFor="fixedDate"
                helpText="All points follow the same calendar expiry date under this model. Use the date picker to choose it."
              >
                <Input
                  id="fixedDate"
                  type="date"
                  {...register("fixedDate")}
                />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Expiry notifications (days, CSV)"
              htmlFor="notificationScheduleDaysCsv"
              helpText="Comma-separated reminder schedule before points expire. Example: 60,7,1 sends reminders 60 days, 7 days, and 1 day before expiry."
            >
              <Input id="notificationScheduleDaysCsv" placeholder="60,7,1" {...register("notificationScheduleDaysCsv")} />
            </FormField>
            <div />
          </div>

          <div className="flex items-center gap-3">
            <PillToggle
              pressed={breakageEnabled}
              onPressedChange={(v) => setValue("breakageEnabled", v)}
              srLabel={breakageEnabled ? "Disable breakage reporting" : "Enable breakage reporting"}
            />
            <p className="text-sm font-medium">Enable breakage reporting</p>
            <FieldHelp text="Breakage reporting measures points that expire unused. Use it for finance reporting and programme health." label="Breakage reporting help" />
          </div>

          {breakageEnabled ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="Breakage frequency"
                  htmlFor="breakageReportFrequency"
                  helpText="How often breakage reports are generated. Monthly is typical; daily is useful for very high volume programmes."
                >
                  <NativeSelect
                    ariaLabel="Breakage frequency"
                    value={watch("breakageReportFrequency")}
                    onChange={(v) =>
                      setValue("breakageReportFrequency", v === "DAILY" || v === "MONTHLY" ? v : "MONTHLY")
                    }
                    options={[
                      { value: "DAILY", label: "Daily" },
                      { value: "MONTHLY", label: "Monthly" },
                    ]}
                  />
                </FormField>
                <FormField
                  label="Accounting cutoff timezone"
                  htmlFor="breakageAccountingCutoffTimezone"
                  helpText="Timezone used to decide when a ‘day’ ends for accounting and breakage reports. Example: Asia/Kolkata."
                >
                  {timezoneOptions.length ? (
                    <NativeSelect
                      ariaLabel="Accounting cutoff timezone"
                      value={watch("breakageAccountingCutoffTimezone")}
                      disabled={timezoneLoading}
                      onChange={(v) => setValue("breakageAccountingCutoffTimezone", v)}
                      options={timezoneOptions.map((t) => ({ value: t.value, label: t.label }))}
                    />
                  ) : (
                    <Input
                      id="breakageAccountingCutoffTimezone"
                      placeholder={timezoneLoading ? "Loading timezones…" : "e.g. Asia/Kolkata"}
                      {...register("breakageAccountingCutoffTimezone")}
                    />
                  )}
                </FormField>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <PillToggle
                    pressed={breakageExportEnabled}
                    onPressedChange={(v) => setValue("breakageExportEnabled", v)}
                    srLabel={breakageExportEnabled ? "Disable breakage export" : "Enable breakage export"}
                  />
                  <p className="text-sm font-medium">Export enabled</p>
                  <FieldHelp text="Enable exports for finance. When on, you can choose export formats (CSV/XLSX/PDF)." label="Export enabled help" />
                </div>
                {breakageExportEnabled ? (
                  <FormField
                    label="Export formats"
                    htmlFor="breakageExportFormatsCsv"
                    error={errors.breakageExportFormatsCsv?.message}
                    hint="Choose one or more (stored as CSV)"
                    helpText="Select the file format(s) used when generating breakage reports. Stored as a comma-separated list."
                  >
                    <NativeSelect
                      ariaLabel="Export formats"
                      value={watch("breakageExportFormatsCsv") || ""}
                      onChange={(v) => setValue("breakageExportFormatsCsv", v)}
                      options={[
                        { value: "CSV", label: "CSV" },
                        { value: "XLSX", label: "XLSX" },
                        { value: "PDF", label: "PDF" },
                        { value: "CSV,XLSX", label: "CSV + XLSX" },
                        { value: "CSV,PDF", label: "CSV + PDF" },
                        { value: "XLSX,PDF", label: "XLSX + PDF" },
                        { value: "CSV,XLSX,PDF", label: "CSV + XLSX + PDF" },
                      ]}
                    />
                  </FormField>
                ) : (
                  <div />
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <PillToggle
                    pressed={breakageIncludeTierBreakdown}
                    onPressedChange={(v) => setValue("breakageIncludeTierBreakdown", v)}
                    srLabel={
                      breakageIncludeTierBreakdown
                        ? "Disable including tier breakdown"
                        : "Enable including tier breakdown"
                    }
                  />
                  <p className="text-sm font-medium">Include tier breakdown</p>
                  <FieldHelp
                    text="Adds tier-level splits to breakage reports (e.g., Silver vs Gold vs Platinum) so you can see which tier’s points are expiring unused."
                    label="Include tier breakdown help"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <PillToggle
                    pressed={breakageIncludeProgrammeBreakdown}
                    onPressedChange={(v) => setValue("breakageIncludeProgrammeBreakdown", v)}
                    srLabel={
                      breakageIncludeProgrammeBreakdown
                        ? "Disable including programme breakdown"
                        : "Enable including programme breakdown"
                    }
                  />
                  <p className="text-sm font-medium">Include programme breakdown</p>
                  <FieldHelp
                    text="Adds programme-level splits to breakage reports. Useful if you have multiple programmes (Default programme + others) and want totals per programme."
                    label="Include programme breakdown help"
                  />
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>

        {/* Step 4: Event Schema & Webhook */}
        <div className={cn(configStep === 3 ? "space-y-6" : "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Event Schema (custom fields)
          </h3>

          <div className="rounded-xl border border-border/70 bg-[var(--surface-sunken)] p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Event types and core payload</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                For each <strong>event type</strong> your systems emit (for example <code className="text-foreground">PURCHASE</code> or{" "}
                <code className="text-foreground">REFUND</code>), declare which fields appear on the JSON payload. Mark a field
                required only when every producer will send it—required fields are enforced in sandbox validation and rule
                conditions. A combined field list is stored automatically for backwards compatibility with the rule engine.
              </p>
            </div>
            {errors.eventDefinitions &&
            typeof errors.eventDefinitions === "object" &&
            "message" in errors.eventDefinitions &&
            typeof (errors.eventDefinitions as { message?: string }).message === "string" ? (
              <p className="text-xs text-red-600">{(errors.eventDefinitions as { message: string }).message}</p>
            ) : null}
            <div className="space-y-4">
              {eventDefinitionFields.map((ed, idx) => (
                <EventDefinitionCard
                  key={ed.id}
                  index={idx}
                  control={control}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  removeEvent={() => removeEventDefinition(idx)}
                  canRemove={eventDefinitionFields.length > 1}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed text-slate-500"
              onClick={() =>
                appendEventDefinition({
                  eventType: `EVENT_${eventDefinitionFields.length + 1}`,
                  coreFields: [
                    { name: "transactionId", type: "string", required: true },
                    { name: "eventType", type: "string", required: true },
                  ],
                })
              }
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add another event type
            </Button>

            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">Example payloads (reference)</summary>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Your actual required keys depend on the fields you marked required above. These samples show a typical retail
                purchase and refund shape.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <pre className="text-xs overflow-auto rounded-xl border border-border bg-background p-3">
{`{
  "programmeUid": "default",
  "eventType": "PURCHASE",
  "status": "SUCCESS",
  "timestamp": "2026-05-06T10:00:00Z",
  "transactionId": "txn_123",
  "customerId": "cust_123",
  "amount": 1000,
  "currency": "INR",
  "channel": "POS"
}`}
                </pre>
                <pre className="text-xs overflow-auto rounded-xl border border-border bg-background p-3">
{`{
  "programmeUid": "default",
  "eventType": "REFUND",
  "status": "SUCCESS",
  "timestamp": "2026-05-07T09:00:00Z",
  "transactionId": "txn_ref_001",
  "originalTransactionId": "txn_123",
  "customerId": "cust_123",
  "amount": 1000,
  "currency": "INR",
  "channel": "POS"
}`}
                </pre>
              </div>
            </details>
          </div>

          <FormField
            label="Backward compatibility window (days)"
            htmlFor="eventSchemaBackwardCompatibilityDays"
            helpText="How long older event payload formats are accepted after schema changes. Example: 30 days gives you time to roll out updates across POS/app/backend."
          >
            <Input
              id="eventSchemaBackwardCompatibilityDays"
              type="number"
              {...register("eventSchemaBackwardCompatibilityDays", { valueAsNumber: true })}
            />
          </FormField>

          <div className="space-y-3">
            {customFieldFields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl border border-border/70 bg-[var(--surface-sunken)]">
                <Input
                  className="h-8 md:w-52"
                  placeholder="fieldName (e.g. channel)"
                  {...register(`customFields.${index}.name`)}
                />
                <NativeSelect
                  ariaLabel="Field type"
                  variant="compact"
                  className="md:w-40"
                  value={watch(`customFields.${index}.type`)}
                  onChange={(v) => {
                    const t =
                      v === "string" ||
                      v === "number" ||
                      v === "integer" ||
                      v === "boolean" ||
                      v === "date-time" ||
                      v === "object"
                        ? v
                        : "string";
                    setValue(`customFields.${index}.type`, t);
                  }}
                  options={[
                    { value: "string", label: "string" },
                    { value: "number", label: "number" },
                    { value: "integer", label: "integer" },
                    { value: "boolean", label: "boolean" },
                    { value: "date-time", label: "date-time" },
                    { value: "object", label: "object" },
                  ]}
                />
                <FieldHelp
                  text="Field type controls how LoyaltyOS validates this value (and which operators you can use in conditions). Example: channel = string, amount = number, isInternational = boolean."
                  label="Custom field type help"
                />
                <div className="flex items-center gap-2">
                  <PillToggle
                    size="sm"
                    pressed={watch(`customFields.${index}.required`)}
                    onPressedChange={(v) => setValue(`customFields.${index}.required`, v)}
                    srLabel={watch(`customFields.${index}.required`) ? "Mark field as optional" : "Mark field as required"}
                  />
                  <span className="text-xs text-slate-500">Required</span>
                  <FieldHelp
                    text="If required, every event must include this field. Keep fields optional unless rules/analytics truly depend on them—required fields can break ingestion if a source forgets to send them."
                    label="Custom field required help"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="md:ml-auto text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendCustomField({ name: "", type: "string", required: false })}
              className="w-full border-dashed text-slate-500"
            >
              <Plus className="w-3.5 h-3.5 mr-2" /> Add Custom Field
            </Button>
          </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Webhook Endpoint
          </h3>
          <FormField
            label="Sandbox Webhook URL"
            htmlFor="webhookEndpoint"
            hint="Your server will receive real-time loyalty events at this URL"
            error={errors.webhookEndpoint?.message}
            helpText="Where LoyaltyOS will POST events (sandbox) for validation and integration testing. Use an HTTPS URL that returns 200 OK quickly."
          >
            <Input
              id="webhookEndpoint"
              type="url"
              placeholder="https://your-server.com/webhook"
              {...register("webhookEndpoint")}
            />
          </FormField>
          </div>
        </div>

        {/* Stepper footer */}
        <div className="flex flex-col-reverse gap-3 pt-4 border-t border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfigStep((s) => (s > 0 ? ((s - 1) as ConfigStep) : s))}
            disabled={configStep === 0 || isSubmitting}
            className="text-muted-foreground"
          >
            ← Back
          </Button>
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Step {configStep + 1} of {STEP_META.length}
            {" · "}
            <span className="text-foreground font-medium">{STEP_META[configStep].title}</span>
          </p>
          {configStep < 3 ? (
            <Button
              type="button"
              size="lg"
              onClick={() => void tryGoToStep((configStep + 1) as ConfigStep)}
              className="bg-brand-600 hover:bg-brand-700 text-white min-w-[140px]"
            >
              Next →
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="bg-brand-600 hover:bg-brand-700 text-white min-w-[180px]"
            >
              {isSubmitting ? "Saving…" : "Save Configuration"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

