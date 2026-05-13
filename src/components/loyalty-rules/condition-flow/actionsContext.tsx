"use client";

import { createContext, useContext } from "react";

export type ConditionFlowActions = {
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;
};

const Ctx = createContext<ConditionFlowActions | null>(null);

export function ConditionFlowActionsProvider({
  value,
  children,
}: {
  value: ConditionFlowActions;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConditionFlowActions(): ConditionFlowActions {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useConditionFlowActions must be used within ConditionFlowActionsProvider");
  }
  return v;
}

