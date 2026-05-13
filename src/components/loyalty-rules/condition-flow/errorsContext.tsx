"use client";

import { createContext, useContext } from "react";

export type NodeErrorLevel = "none" | "warning" | "error";

const Ctx = createContext<Map<string, NodeErrorLevel> | null>(null);

export function ConditionFlowErrorsProvider({
  value,
  children,
}: {
  value: Map<string, NodeErrorLevel>;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNodeErrorLevel(nodeId: string): NodeErrorLevel {
  const m = useContext(Ctx);
  if (!m) return "none";
  return m.get(nodeId) ?? "none";
}

