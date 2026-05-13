"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { loyaltyRulesAdminApi } from "@/lib/api/client";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { replaceRuleDraft } from "@/lib/store/rule-draft-storage";

export default function EditRuleBootstrapPage() {
  const router = useRouter();
  const params = useParams<{ ruleUid: string }>();
  const search = useSearchParams();
  const programmeUid = search.get("programmeUid") || "default";
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await loyaltyRulesAdminApi.getRule(params.ruleUid, programmeUid);
        if (!alive) return;
        if (!tenantId) {
          toast.error("Missing tenant session. Please re-login.");
          return;
        }
        if (r.status !== "DRAFT") {
          toast.error("Only DRAFT rules can be edited in this MVP.");
          router.replace(`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(r.ruleUid)}/details?programmeUid=${encodeURIComponent(programmeUid)}`);
          return;
        }

        const draft = {
          programmeUid: r.programmeUid ?? programmeUid,
          ruleUid: r.ruleUid,
          name: r.name,
          description: r.description ?? "",
          priority: r.priority ?? 0,
          triggerEventType: r.triggerEventType,
          executionMode: r.executionMode,
          status: r.status,
          conditionTree: r.conditionTree ?? {},
          actions: (r.actions ?? [])
            .filter((a) => a.actionType === "AWARD_POINTS")
            .map((a) => ({
              actionUid: a.actionUid,
              actionType: "AWARD_POINTS" as const,
              formula: a.formula ?? "event.amount * 0.01",
              config: a.config,
            })),
          effectiveAt: r.effectiveAt ?? undefined,
          endAt: r.endAt ?? undefined,
        };

        // Single unified draft — every wizard step reads/writes the same key.
        replaceRuleDraft(tenantId, draft);

        router.replace("/dashboard/loyalty-rules/create/basic-info");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load rule for editing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.ruleUid, programmeUid, router, tenantId]);

  return (
    <div className="p-8">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-3 text-sm text-muted-foreground">Loading rule into editor…</p>
    </div>
  );
}

