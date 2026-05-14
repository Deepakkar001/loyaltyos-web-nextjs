"use client";

import { createContext, useContext } from "react";

const Ctx = createContext(false);

/** When true, condition-flow nodes hide edit/delete controls (read-only preview). */
export function ConditionFlowReadOnlyProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={true}>{children}</Ctx.Provider>;
}

export function useConditionFlowReadOnly(): boolean {
  return useContext(Ctx);
}
