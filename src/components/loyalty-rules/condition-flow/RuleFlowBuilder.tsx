"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";

import {
  AlertCircle,
  GitMerge,
  Maximize2,
  Plus,
  PlusCircle,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

import type { ConditionTreeDraft } from "../condition-builder/types";
import { diagramFromConditionTree } from "./diagramFromTree";
import { RuleTreeBuilder } from "./treeBuilder";
import type { ConditionFlowEdge, ConditionFlowNode, ValidationError } from "./types";
import { getConditionBranchLabel } from "./types";
import { ValidationPanel } from "./components/ValidationPanel";
import { ConditionNode } from "./components/nodes/ConditionNode";
import { ActionNode } from "./components/nodes/ActionNode";
import { EventNode } from "./components/nodes/EventNode";
import { LogicNode } from "./components/nodes/LogicNode";
import { GraphValidator, NodeValidator } from "./validator";
import { useConditionFieldCatalog } from "@/components/loyalty-rules/condition-field-catalog-context";
import { ConditionFlowErrorsProvider, type NodeErrorLevel } from "./errorsContext";
import { ConditionFlowActionsProvider } from "./actionsContext";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random()}`;
}

function isBootstrapEveryoneGraph(nodes: ConditionFlowNode[], edges: ConditionFlowEdge[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const hasOnlyBootstrapNodes =
    nodeIds.size === 3 &&
    nodeIds.has("event") &&
    nodeIds.has("action_yes") &&
    nodeIds.has("action_no");
  if (!hasOnlyBootstrapNodes) return false;
  const directTargets = new Set(
    edges.filter((e) => e.source === "event").map((e) => e.target)
  );
  return directTargets.has("action_yes") || directTargets.has("action_no");
}

// Module-level constant — never recreated, so ReactFlow never warns about
// "new nodeTypes object" and StoreUpdater never fires a spurious setState.
const NODE_TYPES = {
  eventNode: EventNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  logicNode: LogicNode,
};

export interface RuleFlowBuilderHandle {
  /**
   * Synchronously builds the condition tree from the current canvas state.
   * Call this from onNext() to get the freshest possible tree, bypassing the
   * 150 ms debounce window so a fast "Next" click never saves stale data.
   */
  computeCurrentTree(): {
    tree: ConditionTreeDraft;
    /** True when at least one conditionNode exists (user has added a condition). */
    hasConditionNodes: boolean;
    /** True when the treeBuilder or validators produced blocking errors. */
    hasErrors: boolean;
    /** First blocking error — for toast text when Next is pressed. */
    firstErrorMessage?: string;
  };
}

export const RuleFlowBuilder = forwardRef<RuleFlowBuilderHandle, {
  eventType: string;
  value: ConditionTreeDraft;
  onChange: (next: ConditionTreeDraft) => void;
  /** Called whenever the diagram's error state changes. Parent uses this to gate the Next button. */
  onValidChange?: (valid: boolean) => void;
}>(function RuleFlowBuilder({
  eventType,
  value,
  onChange,
  onValidChange,
}, ref) {
  const catalog = useConditionFieldCatalog();
  const fieldMetadata = catalog.metadata;

  const derived = useMemo(
    () => diagramFromConditionTree({ tree: value, eventType }),
    [value, eventType]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(derived.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    derived.edges.map((e) => ({
      ...e,
      label:
        getConditionBranchLabel(e as ConditionFlowEdge) === "yes"
          ? "yes"
          : getConditionBranchLabel(e as ConditionFlowEdge) === "no"
            ? "no"
            : undefined,
    })) as unknown as Edge[]
  );

  const rf = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  // Ref-based onChange / onValidChange — never useEffect deps, avoids loops.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const onValidChangeRef = useRef(onValidChange);
  useEffect(() => { onValidChangeRef.current = onValidChange; });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [lastAppliedTree, setLastAppliedTree] = useState<string>("");

  // Expose an imperative handle so the parent can synchronously compute the
  // current tree at save-time, completely bypassing the 150 ms debounce window.
  useImperativeHandle(ref, () => ({
    computeCurrentTree() {
      const ns = nodes as unknown as ConditionFlowNode[];
      const es = edges as unknown as ConditionFlowEdge[];
      const hasConditionNodes = ns.some((n) => n.type === "conditionNode");
      const gv = new GraphValidator();
      const nv = new NodeValidator(fieldMetadata);
      const graphErrors = gv.validateGraph(ns, es);
      const nodeErrors = ns.flatMap((n) =>
        n.type === "conditionNode"
          ? nv.validateConditionNode(n as Extract<ConditionFlowNode, { type: "conditionNode" }>)
          : []
      );
      const all = [...graphErrors, ...nodeErrors];
      const hasGraphErrors = all.some((e) => e.severity === "error");
      if (hasGraphErrors) {
        const firstErrorMessage = all.find((e) => e.severity === "error")?.message;
        return {
          tree: { kind: "everyone" } as ConditionTreeDraft,
          hasConditionNodes,
          hasErrors: true,
          firstErrorMessage,
        };
      }
      const builder = new RuleTreeBuilder();
      const built = builder.buildTree(ns, es, { fieldMetadata });
      const blocking = built.errors.filter((e) => e.severity === "error");
      const hasErrors = blocking.length > 0;
      const firstErrorMessage = blocking[0]?.message;
      return { tree: built.tree, hasConditionNodes, hasErrors, firstErrorMessage };
    },
  }), [nodes, edges, fieldMetadata]);

  // ── External value sync ────────────────────────────────────────────────────
  // When the parent updates `value` from an external source (e.g., loading a
  // saved draft in useEffect), `useNodesState` / `useEdgesState` do NOT react
  // because they are initialised only once. We detect external changes by
  // comparing the serialised incoming value against the last tree that the
  // canvas itself pushed out via onChange. If they differ, the change came
  // from outside the canvas and we reset the diagram to match.
  const incomingKey = useMemo(() => JSON.stringify(value), [value]);
  const prevIncomingKeyRef = useRef(incomingKey);

  useEffect(() => {
    const isExternalChange = incomingKey !== prevIncomingKeyRef.current;
    const cameFromCanvas = incomingKey === lastAppliedTree;
    prevIncomingKeyRef.current = incomingKey;

    if (isExternalChange && !cameFromCanvas) {
      // Reset canvas to match the externally-set tree.
      setNodes(derived.nodes as unknown as Node[]);
      setEdges(
        derived.edges.map((e) => ({
          ...e,
          label:
            getConditionBranchLabel(e as ConditionFlowEdge) === "yes"
              ? "yes"
              : getConditionBranchLabel(e as ConditionFlowEdge) === "no"
                ? "no"
                : undefined,
        })) as unknown as Edge[]
      );
      // Treat the incoming value as if the canvas last emitted it so the next
      // debounced-validation cycle doesn't immediately re-reset.
      setLastAppliedTree(incomingKey);
      setTimeout(() => rf.current?.fitView({ padding: 0.2 }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey]);
  const [showValidation, setShowValidation] = useState(false);

  // Derived counts for the badge
  const errorCount = useMemo(() => errors.filter((e) => e.severity === "error").length, [errors]);
  const warnCount = useMemo(() => errors.filter((e) => e.severity === "warning").length, [errors]);

  const updateNodeData = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      setNodes((cur) =>
        cur.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: { ...(n.data as Record<string, unknown>), ...patch } } as ConditionFlowNode;
        })
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const protectedIds = new Set(["event", "action_yes", "action_no"]);
      if (protectedIds.has(nodeId)) return;
      setNodes((cur) => cur.filter((n) => n.id !== nodeId));
      setEdges((cur) => cur.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Debounced validation + tree building.
  // onChange / onValidChange consumed via refs to avoid loop-inducing deps.
  useEffect(() => {
    const t = setTimeout(() => {
      const gv = new GraphValidator();
      const nv = new NodeValidator(fieldMetadata);
      const graphErrors = gv.validateGraph(
        nodes as unknown as ConditionFlowNode[],
        edges as unknown as ConditionFlowEdge[]
      );
      const nodeErrors = (nodes as unknown as ConditionFlowNode[]).flatMap((n) =>
        n.type === "conditionNode"
          ? nv.validateConditionNode(n as Extract<ConditionFlowNode, { type: "conditionNode" }>)
          : []
      );
      const all = [...graphErrors, ...nodeErrors];

      const blocking = all.filter((e) => e.severity === "error");
      if (blocking.length === 0) {
        const builder = new RuleTreeBuilder();
        const built = builder.buildTree(
          nodes as unknown as ConditionFlowNode[],
          edges as unknown as ConditionFlowEdge[],
          { fieldMetadata }
        );
        setErrors(built.errors);
        const builtBlocking = built.errors.filter((e) => e.severity === "error");
        if (builtBlocking.length > 0) {
          // Notify parent: diagram has blocking errors from tree builder.
          onValidChangeRef.current?.(false);
          return;
        }

        // Bootstrap guard: if the diagram has no condition nodes at all (just
        // event + action nodes in the pass-through "bootstrap" layout) and the
        // tree evaluates to "everyone", do NOT propagate the change to the parent.
        // This prevents the initial empty graph from silently overwriting the
        // parent tree with { kind: "everyone" } → {} in the backend, which is
        // the root cause of "No condition tree saved" on the review page.
        if (built.tree.kind === "everyone") {
          const hasConditionNodes = (nodes as unknown as ConditionFlowNode[]).some(
            (n) => n.type === "conditionNode"
          );
          if (!hasConditionNodes) {
            // Diagram is in bootstrap (unconfigured) state — mark invalid so the
            // Next button stays disabled until the user adds at least one condition.
            onValidChangeRef.current?.(false);
            return;
          }
        }

        // Notify parent: valid — at least one real condition path exists.
        onValidChangeRef.current?.(true);
        const key = JSON.stringify(built.tree);
        if (key !== lastAppliedTree) {
          setLastAppliedTree(key);
          onChangeRef.current(built.tree);
        }
      } else {
        setErrors(all);
        // Notify parent: diagram has blocking errors.
        onValidChangeRef.current?.(false);
      }
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, lastAppliedTree, fieldMetadata]);

  const onConnect = useCallback(
    (c: Connection) => {
      const source = (nodes as unknown as ConditionFlowNode[]).find((n) => n.id === c.source);
      const label =
        source?.type === "conditionNode"
          ? c.sourceHandle === "yes"
            ? "yes"
            : c.sourceHandle === "no"
              ? "no"
              : undefined
          : undefined;

      setEdges((eds) => {
        const isEvent = source?.type === "eventNode";
        const isCond =
          source?.type === "conditionNode" && (label === "yes" || label === "no");

        const removed: string[] = [];
        const filtered = eds.filter((e) => {
          if (isEvent && c.source && e.source === c.source) {
            removed.push("Event allows only 1 outgoing connection (replaced).");
            return false;
          }
          if (isCond && c.source && e.source === c.source && getConditionBranchLabel(e as ConditionFlowEdge) === label) {
            removed.push(`Condition allows only 1 "${label}" connection (replaced).`);
            return false;
          }
          return true;
        });

        if (removed.length) {
          toast(removed[0]!, { duration: 1800 });
        }

        return addEdge(
          {
            ...c,
            id: `e:${c.source}->${c.target}:${c.sourceHandle ?? ""}`,
            data: { label },
            label,
          } as ConditionFlowEdge,
          filtered
        );
      });
    },
    [setEdges, nodes]
  );

  // Stable callbacks for ReactFlow props — must never be recreated on render or
  // ReactFlow's StoreUpdater triggers setState every frame → infinite loop.
  const onInit = useCallback((instance: ReactFlowInstance<Node, Edge>) => {
    rf.current = instance;
    instance.fitView({ padding: 0.2 });
  }, []);

  const isValidConnection = useCallback(
    (c: Connection) => {
      const source = (nodes as unknown as ConditionFlowNode[]).find((n) => n.id === c.source);
      const target = (nodes as unknown as ConditionFlowNode[]).find((n) => n.id === c.target);
      if (!source || !target) return false;
      if (target.type === "eventNode") return false;
      if (source.type === "actionNode") return false;
      if (
        source.type === "conditionNode" &&
        c.sourceHandle !== "yes" &&
        c.sourceHandle !== "no"
      )
        return false;
      if (
        source.type === "eventNode" &&
        (c.sourceHandle === "yes" || c.sourceHandle === "no")
      )
        return false;
      if (source.id === target.id) return false;
      return true;
    },
    [nodes]
  );

  // Keyboard delete — nodes (protected) and edges via React Flow's controlled delete pipeline.
  // React Flow's default deleteKeyCode is only Backspace; we handle both Delete and Backspace
  // centrally so behaviour matches user expectations on Windows.
  // deleteKeyCode={null} disables the built‑in RF handler to avoid competing listeners.
  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== "Delete" && evt.key !== "Backspace") return;
      const tag = (evt.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        (evt.target as HTMLElement | null)?.getAttribute?.("contenteditable") === "true"
      )
        return;

      const inst = rf.current;
      if (!inst?.viewportInitialized) return;

      const selectedNodes = inst.getNodes().filter((n) => n.selected);
      const selectedEdges = inst.getEdges().filter((e) => e.selected);
      const protectedIds = new Set(["event", "action_yes", "action_no"]);
      const nodesToRemove = selectedNodes.filter((n) => !protectedIds.has(n.id));

      if (!nodesToRemove.length && selectedEdges.length === 0) return;

      evt.preventDefault();
      inst.deleteElements({
        nodes: nodesToRemove.map((n) => ({ id: n.id })),
        edges: selectedEdges.map((e) => ({ id: e.id })),
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const addCondition = useCallback(() => {
    const id = `cond:${newId()}`;
    const newNode: ConditionFlowNode = {
      id,
      type: "conditionNode",
      position: { x: 0, y: 200 },
      data: { field: "event.amount", operator: "GTE", value: 500 },
    };
    setNodes((ns) => [...ns, newNode]);
    setEdges((es) => {
      const currentNodes = nodes as unknown as ConditionFlowNode[];
      const base = isBootstrapEveryoneGraph(currentNodes, es as unknown as ConditionFlowEdge[])
        ? es.filter(
            (e) =>
              !(
                e.source === "event" &&
                (e.target === "action_yes" || e.target === "action_no")
              )
          )
        : es;
      return [
        ...base,
        { id: `e:event->${id}`, source: "event", target: id, data: {} },
        { id: `e:${id}->action_yes:yes`, source: id, target: "action_yes", data: { label: "yes" }, label: "yes" },
        { id: `e:${id}->action_no:no`, source: id, target: "action_no", data: { label: "no" }, label: "no" },
      ];
    });
  }, [setNodes, setEdges, nodes]);

  const addLogic = useCallback(() => {
    const id = `logic:${newId()}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "logicNode",
        position: { x: 220, y: 260 },
        data: { logic: "AND" },
      } as ConditionFlowNode,
    ]);
  }, [setNodes]);

  const addAction = useCallback(() => {
    const id = `action:${newId()}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "actionNode",
        position: { x: -220, y: 420 },
        data: { actionType: "award_points", params: { multiplier: "2x" } },
      } as ConditionFlowNode,
    ]);
  }, [setNodes]);

  const fitView = useCallback(() => rf.current?.fitView({ padding: 0.2 }), []);

  const onSelectNode = useCallback(
    (id: string) => {
      rf.current?.fitView({
        nodes: (nodes as unknown as ConditionFlowNode[]).filter((n) => n.id === id),
        padding: 0.8,
      });
    },
    [nodes]
  );

  const errorLevelsByNode = useMemo(() => {
    const m = new Map<string, NodeErrorLevel>();
    for (const e of errors) {
      if (!e.nodeId) continue;
      const prev = m.get(e.nodeId) ?? "none";
      if (e.severity === "error") m.set(e.nodeId, "error");
      else if (prev !== "error") m.set(e.nodeId, "warning");
    }
    return m;
  }, [errors]);

  return (
    <TooltipProvider delay={150}>
      <div className="flex flex-col gap-3">
        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-[var(--surface-card)] shadow-sm">
          <div
            className="h-[calc(100vh-340px)] min-h-[500px]"
            style={{ touchAction: "none" }}
          >
            <ConditionFlowErrorsProvider value={errorLevelsByNode}>
              <ConditionFlowActionsProvider value={{ updateNodeData, deleteNode }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges as unknown as ConditionFlowEdge[]}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  isValidConnection={isValidConnection}
                  onInit={onInit}
                  deleteKeyCode={null}
                  nodeTypes={NODE_TYPES}
                  snapToGrid
                  snapGrid={[10, 10]}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={16} size={1} color="var(--border)" />
                  <Controls className="rounded-xl overflow-hidden border border-border/60 shadow-md" />
                  <MiniMap
                    pannable
                    zoomable
                    className="rounded-xl overflow-hidden border border-border/60"
                    style={{ width: 140, height: 90 }}
                  />

                  {/* ── Floating toolbar ────────────────────────────── */}
                  <Panel position="top-left">
                    <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-background/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={addCondition}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                          )}
                        >
                          <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                          Condition
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-center">
                          Adds a filter node. Connect its <b>yes</b> and <b>no</b> handles.
                        </TooltipContent>
                      </Tooltip>

                      <div className="h-5 w-px bg-border/60" />

                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={addLogic}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                          )}
                        >
                          <GitMerge className="h-3.5 w-3.5 shrink-0" />
                          Logic
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-center">
                          AND / OR combiner — needs 2+ incoming paths, 1 outgoing.
                        </TooltipContent>
                      </Tooltip>

                      <div className="h-5 w-px bg-border/60" />

                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={addAction}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 gap-1.5 rounded-xl px-3 text-xs font-medium"
                          )}
                        >
                          <Zap className="h-3.5 w-3.5 shrink-0" />
                          Action
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-center">
                          Terminal node — all diagram paths must end here.
                        </TooltipContent>
                      </Tooltip>

                      <div className="h-5 w-px bg-border/60" />

                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          onClick={fitView}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 w-8 rounded-xl p-0"
                          )}
                          aria-label="Fit diagram to viewport"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Fit diagram to viewport</TooltipContent>
                      </Tooltip>
                    </div>
                  </Panel>

                  {/* ── Validation badge ────────────────────────────── */}
                  <Panel position="top-right">
                    <button
                      type="button"
                      onClick={() => setShowValidation((v) => !v)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors",
                        errorCount > 0
                          ? "border-red-200 bg-red-50/90 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/80 dark:text-red-300"
                          : warnCount > 0
                            ? "border-amber-200 bg-amber-50/90 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-300"
                            : "border-emerald-200 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/80 dark:text-emerald-300"
                      )}
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errorCount > 0
                        ? `${errorCount} error${errorCount > 1 ? "s" : ""}`
                        : warnCount > 0
                          ? `${warnCount} warning${warnCount > 1 ? "s" : ""}`
                          : "Valid"}
                      {(errorCount > 0 || warnCount > 0) && (
                        <span className="text-[10px] opacity-70">
                          {showValidation ? "▲ hide" : "▼ show"}
                        </span>
                      )}
                    </button>
                  </Panel>

                  {/* ── Keyboard hint ───────────────────────────────── */}
                  <Panel position="bottom-left">
                    <p className="rounded-xl border border-border/50 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
                      Select edge / node → <kbd className="font-mono">Del</kbd> or <kbd className="font-mono">Bksp</kbd> to remove
                    </p>
                  </Panel>
                </ReactFlow>
              </ConditionFlowActionsProvider>
            </ConditionFlowErrorsProvider>
          </div>
        </div>

        {/* ── Validation panel (collapsible) ───────────────────────────── */}
        {showValidation && errors.length > 0 && (
          <ValidationPanel
            errors={errors}
            onSelectNode={onSelectNode}
            onClose={() => setShowValidation(false)}
          />
        )}

        {/* ── Compact hint strip ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
          <span>
            <Plus className="inline h-3 w-3 mr-0.5 -mt-px" />
            Connect the <b className="text-foreground/70">yes</b> /{" "}
            <b className="text-foreground/70">no</b> handles of every Condition node.
          </span>
          <span>
            <Zap className="inline h-3 w-3 mr-0.5 -mt-px" />
            Every path must end at an <b className="text-foreground/70">Action</b> node.
          </span>
          <span className="text-foreground/40">Both diagram and classic views save the same rule.</span>
        </div>
      </div>
    </TooltipProvider>
  );
});
