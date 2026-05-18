"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { ChipInput } from "@/components/campaigns/ChipInput";
import {
  AWARD_TYPE_OPTIONS,
  buildCampaignUpsertPayload,
  CAMPAIGN_APPROVAL_BUDGET_THRESHOLD,
  campaignToFormState,
  defaultCreateFormState,
  STACK_MODE_OPTIONS,
  type CampaignFormState,
} from "@/lib/campaigns/campaign-form";
import { campaignsAdminApi, programmeApiV2, tenantConfigApi } from "@/lib/api/client";
import {
  extractChannelOptionsFromProgrammeConfig,
  extractEventTypesFromProgrammeConfig,
  extractTierOptionsFromProgrammeConfig,
  mergeProgrammeDropdownRows,
} from "@/lib/programme/programme-config-helpers";
import type { CampaignAwardType, CampaignResponse, StackMode } from "@/types/campaigns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 space-y-5 border-border/70 bg-[var(--surface-card)]">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function BudgetApprovalBanner({ budgetTotal }: { budgetTotal: string }) {
  const amount = Number(budgetTotal);
  if (!Number.isFinite(amount) || amount <= CAMPAIGN_APPROVAL_BUDGET_THRESHOLD) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <p>
        Total budget exceeds the approval threshold (
        {CAMPAIGN_APPROVAL_BUDGET_THRESHOLD.toLocaleString()}). This campaign may require additional
        approval before activation.
      </p>
    </div>
  );
}

export type CampaignFormProps = {
  mode: "create" | "edit";
  /** Required for edit — used for PUT and peer-campaign lookup. */
  campaignUid?: string;
  /** Pre-filled campaign (edit). */
  initialCampaign?: CampaignResponse;
  cancelHref: string;
  /** After successful create (draft). */
  onCreated?: (c: CampaignResponse) => void;
};

