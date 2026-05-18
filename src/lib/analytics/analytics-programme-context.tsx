"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";

type ProgrammeRow = { programmeUid: string; name: string };

type AnalyticsProgrammeContextValue = {
  programmes: ProgrammeRow[];
  programmeUid: string;
  programmeName: string;
  setProgrammeUid: (uid: string) => void;
  programmesLoading: boolean;
};

const AnalyticsProgrammeContext = createContext<AnalyticsProgrammeContextValue | null>(null);

export function AnalyticsProgrammeProvider({ children }: { children: ReactNode }) {
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([
    { programmeUid: "default", name: "Default programme" },
  ]);
  const [programmeUid, setProgrammeUid] = useState("default");
  const [programmesLoading, setProgrammesLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setProgrammesLoading(true);
      try {
        const list = await programmeApiV2.listProgrammes();
        const merged = mergeProgrammeDropdownRows(list);
        if (!alive) return;
        setProgrammes(merged);
        if (merged.length > 0 && !merged.some((p) => p.programmeUid === programmeUid)) {
          setProgrammeUid(merged[0].programmeUid);
        }
      } catch {
        if (alive) {
          setProgrammes([{ programmeUid: "default", name: "Default programme" }]);
        }
      } finally {
        if (alive) setProgrammesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const programmeName = useMemo(
    () => programmes.find((p) => p.programmeUid === programmeUid)?.name ?? programmeUid,
    [programmes, programmeUid]
  );

  const value = useMemo(
    () => ({
      programmes,
      programmeUid,
      programmeName,
      setProgrammeUid,
      programmesLoading,
    }),
    [programmes, programmeUid, programmeName, programmesLoading]
  );

  return (
    <AnalyticsProgrammeContext.Provider value={value}>{children}</AnalyticsProgrammeContext.Provider>
  );
}

export function useAnalyticsProgramme(): AnalyticsProgrammeContextValue {
  const ctx = useContext(AnalyticsProgrammeContext);
  if (!ctx) {
    throw new Error("useAnalyticsProgramme must be used within AnalyticsProgrammeProvider");
  }
  return ctx;
}
