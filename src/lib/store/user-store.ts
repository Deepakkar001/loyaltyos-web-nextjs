import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  fullName: string | null;
  setFullName: (fullName: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      fullName: null,
      setFullName: (fullName) => set({ fullName }),
      logout: () => set({ fullName: null }),
    }),
    {
      name: "loyaltyos-user",
      partialize: (state) => ({ fullName: state.fullName }),
    }
  )
);