export function CampaignForm({
  mode,
  campaignUid,
  initialCampaign,
  cancelHref,
  onCreated,
}: CampaignFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<CampaignFormState>(() =>
    initialCampaign ? campaignToFormState(initialCampaign) : defaultCreateFormState()
  );
  const patch = (partial: Partial<CampaignFormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [tierOptions, setTierOptions] = useState<Array<{ tierUid: string; label: string }>>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [peerCampaigns, setPeerCampaigns] = useState<CampaignResponse[]>([]);
  const [saving, setSaving] = useState<"draft" | "activate" | "update" | null>(null);
  const [hydrated, setHydrated] = useState(!isEdit);

  const programmeUid = form.programmeUid;
  const hasMutualExclGroup = form.mutualExclGroup.trim().length > 0;

  const programmeSelectOptions = useMemo(
    () =>
      programmes.map((p) => ({
        value: p.programmeUid,
        label: p.name,
      })),
    [programmes]
  );

  const programmeLabel =
    programmeSelectOptions.find((p) => p.value === programmeUid)?.label ?? programmeUid;

  useEffect(() => {
    (async () => {
      try {
        const list = await programmeApiV2.listProgrammes();
        const rows = mergeProgrammeDropdownRows(list);
        setProgrammes(rows);
        if (!isEdit && !programmeUid && rows.length === 1) {
          patch({ programmeUid: rows[0].programmeUid });
        }
      } catch {
        /* optional */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialCampaign && !hydrated) {
      const next = campaignToFormState(initialCampaign);
      setForm(next);
      setHydrated(true);
    }
  }, [initialCampaign, hydrated]);

  useEffect(() => {
    if (!programmeUid) return;
    const preserveTrigger = form.triggerEventType;
    (async () => {
      try {
        const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
        const config = blob?.config;
        const types = extractEventTypesFromProgrammeConfig(config, [preserveTrigger]);
        setEventTypes(types);
        if (!isEdit || !preserveTrigger) {
          patch({
            triggerEventType:
              types.length === 0
                ? ""
                : types.includes(preserveTrigger)
                  ? preserveTrigger
                  : types[0],
          });
        }
        let tiers = extractTierOptionsFromProgrammeConfig(config);
        if (programmeUid === "default") {
          try {
            const myConfig = (await tenantConfigApi.getMyConfig()) as {
              tiers?: Array<{ tierUid?: string; name?: string }>;
            };
            const dbTiers = (myConfig?.tiers ?? [])
              .filter((t): t is { tierUid: string; name?: string } => Boolean(t.tierUid?.trim()))
              .map((t) => ({
                tierUid: t.tierUid.trim(),
                label: (t.name ?? "").trim() || t.tierUid.trim(),
              }));
            if (dbTiers.length > 0) tiers = dbTiers;
          } catch {
            /* keep config tiers */
          }
        }
        setTierOptions(tiers);
        setChannelOptions(extractChannelOptionsFromProgrammeConfig(config));
        if (!isEdit) {
          patch({ selectedTiers: [], selectedChannels: [] });
        }
      } catch {
        setEventTypes(extractEventTypesFromProgrammeConfig(null, [preserveTrigger]));
        setTierOptions([]);
        setChannelOptions(extractChannelOptionsFromProgrammeConfig(null));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeUid]);

  useEffect(() => {
    const group = form.mutualExclGroup.trim();
    if (!group || !programmeUid) {
      setPeerCampaigns([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const all = await campaignsAdminApi.listCampaigns({ programmeUid });
        if (cancelled) return;
        setPeerCampaigns(
          all.filter(
            (c) =>
              (c.mutualExclGroup ?? "").trim() === group &&
              c.status === "ACTIVE" &&
              c.campaignUid !== campaignUid
          )
        );
      } catch {
        if (!cancelled) setPeerCampaigns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.mutualExclGroup, programmeUid, campaignUid]);

  const toggleTier = (tierUid: string) => {
    patch({
      selectedTiers: form.selectedTiers.includes(tierUid)
        ? form.selectedTiers.filter((t) => t !== tierUid)
        : [...form.selectedTiers, tierUid],
    });
  };

  const toggleChannel = (channel: string) => {
    patch({
      selectedChannels: form.selectedChannels.includes(channel)
        ? form.selectedChannels.filter((c) => c !== channel)
        : [...form.selectedChannels, channel],
    });
  };

  const submit = async (action: "draft" | "activate" | "update") => {
    const built = buildCampaignUpsertPayload(form, { tierOptions });
    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    setSaving(action);
    try {
      if (action === "update") {
        if (!campaignUid) throw new Error("Missing campaign UID");
        await campaignsAdminApi.updateCampaign(campaignUid, built.payload);
        toast.success("Campaign updated");
        router.push(`/dashboard/campaigns/${encodeURIComponent(campaignUid)}`);
        return;
      }

      const created = await campaignsAdminApi.createCampaign(built.payload);
      if (action === "activate") {
        await campaignsAdminApi.activateCampaign(created.campaignUid);
        toast.success("Campaign created and activated");
      } else {
        toast.success("Campaign saved as draft");
      }
      onCreated?.(created);
      router.push(`/dashboard/campaigns/${encodeURIComponent(created.campaignUid)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(null);
    }
  };

  if (isEdit && !initialCampaign) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <SectionCard title="1. Basic Info">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-description">Description (optional)</Label>
          <Textarea
            id="campaign-description"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-type">Campaign type</Label>
          <Input
            id="campaign-type"
            value={form.campaignType}
            onChange={(e) => patch({ campaignType: e.target.value })}
            required
          />
        </div>

        <ChipInput
          label="Occasion tags (optional)"
          values={form.occasionTags}
          onChange={(occasionTags) => patch({ occasionTags })}
          normalize={(s) => s.trim().toLowerCase()}
        />

        <div className="space-y-2">
          <Label>Programme</Label>
          {isEdit ? (
            <p className="text-sm rounded-lg border border-border/60 bg-muted/30 px-3 py-2">{programmeLabel}</p>
          ) : (
            <NativeSelect
              ariaLabel="Programme"
              value={programmeUid}
              disabled={programmeSelectOptions.length === 0}
              onChange={(programmeUid) => patch({ programmeUid })}
              options={
                programmeSelectOptions.length === 0
                  ? [{ value: "", label: "No programmes available" }]
                  : [{ value: "", label: "Select programme…" }, ...programmeSelectOptions]
              }
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="2. Schedule" description="Validity window and trigger event.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valid-from">Valid from</Label>
            <Input
              id="valid-from"
              type="datetime-local"
              value={form.validFromLocal}
              onChange={(e) => patch({ validFromLocal: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid-until">Valid until</Label>
            <Input
              id="valid-until"
              type="datetime-local"
              value={form.validUntilLocal}
              min={form.validFromLocal || undefined}
              onChange={(e) => patch({ validUntilLocal: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Trigger event type</Label>
          <NativeSelect
            ariaLabel="Trigger event type"
            value={form.triggerEventType}
            disabled={!programmeUid || eventTypes.length === 0}
            onChange={(triggerEventType) => patch({ triggerEventType })}
            options={
              !programmeUid
                ? [{ value: "", label: "Select programme first…" }]
                : eventTypes.length === 0
                  ? [{ value: "", label: "No event types in programme config" }]
                  : [{ value: "", label: "Select event type…" }, ...eventTypes.map((t) => ({ value: t, label: t }))]
            }
          />
        </div>
      </SectionCard>

      <SectionCard title="3. Targeting" description="Optional audience and channel filters.">
        <div className="space-y-2">
          <Label>Tier UIDs (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {tierOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tiers configured for this programme.</p>
            ) : (
              tierOptions.map((t) => (
                <Button
                  key={t.tierUid}
                  type="button"
                  size="sm"
                  variant={form.selectedTiers.includes(t.tierUid) ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => toggleTier(t.tierUid)}
                >
                  {t.label}
                </Button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Channels (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {channelOptions.map((ch) => (
              <Button
                key={ch}
                type="button"
                size="sm"
                variant={form.selectedChannels.includes(ch) ? "default" : "outline"}
                className="rounded-full"
                onClick={() => toggleChannel(ch)}
              >
                {ch}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="min-amount">Minimum amount (optional)</Label>
          <Input
            id="min-amount"
            type="number"
            min={0}
            step="0.01"
            value={form.minAmount}
            onChange={(e) => patch({ minAmount: e.target.value })}
          />
        </div>

        <ChipInput
          label="Countries (optional)"
          values={form.countries}
          onChange={(countries) => patch({ countries })}
          normalize={(s) => s.trim().toUpperCase()}
        />
      </SectionCard>

      <SectionCard title="4. Offer configuration">
        <div className="space-y-2">
          <Label>Award type</Label>
          <NativeSelect
            ariaLabel="Award type"
            value={form.awardType}
            onChange={(v) => patch({ awardType: v as CampaignAwardType })}
            options={AWARD_TYPE_OPTIONS}
          />
        </div>

        {form.awardType === "POINTS_BONUS" && (
          <div className="space-y-2">
            <Label htmlFor="bonus-points">Bonus points</Label>
            <Input
              id="bonus-points"
              type="number"
              min={1}
              value={form.bonusPoints}
              onChange={(e) => patch({ bonusPoints: e.target.value })}
            />
          </div>
        )}
        {form.awardType === "MULTIPLIER_ON_RULE_POINTS" && (
          <div className="space-y-2">
            <Label htmlFor="multiplier">Multiplier on rule points</Label>
            <Input
              id="multiplier"
              type="number"
              step="0.1"
              min={0.1}
              value={form.multiplier}
              onChange={(e) => patch({ multiplier: e.target.value })}
            />
          </div>
        )}
        {form.awardType === "FLAT_CASHBACK" && (
          <div className="space-y-2">
            <Label htmlFor="cashback-amount">Cashback amount</Label>
            <Input
              id="cashback-amount"
              type="number"
              min={0.01}
              step="0.01"
              value={form.cashbackValue}
              onChange={(e) => patch({ cashbackValue: e.target.value })}
            />
          </div>
        )}
        {form.awardType === "PERCENT_CASHBACK" && (
          <div className="space-y-2">
            <Label htmlFor="cashback-percent">Cashback percent</Label>
            <Input
              id="cashback-percent"
              type="number"
              min={0.01}
              step="0.01"
              value={form.cashbackValue}
              onChange={(e) => patch({ cashbackValue: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="expiry-days">Expiry days (optional)</Label>
          <Input
            id="expiry-days"
            type="number"
            min={1}
            value={form.expiryDays}
            onChange={(e) => patch({ expiryDays: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Stackable with rules</p>
          </div>
          <Switch
            checked={form.stackableWithRules}
            onCheckedChange={(stackableWithRules) => patch({ stackableWithRules })}
          />
        </div>
      </SectionCard>

      <SectionCard title="5. Budget and limits">
        <BudgetApprovalBanner budgetTotal={form.budgetTotal} />
        <div className="space-y-2">
          <Label htmlFor="budget-total">Total budget</Label>
          <Input
            id="budget-total"
            type="number"
            min={1}
            value={form.budgetTotal}
            onChange={(e) => patch({ budgetTotal: e.target.value })}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alert-threshold">Alert threshold %</Label>
            <Input
              id="alert-threshold"
              type="number"
              min={1}
              max={100}
              value={form.alertThresholdPct}
              onChange={(e) => patch({ alertThresholdPct: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-participations">Max participations (optional)</Label>
            <Input
              id="max-participations"
              type="number"
              min={1}
              value={form.maxParticipations}
              onChange={(e) => patch({ maxParticipations: e.target.value })}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-per-customer">Max per customer (optional)</Label>
            <Input
              id="max-per-customer"
              type="number"
              min={1}
              value={form.maxPerCustomer}
              onChange={(e) => patch({ maxPerCustomer: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="global-reward-cap">Global reward cap (optional)</Label>
            <Input
              id="global-reward-cap"
              type="number"
              min={1}
              value={form.globalRewardCap}
              onChange={(e) => patch({ globalRewardCap: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="6. Parallel campaign rules">
        <div className="space-y-2">
          <Label htmlFor="mutual-excl-group">Mutual exclusion group (optional)</Label>
          <Input
            id="mutual-excl-group"
            value={form.mutualExclGroup}
            onChange={(e) => patch({ mutualExclGroup: e.target.value })}
          />
        </div>
        {hasMutualExclGroup && (
          <>
            <div className="space-y-2">
              <Label>Stack mode</Label>
              <NativeSelect
                ariaLabel="Stack mode"
                value={form.stackMode}
                onChange={(v) => patch({ stackMode: v as StackMode })}
                options={STACK_MODE_OPTIONS}
              />
            </div>
            <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <Info className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                {peerCampaigns.length === 0 ? (
                  <p>No other active campaigns in this group on this programme.</p>
                ) : (
                  <div>
                    <p className="font-medium mb-1">Other live campaigns in this group:</p>
                    <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                      {peerCampaigns.map((c) => (
                        <li key={c.campaignUid}>
                          <Link
                            href={`/dashboard/campaigns/${encodeURIComponent(c.campaignUid)}`}
                            className="text-foreground hover:underline"
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={form.priority}
            onChange={(e) => patch({ priority: e.target.value })}
          />
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {isEdit ? (
          <>
            <Button
              type="button"
              className="rounded-full"
              disabled={saving !== null}
              onClick={() => submit("update")}
            >
              {saving === "update" ? "Saving…" : "Save changes"}
            </Button>
            <Link href={cancelHref}>
              <Button type="button" variant="ghost" className="rounded-full" disabled={saving !== null}>
                Cancel
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={saving !== null}
              onClick={() => submit("draft")}
            >
              {saving === "draft" ? "Saving…" : "Save as draft"}
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={saving !== null}
              onClick={() => submit("activate")}
            >
              {saving === "activate" ? "Activating…" : "Save and activate"}
            </Button>
            <Link href={cancelHref}>
              <Button type="button" variant="ghost" className="rounded-full" disabled={saving !== null}>
                Cancel
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
