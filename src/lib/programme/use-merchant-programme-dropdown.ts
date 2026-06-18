"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { merchantListProgrammes } from "@/lib/api/merchant";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";

export type MerchantProgrammeDropdownRow = { programmeUid: string; name: string };

/**
 * Loads tenant programmes via merchant portal API (merchant JWT only).
 */
export function useMerchantProgrammeDropdown(selectedProgrammeUid?: string) {
  const tenantId = useMerchantAuthStore((s) => s.tenantId);
  const [programmeRows, setProgrammeRows] = useState<MerchantProgrammeDropdownRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await merchantListProgrammes();
        if (cancelled) return;
        setProgrammeRows(mergeProgrammeDropdownRows(list ?? []));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load programmes");
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

  return { programmeRows: selectRows, selectOptions, loading };
}
