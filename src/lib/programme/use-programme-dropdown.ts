"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ApiError, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";

export type ProgrammeDropdownRow = { programmeUid: string; name: string };

/**
 * Loads tenant programmes from the API for native select dropdowns.
 * Ensures the currently selected uid remains visible even if absent from the latest list.
 */
export function useProgrammeDropdown(
  tenantId: string | null | undefined,
  selectedProgrammeUid?: string
) {
  const [programmeRows, setProgrammeRows] = useState<ProgrammeDropdownRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await programmeApiV2.listProgrammes();
        if (cancelled) return;
        setProgrammeRows(mergeProgrammeDropdownRows(list ?? []));
      } catch (e) {
        if (!cancelled && e instanceof ApiError) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const selectRows = useMemo(() => {
    const rows = [...programmeRows];
    const uid = selectedProgrammeUid?.trim();
    if (uid && !rows.some((r) => r.programmeUid === uid)) {
      rows.push({ programmeUid: uid, name: `${uid} (saved)` });
    }
    return rows;
  }, [programmeRows, selectedProgrammeUid]);

  const selectOptions = useMemo(
    () =>
      selectRows.map((p) => ({
        value: p.programmeUid,
        label: `${p.name} (${p.programmeUid})`,
      })),
    [selectRows]
  );

  const resolveLabel = (programmeUid: string | undefined) => {
    const uid = programmeUid?.trim();
    if (!uid) return "—";
    const hit = selectRows.find((r) => r.programmeUid === uid);
    return hit ? `${hit.name} (${uid})` : uid;
  };

  return { programmeRows: selectRows, selectOptions, loading, resolveLabel };
}
