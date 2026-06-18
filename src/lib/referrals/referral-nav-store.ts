import { create } from "zustand";

type ReferralNavState = {
  fraudQueueCount: number;
  setFraudQueueCount: (count: number) => void;
};

export const useReferralNavStore = create<ReferralNavState>((set) => ({
  fraudQueueCount: 0,
  setFraudQueueCount: (count) => set({ fraudQueueCount: Math.max(0, count) }),
}));
