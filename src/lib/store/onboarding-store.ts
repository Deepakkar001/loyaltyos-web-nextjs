import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { setAccessToken as setSessionAccessToken, clearSession } from "@/lib/auth/session";
import { createExpiringLocalStorage } from "@/lib/store/expiring-storage";
import {
  ApiKeyGeneratedResponse,
  OnboardingStatus,
  ProgrammeConfigRequest,
  RegisterTenantRequest,
  STATUS_TO_STEP,
  SubmitAgreementRequest,
  WizardStep,
} from "@/types/onboarding";

interface OnboardingState {
  // Tenant identity (set after successful registration)
  tenantId: string | null;
  companyName: string | null;
  email: string | null;
  onboardingStatus: OnboardingStatus | null;
  accessToken: string | null;

  // Current wizard position (backend-driven)
  currentStep: WizardStep;
  // Manual override for backward navigation (null = use currentStep)
  displayStep: WizardStep | null;

  // Step 1 form data (held in store so user can go back and edit)
  registrationData: Partial<RegisterTenantRequest>;

  // Step 3 form data
  agreementData: Partial<SubmitAgreementRequest>;

  // Step 4 form data
  programmeData: Partial<ProgrammeConfigRequest>;

  // Step 5 — API keys (held in memory session ONLY — never persisted to localStorage)
  generatedKeys: ApiKeyGeneratedResponse | null;

  // UI state
  isSubmitting: boolean;
  submitError: string | null;

  // Actions
  setTenantId: (id: string) => void;
  setAccessToken: (token: string | null) => void;
  setRegistrationData: (data: Partial<RegisterTenantRequest>) => void;
  setAgreementData: (data: Partial<SubmitAgreementRequest>) => void;
  setProgrammeData: (data: Partial<ProgrammeConfigRequest>) => void;
  setGeneratedKeys: (keys: ApiKeyGeneratedResponse | null) => void;
  syncStatusFromBackend: (status: OnboardingStatus) => void;
  setDisplayStep: (step: WizardStep | null) => void;
  setSubmitting: (v: boolean) => void;
  setSubmitError: (msg: string | null) => void;
  reset: () => void;
  logout: () => void;
}

const INITIAL_STATE = {
  tenantId: null,
  companyName: null,
  email: null,
  onboardingStatus: null,
  accessToken: null,
  currentStep: "account" as WizardStep,
  displayStep: null as WizardStep | null,
  registrationData: {},
  agreementData: {},
  programmeData: {},
  generatedKeys: null,
  isSubmitting: false,
  submitError: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setTenantId: (id) => {
        set({ tenantId: id });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
        if (typeof window !== "undefined") setSessionAccessToken(token);
      },

      setRegistrationData: (data) =>
        set((s) => ({
          registrationData: { ...s.registrationData, ...data },
          companyName: data.companyName ?? s.companyName,
          email: data.email ?? s.email,
        })),

      setAgreementData: (data) =>
        set((s) => ({ agreementData: { ...s.agreementData, ...data } })),

      setProgrammeData: (data) =>
        set((s) => ({ programmeData: { ...s.programmeData, ...data } })),

      // IMPORTANT: generated keys are NOT persisted (not in the persist() include list)
      setGeneratedKeys: (keys) => set({ generatedKeys: keys }),

      syncStatusFromBackend: (status) =>
        set({
          onboardingStatus: status,
          currentStep: STATUS_TO_STEP[status],
          displayStep: null,
        }),

      setDisplayStep: (step) => set({ displayStep: step }),

      setSubmitting: (v) => set({ isSubmitting: v }),
      setSubmitError: (msg) => set({ submitError: msg }),
      reset: () => set(INITIAL_STATE),
      logout: () => {
        set(INITIAL_STATE);
        if (typeof window !== "undefined") {
          clearSession();
          localStorage.removeItem("loyaltyos_access_token");
          localStorage.removeItem("loyaltyos_tenant_id");
        }
      },
    }),
    {
      name: "loyaltyos-onboarding",
      partialize: (state) => ({
        tenantId: state.tenantId,
        companyName: state.companyName,
        email: state.email,
        onboardingStatus: state.onboardingStatus,
        currentStep: state.currentStep,
      }) as Partial<OnboardingState>,
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined" || !state) return;
        // Enforce that auth is not restored from localStorage.
        clearSession();
        localStorage.removeItem("loyaltyos_access_token");
        localStorage.removeItem("loyaltyos_tenant_id");
      },
      storage:
        typeof window === "undefined"
          ? undefined
          : createJSONStorage(() => createExpiringLocalStorage(24 * 60 * 60 * 1000)),
    }
  )
);
