"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { CreateRuleShell } from "../_components/CreateRuleShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldHelp } from "@/components/ui/field-help";
import { ConditionBuilder } from "@/components/loyalty-rules/condition-builder/ConditionBuilder";
import { fromBackendConditionTree } from "@/components/loyalty-rules/condition-builder/fromBackend";
import { toBackendConditionTree, type ConditionNode, type ConditionGroup, type ConditionTreeDraft } from "@/components/loyalty-rules/condition-builder/types";
import { RuleFlowBuilder, type RuleFlowBuilderHandle } from "@/components/loyalty-rules/condition-flow/RuleFlowBuilder";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft, saveRuleDraftFields } from "@/lib/store/rule-draft-storage";

const CONDITIONS_PATH = "/dashboard/loyalty-rules/create/conditions";

// ── Deep tree validation helpers ─────────────────────────────────────────────

function isNodeValid(node: ConditionNode): boolean {
  if (node.kind === "leaf") {
    const { op, value } = node;
    if (op === "IS_NULL" || op === "IS_NOT_NULL") return true;
    if (op === "IN" || op === "NOT_IN") return Array.isArray(value) && value.length > 0;
    if (op === "BETWEEN") return Array.isArray(value) && value.length === 2;
    return value !== undefined && value !== null && value !== "";
  }
  if (node.kind === "not") return isNodeValid(node.node);
  // group
  return isGroupDeepValid(node);
}

function isGroupDeepValid(group: ConditionGroup): boolean {
  if (group.nodes.length === 0) return false;
  return group.nodes.every(isNodeValid);
}

function isTreeValid(tree: ConditionTreeDraft): boolean {
  if (tree.kind === "everyone") return true;
  return isGroupDeepValid(tree);
}

/** Pill-shaped segmented control shared by both modes. */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: "current" | "diagram";
  onChange: (m: "current" | "diagram") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-[var(--surface-sunken)] p-1 shadow-inner">
      <button
        type="button"
        onClick={() => onChange("current")}
        className={
          mode === "current"
            ? "rounded-full px-3 py-1.5 text-xs font-semibold bg-background shadow-sm transition-all"
            : "rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
        }
      >
        Classic
      </button>
      <button
        type="button"
        onClick={() => onChange("diagram")}
        className={
          mode === "diagram"
            ? "rounded-full px-3 py-1.5 text-xs font-semibold bg-background shadow-sm transition-all"
            : "rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
        }
      >
        Diagram
      </button>
    </div>
  );
}

