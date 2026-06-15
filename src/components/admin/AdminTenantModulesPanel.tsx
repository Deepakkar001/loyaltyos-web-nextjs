"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Shield, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { ModulePill } from "@/components/modules/ModulePill";
import { TooltipProvider } from "@/components/ui/tooltip";
import { adminApi } from "@/lib/api/admin-client";
import type { ModuleCatalogItemDto } from "@/types/access";
import type { SubscriptionTier } from "@/types/onboarding";
import styles from "./AdminTenantModulesPanel.module.css";

const CRITICAL_MODULE_KEYS = new Set(["integrations", "core_dashboard", "loyalty_rules"]);

function sourceLabel(source?: string): string | undefined {
  if (!source) return undefined;
  const map: Record<string, string> = {
    PLATFORM_ADMIN: "Granted by platform admin",
    ONBOARDING: "Selected during tenant onboarding",
    MIGRATION: "Provisioned via migration",
    SUPPORT: "Granted by support",
    TIER: "Included via subscription tier",
  };
  return map[source] ?? `Source: ${source.replace(/_/g, " ").toLowerCase()}`;
}

function moduleTooltipMeta(m: ModuleCatalogItemDto, tier: SubscriptionTier): string[] {
  const meta: string[] = [];
  if (m.required) meta.push("Platform-required module");
  if (m.inTierBaseline) meta.push(`Included in ${tier} plan`);
  if (!m.required && !m.inTierBaseline) meta.push("Optional add-on");
  const src = sourceLabel(m.entitlementSource);
  if (src && m.enabled) meta.push(src);
  return meta;
}

function enabledKeySet(modules: ModuleCatalogItemDto[]): Set<string> {
  return new Set(modules.filter((m) => m.enabled).map((m) => m.moduleKey));
}

interface AdminTenantModulesPanelProps {
  tenantId: string;
  subscriptionTier: SubscriptionTier;
}

export function AdminTenantModulesPanel({
  tenantId,
  subscriptionTier,
}: AdminTenantModulesPanelProps) {
  const [modules, setModules] = useState<ModuleCatalogItemDto[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminApi.getTenantModules(tenantId);
      setModules(data);
      setSavedSnapshot(enabledKeySet(data));
    } catch {
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (moduleKey: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.moduleKey === moduleKey ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  const { required, planIncluded, optional } = useMemo(() => {
    const req = modules.filter((m) => m.required);
    const plan = modules.filter((m) => m.inTierBaseline && !m.required);
    const opt = modules.filter((m) => !m.required && !m.inTierBaseline);
    return { required: req, planIncluded: plan, optional: opt };
  }, [modules]);

  const enabledCount = useMemo(
    () => modules.filter((m) => m.enabled).length,
    [modules]
  );

  const adminGrantedCount = useMemo(
    () =>
      modules.filter(
        (m) =>
          m.enabled &&
          m.entitlementSource === "PLATFORM_ADMIN" &&
          !m.required &&
          !m.inTierBaseline
      ).length,
    [modules]
  );

  const dirty = useMemo(() => {
    const current = enabledKeySet(modules);
    if (current.size !== savedSnapshot.size) return true;
    return Array.from(current).some((key) => !savedSnapshot.has(key));
  }, [modules, savedSnapshot]);

  const disabledCritical = useMemo(
    () =>
      modules.filter((m) => CRITICAL_MODULE_KEYS.has(m.moduleKey) && !m.enabled),
    [modules]
  );

  const reset = () => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        enabled: savedSnapshot.has(m.moduleKey),
      }))
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const enabled = modules.filter((m) => m.enabled).map((m) => m.moduleKey);
      const updated = await adminApi.updateTenantModules(tenantId, enabled);
      setModules(updated);
      setSavedSnapshot(enabledKeySet(updated));
      toast.success("Module entitlements updated");
    } catch {
      toast.error("Failed to update modules");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  let pillIndex = 0;

  const renderSection = (
    title: string,
    badgeLabel: string,
    badgeClass: string,
    items: ModuleCatalogItemDto[]
  ) => {
    if (items.length === 0) return null;
    return (
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>{title}</span>
          <span className={`${styles.sectionBadge} ${badgeClass}`}>{badgeLabel}</span>
        </div>
        <div className={styles.pillGrid} role="group" aria-label={title}>
          {items.map((m) => {
            const idx = pillIndex++;
            return (
              <ModulePill
                key={m.moduleKey}
                variant="admin"
                label={m.displayName}
                description={m.description}
                tooltipMeta={moduleTooltipMeta(m, subscriptionTier)}
                selected={!!m.enabled}
                onToggle={() => toggle(m.moduleKey)}
                index={idx}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delay={280}>
      <div className="space-y-4">
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Module entitlements</h2>
          <p className={styles.panelSubtext}>
            Platform admins can enable or disable any module for this tenant — including
            required and plan-included modules. Changes apply immediately after save and
            refresh tenant navigation for active sessions.
          </p>

          {renderSection(
            "Platform required",
            "Core",
            styles.badgeRequired,
            required
          )}
          {renderSection(
            "Included in plan",
            subscriptionTier,
            styles.badgePlan,
            planIncluded
          )}
          {renderSection(
            "Optional add-ons",
            "Extra",
            styles.badgeOptional,
            optional
          )}

          <div className={styles.hintRow}>
            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" aria-hidden />
            <span>
              <strong className="font-medium text-slate-200">Required</strong> modules are
              recommended for every tenant.{" "}
              <strong className="font-medium text-slate-200">Plan</strong> modules ship with
              the {subscriptionTier} tier.{" "}
              <strong className="font-medium text-slate-200">Admin-granted</strong> modules
              are extras you enable beyond the tenant&apos;s self-service selection.
            </span>
          </div>

          {disabledCritical.length > 0 && (
            <div className={styles.warningBanner} role="status">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                Disabling{" "}
                {disabledCritical.map((m) => m.displayName).join(", ")} may break dashboards,
                rule authoring, or API go-live for this tenant.
              </span>
            </div>
          )}
        </div>

        <div className={styles.summaryStrip}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
            <span className={styles.summaryCount}>
              {enabledCount} of {modules.length} modules enabled
            </span>
          </div>
          <span className={styles.summaryHint}>
            {adminGrantedCount > 0
              ? `${adminGrantedCount} admin-granted add-on${adminGrantedCount === 1 ? "" : "s"}`
              : dirty
                ? "Unsaved changes"
                : "Matches last saved state"}
          </span>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || saving}
            className={styles.resetButton}
          >
            Reset changes
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            className={styles.saveButton}
          >
            {saving ? "Saving…" : "Save module entitlements"}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
