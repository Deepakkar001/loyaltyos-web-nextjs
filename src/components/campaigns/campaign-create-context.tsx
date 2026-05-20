"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  campaignToFormState,
  defaultCreateFormState,
  type CampaignFormState,
} from "@/lib/campaigns/campaign-form";
import { defaultEventSchemaDraft, type EventSchemaDraft } from "@/lib/programme/event-schema-merge";
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
  preserveOfferConfig?: CampaignOfferConfig;
  preserveTargetSegment?: CampaignTargetSegment;
  form: CampaignFormState;
  patch: (partial: Partial<CampaignFormState>) => void;
  eventSchemaDraft: EventSchemaDraft;
  setEventSchemaDraft: Dispatch<SetStateAction<EventSchemaDraft>>;
  /** Programme uid the event schema draft was bootstrapped or edited for (survives step navigation). */
  eventSchemaBootstrappedProgramme: string | null;
  setEventSchemaBootstrappedProgramme: Dispatch<SetStateAction<string | null>>;
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
  const [eventSchemaDraft, setEventSchemaDraft] = useState<EventSchemaDraft>(defaultEventSchemaDraft);
  const [eventSchemaBootstrappedProgramme, setEventSchemaBootstrappedProgramme] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!isCreate || reloadHandledRef.current) return;
    if (!isBrowserPageReload()) return;
    reloadHandledRef.current = true;
    if (tenantId) clearCampaignCreateDraft(tenantId);
    setForm(defaultCreateFormState());
    setEventSchemaDraft(defaultEventSchemaDraft());
    setEventSchemaBootstrappedProgramme(null);
  }, [isCreate, tenantId]);

  const patch = useCallback((partial: Partial<CampaignFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearDraft = useCallback(() => {
    if (tenantId) clearCampaignCreateDraft(tenantId);
    setEventSchemaDraft(defaultEventSchemaDraft());
    setEventSchemaBootstrappedProgramme(null);
  }, [tenantId]);

  useEffect(() => {
    if (initialCampaign) {
      setForm(campaignToFormState(initialCampaign));
    }
  }, [initialCampaign]);

  const value: CampaignFormContextValue = {
    mode,
    campaignUid,
    preserveOfferConfig: initialCampaign?.offerConfig,
    preserveTargetSegment: initialCampaign?.targetSegment,
    form,
    patch,
    eventSchemaDraft,
    setEventSchemaDraft,
    eventSchemaBootstrappedProgramme,
    setEventSchemaBootstrappedProgramme,
    clearDraft,
  };

  return <CampaignFormContext.Provider value={value}>{children}</CampaignFormContext.Provider>;
}
