"use client";

import "reactflow/dist/style.css";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";

import { fromBackendConditionTree } from "../condition-builder/fromBackend";
import { ActionNode } from "./components/nodes/ActionNode";
import { ConditionNode } from "./components/nodes/ConditionNode";
import { EventNode } from "./components/nodes/EventNode";
import { LogicNode } from "./components/nodes/LogicNode";
import { ConditionFlowActionsProvider } from "./actionsContext";
import { diagramFromConditionTree } from "./diagramFromTree";
import { getConditionBranchLabel, type ConditionFlowEdge, type ConditionFlowNode } from "./types";
import { ConditionFlowReadOnlyProvider } from "./viewModeContext";

const NODE_TYPES = {
  eventNode: EventNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  logicNode: LogicNode,
} as const;

const noopActions = {
  updateNodeData: () => {},
  deleteNode: () => {},
};

function humanizeApiToken(s: string): string {
  if (!s?.trim()) return "Action";
  return s
    .split(/_+/)
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function withRuleActionsOnYesBranch(
  nodes: ConditionFlowNode[],
  actions: Array<{ actionType: string; formula?: string | null }>
): ConditionFlowNode[] {
  return nodes.map((n) => {
    if (n.id !== "action_yes" || n.type !== "actionNode") return n;
    if (!actions.length) {
      return {
        ...n,
        data: {
          ...n.data,
          params: {},
          actionType: "noop",
          displayTitle: "No actions when matched",
          displayTypeLine: "This rule has no actions configured",
        },
      } as ConditionFlowNode;
    }
    const first = actions[0];
    if (actions.length === 1) {
      return {
        ...n,
        data: {
          ...n.data,
          params: {},
          actionType: "award_points",
          displayTitle: humanizeApiToken(first.actionType),
          displayTypeLine: first.formula ? `Formula: ${first.formula}` : `Type: ${first.actionType}`,
        },
      } as ConditionFlowNode;
    }
    return {
      ...n,
      data: {
        ...n.data,
        params: {},
        actionType: "award_points",
        displayTitle: `${actions.length} actions when matched`,
        displayTypeLine: actions
          .map((a) => `${a.actionType}${a.formula ? ` — ${a.formula}` : ""}`)
          .join(" · "),
      },
    } as ConditionFlowNode;
  });
}

function toFlowEdges(edges: ConditionFlowEdge[]): Edge[] {
  return edges.map((e) => ({
    ...e,
    label:
      getConditionBranchLabel(e) === "yes"
        ? "yes"
        : getConditionBranchLabel(e) === "no"
          ? "no"
          : undefined,
  })) as Edge[];
}

export type RuleConditionFlowPreviewProps = {
  conditionTree: unknown;
  eventType: string;
  actions?: Array<{ actionType: string; formula?: string | null }>;
  className?: string;
};

export function RuleConditionFlowPreview({
  conditionTree,
  eventType,
  actions = [],
  className,
}: RuleConditionFlowPreviewProps) {
  const tree = useMemo(() => fromBackendConditionTree(conditionTree), [conditionTree]);

  const serialized = useMemo(
    () => JSON.stringify({ conditionTree, eventType, actions }),
    [conditionTree, eventType, actions]
  );

  const derived = useMemo(() => {
    const { nodes, edges } = diagramFromConditionTree({ tree, eventType });
    const patched = withRuleActionsOnYesBranch(nodes, actions);
    return { nodes: patched as unknown as Node[], edges: toFlowEdges(edges) };
  }, [tree, eventType, actions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(derived.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derived.edges);
  const rf = useRef<ReactFlowInstance | null>(null);
  const prevSerialized = useRef(serialized);

  useEffect(() => {
    if (serialized === prevSerialized.current) return;
    prevSerialized.current = serialized;
    setNodes(derived.nodes);
    setEdges(derived.edges);
    const t = window.setTimeout(() => rf.current?.fitView({ padding: 0.2 }), 80);
    return () => window.clearTimeout(t);
  }, [serialized, derived.nodes, derived.edges, setNodes, setEdges]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rf.current = instance;
    instance.fitView({ padding: 0.2 });
  }, []);

  return (
    <ConditionFlowReadOnlyProvider>
      <ConditionFlowActionsProvider value={noopActions}>
        <div
          className={`overflow-hidden rounded-xl border border-border/70 bg-[var(--surface-card)] shadow-sm ${className ?? ""}`}
        >
          <div
            className="h-[min(28rem,calc(100vh-22rem))] min-h-[280px] w-full"
            style={{ touchAction: "none" }}
            aria-label="Condition flow preview"
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={NODE_TYPES}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnScroll
              zoomOnScroll
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              onInit={onInit}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={16} size={1} color="var(--border)" />
              <Controls className="rounded-xl overflow-hidden border border-border/60 shadow-md" showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                className="rounded-xl overflow-hidden border border-border/60"
                style={{ width: 120, height: 80 }}
              />
            </ReactFlow>
          </div>
        </div>
      </ConditionFlowActionsProvider>
    </ConditionFlowReadOnlyProvider>
  );
}
