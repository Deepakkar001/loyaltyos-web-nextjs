"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Plug, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { TooltipProvider } from "@/components/ui/tooltip";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { ModulePill } from "@/components/modules/ModulePill";
import styles from "./Step4Modules.module.css";
import { accessApi } from "@/lib/access/access-api";
import type { ModuleCatalogItemDto } from "@/types/access";

interface Step4ModulesProps {
  onBack?: () => void;
}

export function Step4Modules({ onBack }: Step4ModulesProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tier, setTier] = useState("STANDARD");
  const [modules, setModules] = useState<ModuleCatalogItemDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const catalog = await accessApi.getModuleCatalog();
      setTier(catalog.tier);
      setModules(catalog.modules);
      const initial = new Set<string>();
      catalog.modules.forEach((m) => {
        if (m.required || m.preSelected || m.locked) {
          initial.add(m.moduleKey);
        }
      });
      catalog.required.forEach((k) => initial.add(k));
      catalog.tierBaseline.forEach((k) => initial.add(k));
      setSelected(initial);
      if (catalog.modulesConfigured) {
        router.replace("/dashboard/configure");
      }
    } catch {
      toast.error("Failed to load module catalog");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (m: ModuleCatalogItemDto) => {
    if (m.locked || m.required) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m.moduleKey)) next.delete(m.moduleKey);
      else next.add(m.moduleKey);
      return next;
    });
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await accessApi.saveModules(Array.from(selected));
      toast.success("Modules saved");
      router.push("/dashboard/configure");
    } catch {
      toast.error("Failed to save modules");
    } finally {
      setSubmitting(false);
    }
  };

  const { required, optional } = useMemo(() => {
    const req = modules.filter((m) => m.required);
    const opt = modules.filter((m) => !m.required);
    return { required: req, optional: opt };
  }, [modules]);

  const optionalSelectedCount = useMemo(
    () => optional.filter((m) => selected.has(m.moduleKey)).length,
    [optional, selected]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  let pillIndex = 0;

  return (
    <TooltipProvider delay={280}>
    <div className="space-y-6">
      <StepHeader
        title="Choose your modules"
        description="Pick the capabilities you want on day one. You can add or request more later from Support."
        badge="Module selection"
      />

      <motion.div
        className={styles.selectionPanel}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className={styles.panelQuestion}>
          What capabilities do you need for your loyalty programme?
        </h2>
        <p className={styles.panelSubtext}>
          Your <span className="font-medium text-foreground">{tier}</span> plan includes essentials.
          Tap optional modules to add them — selections animate instantly.
        </p>

        {required.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Included with your plan</p>
            <div className={styles.pillGrid} role="group" aria-label="Required modules">
              {required.map((m) => {
                const idx = pillIndex++;
                return (
                  <ModulePill
                    key={m.moduleKey}
                    label={m.displayName}
                    description={m.description}
                    selected
                    locked
                    index={idx}
                  />
                );
              })}
            </div>
          </>
        )}

        {optional.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Optional add-ons</p>
            <div className={styles.pillGrid} role="group" aria-label="Optional modules">
              {optional.map((m) => {
                const idx = pillIndex++;
                const isSelected = selected.has(m.moduleKey);
                return (
                  <ModulePill
                    key={m.moduleKey}
                    label={m.displayName}
                    description={m.description}
                    selected={isSelected}
                    locked={!!m.locked}
                    disabled={!!m.locked}
                    onToggle={() => toggle(m)}
                    index={idx}
                  />
                );
              })}
            </div>
          </>
        )}

        <div className={styles.hintRow}>
          <Plug className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--accent-primary)]" aria-hidden />
          <span>
            <strong className="font-medium text-foreground">Integrations</strong> is required for API
            keys, event ingestion, and go-live. Optional modules can be enabled anytime from
            Configuration.
          </span>
        </div>
      </motion.div>

      <motion.div
        className={styles.summaryStrip}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden />
          <span className={styles.summaryCount}>
            {selected.size} module{selected.size === 1 ? "" : "s"} selected
          </span>
        </div>
        <span className={styles.summaryHint}>
          {optionalSelectedCount > 0
            ? `${optionalSelectedCount} optional add-on${optionalSelectedCount === 1 ? "" : "s"} chosen`
            : "Required modules only — you can add more later"}
        </span>
      </motion.div>

      <StepActions
        onBack={onBack}
        onNext={() => void onSubmit()}
        nextLabel="Continue to programme setup"
        isLoading={submitting}
        nextButtonClassName={optionalSelectedCount > 0 ? styles.continuePulse : undefined}
      />
    </div>
    </TooltipProvider>
  );
}
