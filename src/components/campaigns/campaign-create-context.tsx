"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  campaignToFormState,
  defaultCreateFormState,
  type CampaignFormState,
} from "@/lib/campaigns/campaign-form";
import {
  clearCampaignCreateDraft,
  isBrowserPageReload,
} from "@/lib/store/campaign-draft-storage";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type {
  CampaignOfferConfig,
  CampaignResponse,
  CampaignTargetSegment,
} from "@/types/campaigns";

export type CampaignFormMode = "create" | "edit";

type CampaignFormContextValue = {
  mode: CampaignFormMode;
  campaignUid?: string;
  editProgrammeUid?: string;
  preserveOfferConfig?: CampaignOfferConfig;
  preserveTargetSegment?: CampaignTargetSegment;
  form: CampaignFormState;
  patch: (partial: Partial<CampaignFormState>) => void;
  clearDraft: () => void;
};

const CampaignFormContext = createContext<CampaignFormContextValue | null>(null);

export function useCampaignForm() {
  const ctx = useContext(CampaignFormContext);
  if (!ctx) throw new Error("useCampaignForm must be used within CampaignFormProvider");
  return ctx;
}

export function CampaignFormProvider({
  mode,
  campaignUid,
  initialCampaign,
  children,
}: {
  mode: CampaignFormMode;
  campaignUid?: string;
  initialCampaign?: CampaignResponse;
  children: ReactNode;
}) {
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const isCreate = mode === "create";
  const reloadHandledRef = useRef(false);

  const [form, setForm] = useState<CampaignFormState>(() => {
    if (initialCampaign) return campaignToFormState(initialCampaign);
    return defaultCreateFormState();
  });

  useEffect(() => {
    if (!isCreate || reloadHandledRef.current) return;
    if (!isBrowserPageReload()) return;
    reloadHandledRef.current = true;
    if (tenantId) clearCampaignCreateDraft(tenantId);
    setForm(defaultCreateFormState());
  }, [isCreate, tenantId]);

  const patch = useCallback((partial: Partial<CampaignFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearDraft = useCallback(() => {
    if (tenantId) clearCampaignCreateDraft(tenantId);
  }, [tenantId]);

  useEffect(() => {
    if (initialCampaign) {
      setForm(campaignToFormState(initialCampaign));
    }
  }, [initialCampaign]);

  const value: CampaignFormContextValue = {
    mode,
    campaignUid,
    editProgrammeUid: initialCampaign?.programmeUid,
    preserveOfferConfig: initialCampaign?.offerConfig,
    preserveTargetSegment: initialCampaign?.targetSegment,
    form,
    patch,
    clearDraft,
  };

  return <CampaignFormContext.Provider value={value}>{children}</CampaignFormContext.Provider>;
}
