"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MerchantAuthResponse, MerchantResponse } from "@/types/merchant";
import {
  clearMerchantToken,
  getMerchantToken,
  setMerchantToken,
} from "@/lib/api/merchant";

type MerchantAuthState = {
  accessToken: string | null;
  tenantId: string | null;
  merchantUid: string | null;
  merchantName: string | null;
  email: string | null;
  mustChangePassword: boolean;
  profile: MerchantResponse | null;
  setSession: (auth: MerchantAuthResponse) => void;
  setProfile: (profile: MerchantResponse) => void;
  setMustChangePassword: (value: boolean) => void;
  clearSession: () => void;
  hydrateFromStorage: () => void;
};

export const useMerchantAuthStore = create<MerchantAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tenantId: null,
      merchantUid: null,
      merchantName: null,
      email: null,
      mustChangePassword: false,
      profile: null,
      setSession: (auth) => {
        setMerchantToken(auth.accessToken);
        set({
          accessToken: auth.accessToken,
          tenantId: auth.tenantId,
          merchantUid: auth.merchantUid,
          merchantName: auth.merchantName,
          mustChangePassword: auth.mustChangePassword === true,
        });
      },
      setProfile: (profile) => set({ profile }),
      setMustChangePassword: (value) => set({ mustChangePassword: value }),
      clearSession: () => {
        clearMerchantToken();
        set({
          accessToken: null,
          tenantId: null,
          merchantUid: null,
          merchantName: null,
          email: null,
          mustChangePassword: false,
          profile: null,
        });
      },
      hydrateFromStorage: () => {
        const token = getMerchantToken();
        if (token) {
          set({ accessToken: token });
        }
      },
    }),
    {
      name: "loyaltyos-merchant-auth",
      partialize: (s) => ({
        tenantId: s.tenantId,
        merchantUid: s.merchantUid,
        merchantName: s.merchantName,
        mustChangePassword: s.mustChangePassword,
      }),
    }
  )
);
