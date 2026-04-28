"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FormField } from "../FormField";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { onboardingApi, ApiError } from "@/lib/api/client";
import { Plus, Trash2, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

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
  minPoints: z.number().min(0),
  maxPoints: z.number().nullable(),
  multiplier: z.number().min(0.1),
  benefits: z.array(z.string()),
});

const schema = z.object({
  programmeName: z.string().min(2, "Programme name is required"),
  pointsName: z.string().min(1, "Points name is required"),
  pointsSymbol: z.string().min(1, "Symbol is required").max(6),
  baseCurrency: z.string(),
  basePointsRate: z.number().min(0.01),
  minRedemptionPoints: z.number().min(1),
  maxRedemptionPctPerTxn: z.number().min(1).max(100),
  tiersEnabled: z.boolean(),
  tiers: z.array(tierSchema),
  webhookEndpoint: z.string().url("Enter a valid HTTPS URL").or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export function Step4Programme() {
  const { tenantId, setProgrammeData, setSubmitting, isSubmitting, syncStatusFromBackend } =
    useOnboardingStore();
  const [tiersEnabled, setTiersEnabled] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseCurrency: "INR",
      basePointsRate: 1,
      minRedemptionPoints: 100,
      maxRedemptionPctPerTxn: 50,
      tiersEnabled: true,
      tiers: PRESETS.RETAIL.tiers,
      webhookEndpoint: "",
    },
  });

  const {
    fields: tierFields,
    append,
    remove,
  } = useFieldArray({ control, name: "tiers" });

  const applyPreset = (category: keyof typeof PRESETS) => {
    const preset = PRESETS[category];
    setValue("programmeName", preset.programmeName);
    setValue("pointsName", preset.pointsName);
    setValue("pointsSymbol", preset.pointsSymbol);
    setValue("basePointsRate", preset.basePointsRate);
    setValue("tiers", preset.tiers);
    toast.success(`${category} preset applied!`);
  };

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return;
    setSubmitting(true);
    try {
      await onboardingApi.submitConfiguration(tenantId, {
        programmeName: data.programmeName,
        pointsName: data.pointsName,
        pointsSymbol: data.pointsSymbol,
        baseCurrency: data.baseCurrency,
        basePointsRate: data.basePointsRate,
        minRedemptionPoints: data.minRedemptionPoints,
        maxRedemptionPctPerTxn: data.maxRedemptionPctPerTxn,
        tiersEnabled: data.tiersEnabled,
        tiers: data.tiersEnabled ? data.tiers : [],
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

      setProgrammeData({
        programmeName: data.programmeName,
        pointsName: data.pointsName,
      });
      syncStatusFromBackend("SANDBOX_TESTING");
      toast.success("Programme configured successfully!");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <StepHeader
        badge="Step 4 of 6"
        title="Configure your programme"
        description="Define your points currency, tier structure, and notification settings."
      />

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Quick-start with a preset
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Programme Identity
          </h3>

          <FormField
            label="Programme Name"
            htmlFor="programmeName"
            error={errors.programmeName?.message}
            required
          >
            <Input
              id="programmeName"
              placeholder="Acme Rewards Club"
              {...register("programmeName")}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              label="Points Name"
              htmlFor="pointsName"
              error={errors.pointsName?.message}
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
              required
            >
              <Input
                id="pointsSymbol"
                placeholder="pts"
                maxLength={6}
                {...register("pointsSymbol")}
              />
            </FormField>
            <FormField label="Earn Rate" htmlFor="basePointsRate" hint="Points per ₹1 spent" required>
              <Input
                id="basePointsRate"
                type="number"
                step="0.01"
                {...register("basePointsRate", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min. Redemption (pts)" htmlFor="minRedemptionPoints">
              <Input
                id="minRedemptionPoints"
                type="number"
                {...register("minRedemptionPoints", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Max Redemption per Txn (%)" htmlFor="maxRedemptionPctPerTxn">
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Tier Structure
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tiers automatically unlock better rewards and multipliers
              </p>
            </div>
            <Switch
              checked={tiersEnabled}
              onCheckedChange={(v) => {
                setTiersEnabled(v);
                setValue("tiersEnabled", v);
              }}
            />
          </div>

          {tiersEnabled && (
            <div className="space-y-3">
              {tierFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200"
                >
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
                    className="w-28 text-sm h-8"
                    placeholder="Tier name"
                    {...register(`tiers.${index}.name`)}
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    from
                  </span>
                  <Input
                    className="w-24 text-sm h-8"
                    type="number"
                    placeholder="Min pts"
                    {...register(`tiers.${index}.minPoints`, {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-xs text-slate-400">×</span>
                  <Input
                    className="w-20 text-sm h-8"
                    type="number"
                    step="0.1"
                    placeholder="Mult."
                    {...register(`tiers.${index}.multiplier`, {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-xs text-slate-400">multiplier</span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
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
                    minPoints: 0,
                    maxPoints: null,
                    multiplier: 1,
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

        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Webhook Endpoint
          </h3>
          <FormField
            label="Sandbox Webhook URL"
            htmlFor="webhookEndpoint"
            hint="Your server will receive real-time loyalty events at this URL"
            error={errors.webhookEndpoint?.message}
          >
            <Input
              id="webhookEndpoint"
              type="url"
              placeholder="https://your-server.com/webhook"
              {...register("webhookEndpoint")}
            />
          </FormField>
        </div>

        <StepActions
          onNext={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          nextLabel="Save Configuration"
        />
      </form>
    </div>
  );
}

