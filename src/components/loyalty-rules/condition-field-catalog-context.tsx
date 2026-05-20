"use client";

import { createContext, useContext, useMemo } from "react";

import {
  fallbackConditionFieldCatalog,
  type ConditionFieldCatalog,
} from "@/lib/rules/condition-field-catalog";

const ConditionFieldCatalogContext = createContext<ConditionFieldCatalog | null>(null);

export function ConditionFieldCatalogProvider({
  catalog,
  children,
}: {
  catalog: ConditionFieldCatalog | null;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () =>
      catalog ??
      fallbackConditionFieldCatalog({
        programmeUid: "default",
        triggerEventType: "PURCHASE",
      }),
    [catalog]
  );

  return (
    <ConditionFieldCatalogContext.Provider value={value}>
      {children}
    </ConditionFieldCatalogContext.Provider>
  );
}

export function useConditionFieldCatalog(): ConditionFieldCatalog {
  const ctx = useContext(ConditionFieldCatalogContext);
  if (!ctx) {
    return fallbackConditionFieldCatalog({
      programmeUid: "default",
      triggerEventType: "PURCHASE",
    });
  }
  return ctx;
}
