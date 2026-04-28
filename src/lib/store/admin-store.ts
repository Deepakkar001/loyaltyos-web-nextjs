import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AdminRole } from "@/types/onboarding";

interface AdminState {
  accessToken: string | null;
  adminUid: string | null;
  email: string | null;
  fullName: string | null;
  role: AdminRole | null;

  setSession: (data: {
    accessToken: string;
    adminUid: string;
    email: string;
    fullName: string;
    role: AdminRole;
  }) => void;
  logout: () => void;
}

const INITIAL_STATE = {
  accessToken: null,
  adminUid: null,
  email: null,
  fullName: null,
  role: null,
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setSession: (data) => {
        set({
          accessToken: data.accessToken,
          adminUid: data.adminUid,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("loyaltyos_admin_token", data.accessToken);
        }
      },

      logout: () => {
        set(INITIAL_STATE);
        if (typeof window !== "undefined") {
          localStorage.removeItem("loyaltyos_admin_token");
        }
      },
    }),
    {
      name: "loyaltyos-admin",
      partialize: (state) => ({
        accessToken: state.accessToken,
        adminUid: state.adminUid,
        email: state.email,
        fullName: state.fullName,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined" || !state) return;
        if (state.accessToken) {
          localStorage.setItem("loyaltyos_admin_token", state.accessToken);
        }
      },
    }
  )
);