export default function ConditionsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  /** Persist rehydration can lag one frame; draft load must re-run when tenantId becomes available. */
  const [storeHydrated, setStoreHydrated] = useState(
    () => typeof window !== "undefined" && useOnboardingStore.persist.hasHydrated()
  );

  const [tree, setTree] = useState<ConditionTreeDraft>({ kind: "group", id: "root", op: "AND", nodes: [] });
  const [uiMode, setUiMode] = useState<"current" | "diagram">("current");
  const [eventType, setEventType] = useState<string>("purchase");
  /**
   * False until RuleFlowBuilder confirms the diagram has at least one real
   * condition node with no blocking errors. Initialized to false so the Next
   * button is disabled the moment diagram mode is first shown (before the first
   * debounce cycle can evaluate the bootstrap graph).
   */
  const [diagramValid, setDiagramValid] = useState(false);
  /** Imperative ref to RuleFlowBuilder — used to synchronously compute the tree at save time. */
  const ruleFlowRef = useRef<RuleFlowBuilderHandle>(null);

  useEffect(() => {
    if (useOnboardingStore.persist.hasHydrated()) {
      setStoreHydrated(true);
      return;
    }
    return useOnboardingStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
  }, []);

  // Re-apply draft whenever this route is shown or tenant / store hydration updates.
  // Relying only on [tenantId] misses returns from later wizard steps (same tenantId)
  // if the effect ordering ever skips a run; pathname + layout timing fixes that.
  useLayoutEffect(() => {
    if (!tenantId || !storeHydrated) return;
    if (!pathname.includes(CONDITIONS_PATH)) return;

    setDiagramValid(false);

    const existing = loadRuleDraft(tenantId);
    if (!existing) return;

    setEventType(existing.triggerEventType || "purchase");
    if (existing.conditionUiMode === "diagram" || existing.conditionUiMode === "current") {
      setUiMode(existing.conditionUiMode);
    }
    // Distinguish "user has not visited Conditions yet" (no conditionTree key
    // in storage at all) from "user explicitly chose everyone" ({} stored).
    // The first case must NOT collapse to `everyone` because that would skip
    // the deep validation and let the diagram pre-load in bootstrap mode.
    if (existing.conditionTree === undefined) {
      setTree({ kind: "group", id: "root", op: "AND", nodes: [] });
    } else {
      setTree(fromBackendConditionTree(existing.conditionTree));
    }
  }, [tenantId, pathname, storeHydrated]);

  // Autosave so users who jump via the step tabs (without clicking Next) do not lose work.
  useEffect(() => {
    if (!tenantId || !storeHydrated) return;
    if (!pathname.includes(CONDITIONS_PATH)) return;

    const t = window.setTimeout(() => {
      const base = loadRuleDraft(tenantId);
      if (!base?.name) return;

      if (uiMode === "diagram") {
        if (!diagramValid) return;
        const sync = ruleFlowRef.current?.computeCurrentTree();
        if (!sync || sync.hasErrors || !sync.hasConditionNodes || sync.tree.kind === "everyone") return;
        saveRuleDraftFields(tenantId, {
          conditionTree: toBackendConditionTree(sync.tree),
          conditionUiMode: "diagram",
        });
        return;
      }

      if (!isTreeValid(tree)) return;
      saveRuleDraftFields(tenantId, {
        conditionTree: toBackendConditionTree(tree),
        conditionUiMode: "current",
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [tree, tenantId, uiMode, diagramValid, pathname, storeHydrated]);

  const handleUiModeChange = useCallback(
    (m: "current" | "diagram") => {
      setUiMode(m);
      if (tenantId) saveRuleDraftFields(tenantId, { conditionUiMode: m });
    },
    [tenantId]
  );

  const handleDiagramValidChange = useCallback((valid: boolean) => {
    setDiagramValid(valid);
  }, []);

  const isValid = useMemo(() => {
    // Diagram mode: fully delegate to the diagram's own validity signal.
    // diagramValid is only true when RuleFlowBuilder has at least one condition
    // node with no blocking errors (bootstrap "everyone" graph = false).
    if (uiMode === "diagram") return diagramValid;
    // Classic: deep-validate the tree so empty nested groups / missing values are caught.
    return isTreeValid(tree);
  }, [tree, uiMode, diagramValid]);

  const onNext = () => {
    if (!tenantId) {
      toast.error("Missing tenant session. Please re-login.");
      return;
    }
    const existing = loadRuleDraft(tenantId);
    if (!existing || !existing.name) {
      toast.error("Rule draft not found. Start from Basic Info.");
      router.push("/dashboard/loyalty-rules/create/basic-info");
      return;
    }

    if (uiMode === "diagram") {
      // Bypass the 150 ms debounce by computing the tree synchronously right now.
      // This eliminates the race window where a fast "Next" click would save the
      // stale "everyone" tree from the bootstrap graph instead of the user's actual
      // conditions.
      const sync = ruleFlowRef.current?.computeCurrentTree();
      if (!sync) {
        toast.error("Diagram not ready. Please wait a moment and try again.");
        return;
      }
      if (sync.hasErrors) {
        toast.error(
          sync.firstErrorMessage ??
            "Fix the diagram errors before proceeding (check the validation badge)."
        );
        return;
      }
      if (!sync.hasConditionNodes) {
        toast.error(
          "Add at least one Condition node to the diagram, or switch to Classic mode and choose \u201cApplies to everyone\u201d."
        );
        return;
      }
      // Diagram mode has NO explicit "applies to everyone" UI. If the resulting
      // tree still collapses to `everyone` despite having condition nodes, the
      // wiring is broken (e.g. both yes/no branches reach the same award action,
      // or the predicate is logically tautological). Refuse to save `{}` — the
      // user must fix the diagram, not silently publish a match-all rule.
      if (sync.tree.kind === "everyone") {
        toast.error(
          "Your diagram has conditions but every path leads to the same outcome — that is logically the same as 'everyone'. Re-wire one of the branches (e.g. send the 'no' path to 'no action') or switch to Classic and choose 'Applies to everyone'."
        );
        return;
      }
      const conditionTree = toBackendConditionTree(sync.tree);
      saveRuleDraftFields(tenantId, { conditionTree, conditionUiMode: "diagram" });
      router.push("/dashboard/loyalty-rules/create/actions");
      return;
    }

    // Classic mode — use the validated tree state.
    if (!isValid) {
      toast.error("Add at least 1 condition, or select \u201cApplies to everyone\u201d.");
      return;
    }
    const conditionTree = toBackendConditionTree(tree);
    saveRuleDraftFields(tenantId, { conditionTree, conditionUiMode: "current" });
    router.push("/dashboard/loyalty-rules/create/actions");
  };

  // ── Diagram mode — edge-to-edge, no card padding ─────────────────────────
  if (uiMode === "diagram") {
    return (
      <CreateRuleShell title="Conditions">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">When These Conditions Match</p>
              <FieldHelp text="Conditions decide who qualifies for this rule. Use 'Applies to everyone' for broad rules, or add filters like tier, channel, amount thresholds, or customer attributes." />
            </div>
            <ModeToggle mode="diagram" onChange={handleUiModeChange} />
          </div>

          <RuleFlowBuilder
            ref={ruleFlowRef}
            eventType={eventType}
            value={tree}
            onChange={setTree}
            onValidChange={handleDiagramValidChange}
          />

          {!isValid && (
            <p className="text-xs text-red-600 px-1">
              {!diagramValid
                ? "Fix the diagram errors above before proceeding (check the validation badge)."
                : "Add at least one condition, or choose \u201cApplies to everyone\u201d."}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/dashboard/loyalty-rules/create/basic-info")}
            >
              ← Back
            </Button>
            <Button type="button" className="rounded-full" onClick={onNext} disabled={!isValid}>
              Next: Actions →
            </Button>
          </div>
        </div>
      </CreateRuleShell>
    );
  }

  // ── Classic mode — original Card layout, unchanged ────────────────────────
  return (
    <CreateRuleShell title="Conditions">
      <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">When These Conditions Match</p>
              <FieldHelp text="Conditions decide who qualifies for this rule. Use 'Applies to everyone' for broad rules, or add filters like tier, channel, amount thresholds, or customer attributes." />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Define who qualifies for this rule.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ModeToggle mode="current" onChange={handleUiModeChange} />
            <p className="text-xs text-muted-foreground">Both views save the same backend condition tree.</p>
          </div>

          <ConditionBuilder value={tree} onChange={setTree} />

          {!isValid && (
            <p className="text-xs text-red-600">
              Add at least one condition, or choose &ldquo;Applies to everyone&rdquo;.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/dashboard/loyalty-rules/create/basic-info")}
            >
              ← Back
            </Button>
            <Button type="button" className="rounded-full" onClick={onNext} disabled={!isValid}>
              Next: Actions →
            </Button>
          </div>
        </div>
      </Card>
    </CreateRuleShell>
  );
}
