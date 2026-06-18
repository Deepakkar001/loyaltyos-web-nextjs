"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { merchantApi } from "@/lib/api/merchant";
import type { MerchantResponse } from "@/types/merchant";

type MerchantOnboardingContextValue = {
  merchantUid: string;
  merchant: MerchantResponse | null;
  loading: boolean;
  refreshMerchant: () => Promise<MerchantResponse | null>;
};

const MerchantOnboardingContext = createContext<MerchantOnboardingContextValue | null>(null);

export function MerchantOnboardingProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const merchantUid = typeof params.merchantUid === "string" ? params.merchantUid : "";
  const [merchant, setMerchant] = useState<MerchantResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMerchant = useCallback(async () => {
    if (!merchantUid) {
      setMerchant(null);
      return null;
    }
    try {
      const next = await merchantApi.get(merchantUid);
      setMerchant(next);
      return next;
    } catch {
      setMerchant(null);
      return null;
    }
  }, [merchantUid]);

  useEffect(() => {
    if (!merchantUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refreshMerchant()
      .then((m) => {
        if (!m) router.replace("/dashboard/configure/merchants");
      })
      .finally(() => setLoading(false));
  }, [merchantUid, pathname, refreshMerchant, router]);

  const value = useMemo(
    () => ({ merchantUid, merchant, loading, refreshMerchant }),
    [merchantUid, merchant, loading, refreshMerchant]
  );

  return (
    <MerchantOnboardingContext.Provider value={value}>{children}</MerchantOnboardingContext.Provider>
  );
}

export function useMerchantOnboarding(): MerchantOnboardingContextValue {
  const ctx = useContext(MerchantOnboardingContext);
  if (!ctx) {
    throw new Error("useMerchantOnboarding must be used within MerchantOnboardingProvider");
  }
  return ctx;
}
