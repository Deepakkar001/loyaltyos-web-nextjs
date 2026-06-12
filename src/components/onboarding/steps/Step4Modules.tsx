"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "../StepHeader";
import { StepActions } from "../StepActions";
import { Checkbox } from "@/components/ui/checkbox";
import { accessApi } from "@/lib/access/access-api";
import type { ModuleCatalogItemDto } from "@/types/access";
import { Plug } from "lucide-react";
import toast from "react-hot-toast";

interface Step4ModulesProps {
  onBack?: () => void;
}

export function Step4Modules({ onBack }: Step4ModulesProps) {
  const router = useRouter();
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const required = modules.filter((m) => m.required);
  const optional = modules.filter((m) => !m.required);

  return (
    <div className="space-y-8">
      <StepHeader
        title="Choose your modules"
        description={`Your ${tier} plan includes essentials below. Add optional modules now or request more later via Support.`}
        badge="Module selection"
      />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Required (included)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {required.map((m) => (
            <ModuleCard key={m.moduleKey} module={m} checked selected disabled />
          ))}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Plug className="h-3.5 w-3.5" />
          Integrations is required for API keys, webhooks, and go-live.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Optional add-ons</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {optional.map((m) => (
            <ModuleCard
              key={m.moduleKey}
              module={m}
              checked={selected.has(m.moduleKey)}
              selected={selected.has(m.moduleKey)}
              disabled={!!m.locked}
              onToggle={() => toggle(m)}
            />
          ))}
        </div>
      </section>

      <StepActions
        onBack={onBack}
        onNext={() => void onSubmit()}
        nextLabel="Continue to programme setup"
        isLoading={submitting}
      />
    </div>
  );
}

function ModuleCard({
  module: m,
  checked,
  selected,
  disabled,
  onToggle,
}: {
  module: ModuleCatalogItemDto;
  checked: boolean;
  selected: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
        selected ? "border-primary/50 bg-primary/5" : "border-border"
      } ${disabled ? "opacity-80 cursor-default" : "hover:border-primary/30"}`}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={() => onToggle?.()}
        className="mt-0.5"
      />
      <div>
        <p className="text-sm font-medium">{m.displayName}</p>
        {m.locked && (
          <p className="text-xs text-muted-foreground mt-0.5">Included in your plan</p>
        )}
      </div>
    </label>
  );
}
