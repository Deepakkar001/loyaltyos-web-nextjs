"use client";

import { useMemo } from "react";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { CAMPAIGN_FIELD_PLACEHOLDERS as P } from "@/lib/campaigns/campaign-form";
import {
  CAMPAIGN_CHANNEL_OPTIONS,
  formatChannelList,
  parseChannelList,
} from "@/lib/campaigns/campaign-offer-helpers";
import {
  formatTriggerEventTypes,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";
import { Card } from "@/components/ui/card";
import { FieldHelp } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function toggleInList(list: string[], value: string, on: boolean): string[] {
  const normalized = value.trim().toUpperCase();
  const set = new Set(list.map((v) => v.toUpperCase()));
  if (on) set.add(normalized);
  else set.delete(normalized);
  return Array.from(set);
}

export function CampaignMerchantTargetingSection({ className }: { className?: string }) {
  const { form, patch, eventSchemaDraft } = useCampaignForm();

  const schemaEventTypes = useMemo(
    () =>
      eventSchemaDraft.eventDefinitions
        .map((d) => d.eventType.trim().toUpperCase())
        .filter(Boolean),
    [eventSchemaDraft.eventDefinitions]
  );

  const selectedTriggers = useMemo(
    () => parseTriggerEventTypes(form.triggerEventType),
    [form.triggerEventType]
  );

  const selectedChannels = useMemo(() => parseChannelList(form.channels), [form.channels]);

  const availableEventTypes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...schemaEventTypes, ...selectedTriggers]) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out;
  }, [schemaEventTypes, selectedTriggers]);

  const toggleTrigger = (eventType: string, on: boolean) => {
    const next = toggleInList(selectedTriggers, eventType, on);
    patch({ triggerEventType: formatTriggerEventTypes(next) });
  };

  const toggleChannel = (channel: string, on: boolean) => {
    const next = toggleInList(selectedChannels, channel, on);
    patch({ channels: formatChannelList(next) });
  };

  return (
    <Card className={cn("p-6 space-y-5 border-border/70 bg-[var(--surface-card)]", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Who qualifies</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Decide which customer events trigger this offer and any limits on how often it can be used.
          All customers are eligible unless you set caps below.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Trigger event types</Label>
          <FieldHelp text="Events from the Events step appear here. Select which types activate this campaign." />
        </div>
        {availableEventTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3">
            Define event types on the Events step first, or enter a custom type below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableEventTypes.map((eventType) => {
              const active = selectedTriggers.includes(eventType);
              return (
                <button
                  key={eventType}
                  type="button"
                  onClick={() => toggleTrigger(eventType, !active)}
                  className={cn(
                    "text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors",
                    active
                      ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary-soft)]"
                      : "bg-[var(--surface-sunken)] text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {eventType}
                </button>
              );
            })}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="custom-trigger">Add custom event type</Label>
          <Input
            id="custom-trigger"
            placeholder="e.g. PURCHASE"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const raw = (e.target as HTMLInputElement).value.trim().toUpperCase();
              if (!raw) return;
              toggleTrigger(raw, true);
              (e.target as HTMLInputElement).value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">Press Enter to add. Selected: {selectedTriggers.join(", ") || "none"}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Channels (optional)</Label>
          <FieldHelp text="Only events from these channels qualify. Leave all off to accept any channel." />
        </div>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_CHANNEL_OPTIONS.map((channel) => {
            const active = selectedChannels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel, !active)}
                className={cn(
                  "text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors",
                  active
                      ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary-soft)]"
                      : "bg-[var(--surface-sunken)] text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {channel.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min-amount">Minimum spend (optional)</Label>
          <Input
            id="min-amount"
            type="number"
            min={0}
            value={form.minAmount}
            onChange={(e) => patch({ minAmount: e.target.value })}
            placeholder={P.minAmount}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-per-customer">Max per customer (optional)</Label>
          <Input
            id="max-per-customer"
            type="number"
            min={1}
            value={form.maxPerCustomer}
            onChange={(e) => patch({ maxPerCustomer: e.target.value })}
            placeholder={P.maxPerCustomer}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-participations">Max total redemptions (optional)</Label>
        <Input
          id="max-participations"
          type="number"
          min={1}
          value={form.maxParticipations}
          onChange={(e) => patch({ maxParticipations: e.target.value })}
          placeholder={P.maxParticipations}
        />
        <p className="text-xs text-muted-foreground">
          Stops the campaign after this many participations, even if budget remains.
        </p>
      </div>
    </Card>
  );
}
