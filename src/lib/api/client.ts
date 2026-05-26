import axios, { AxiosError, AxiosResponse } from "axios";
import {
  ApiErrorResponse,
  ApiKeyGeneratedResponse,
  LoginResponse,
  OnboardingMetadataResponse,
  ProgrammeConfigRequest,
  CreateProgrammeRequest,
  ProgrammeSummaryResponse,
  ProgrammeConfigBlobResponse,
  UpsertProgrammeConfigRequest,
  RegisterTenantRequest,
  SubmitAgreementRequest,
  TenantRegistrationResponse,
  TenantStatusResponse,
} from "@/types/onboarding";
import { getAccessToken, setAccessToken as setSessionAccessToken, clearSession } from "@/lib/auth/session";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { EarnRuleDetailResponse, EarnRuleResponse, RuleChangeLogResponse, RuleStatus, RuleUpsertRequest } from "@/types/rules";
import {
  CampaignEventSchemaUpsertRequest,
  CampaignParticipationResponse,
  CampaignResponse,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignUpsertRequest,
} from "@/types/campaigns";
import type {
  CohortRetentionRow,
  PointsActivityRow,
  RuleEffectivenessRow,
  RulePerformanceRow,
  SegmentAnalysisRow,
  TierDistributionRow,
  TierUpgradeCohortRow,
  TierVelocityBucketRow,
} from "@/types/analytics";
import { getApiBaseUrl } from "@/lib/api/get-api-base-url";
import { readMetadataCache, writeMetadataCache } from "@/lib/api/metadata-cache";

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true, // required for HttpOnly refresh cookie
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<LoginResponse> | null = null;

/** Thrown when refresh cookie is missing or expired (expected on /login or after logout). */
export class AuthSessionRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthSessionRequiredError";
  }
}

async function refreshSingleFlight(): Promise<LoginResponse> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await apiClient.post<LoginResponse>(
      "/api/v1/auth/refresh",
      {},
      {
        // 401 is normal when not logged in — avoid treating it as an axios transport error.
        validateStatus: (status) => status === 200 || status === 401,
      }
    );
    if (res.status === 401) {
      throw new AuthSessionRequiredError();
    }
    return res.data;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function ensureAuthSession(): Promise<LoginResponse> {
  const res = await refreshSingleFlight();
  const token = res.accessToken;
  setSessionAccessToken(token);
  const store = useOnboardingStore.getState();
  store.setAccessToken(token);
  store.setTenantId(res.tenantId);
  store.setRegistrationData({ email: res.email });
  store.syncStatusFromBackend(res.onboardingStatus);
  return res;
}

// Attach auth token to every authenticated request.
apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 once, then retry original request.
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorResponse>) => {
    const status = err.response?.status;
    const original = err.config as (typeof err.config & { _retry?: boolean });
    if (typeof window !== "undefined" && status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const res = await ensureAuthSession();
        const token = res.accessToken;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        return await apiClient.request(original);
      } catch {
        // Refresh failed: clear client session and persisted onboarding blob.
        clearSession();
        useOnboardingStore.getState().logout();
      }
    }
    throw err;
  }
);

// ─── Error handler ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  error: string;
  fieldErrors?: Record<string, string>;

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.status = response.status;
    this.error = response.error;
    this.fieldErrors = response.fieldErrors;
  }
}

function handleError(err: AxiosError<ApiErrorResponse>): never {
  if (err.response?.data) {
    throw new ApiError(err.response.data);
  }
  if (err.code === "ECONNABORTED") {
    throw new ApiError({
      timestamp: new Date().toISOString(),
      status: 408,
      error: "TIMEOUT",
      message: "Request timed out. Please check your connection and retry.",
      path: "",
    });
  }
  throw new ApiError({
    timestamp: new Date().toISOString(),
    status: 503,
    error: "NETWORK_ERROR",
    message: "Unable to reach the server. Please try again.",
    path: "",
  });
}

// ─── Onboarding API service ───────────────────────────────────────────────────

export const onboardingApi = {
  /** Auth — tenant admin login */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const res: AxiosResponse<LoginResponse> = await apiClient.post(
        "/api/v1/auth/login",
        { email, password }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  refresh: async (): Promise<LoginResponse> => {
    try {
      return await refreshSingleFlight();
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/api/v1/auth/logout", {});
    } catch {
      // Best effort; still clear local state on client side.
    }
  },
  /** Metadata — dropdown values for onboarding UI */
  getMetadata: async (): Promise<OnboardingMetadataResponse> => {
    const cached = readMetadataCache();
    if (cached) return cached;
    try {
      const res: AxiosResponse<OnboardingMetadataResponse> = await apiClient.get(
        "/api/v1/onboarding/metadata"
      );
      writeMetadataCache(res.data);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 1 — Register a new tenant */
  register: async (
    data: RegisterTenantRequest
  ): Promise<TenantRegistrationResponse> => {
    try {
      const res: AxiosResponse<TenantRegistrationResponse> = await apiClient.post(
        "/api/v1/onboarding/register",
        data
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 1 — Verify email with token from URL */
  verifyEmail: async (token: string): Promise<void> => {
    try {
      await apiClient.get("/api/v1/onboarding/verify-email", {
        params: { token },
      });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 1 — Verify email with 6-digit code */
  verifyEmailCode: async (email: string, code: string, newPassword?: string): Promise<void> => {
    try {
      await apiClient.post("/api/v1/onboarding/verify-email-code", { email, code, newPassword });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 1 — Resend verification email */
  resendVerification: async (email: string): Promise<void> => {
    try {
      await apiClient.post("/api/v1/onboarding/resend-verification", { email });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 1 (edit) — Update tenant profile fields (JWT) */
  updateMyProfile: async (data: {
    companyName: string;
    businessCategory: string;
    customBusinessCategory?: string;
    legalBusinessName?: string;
    businessRegistrationNo?: string;
    subCategory?: string;
    businessModel?: string;
    numberOfLocations?: number;
    countryCode: string;
    headquartersAddress?: string;
    founderNames?: string;
    yearFounded?: number;
    annualRevenueRange?: string;
    customerBaseSize?: number;
    paymentMethodsAccepted?: string;
    websiteUrl?: string;
    timezone?: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone?: string;
    primaryContactDesignation?: string;
  }): Promise<void> => {
    try {
      await apiClient.patch("/api/v1/me/profile", data);
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 2 — Update identity mode and data residency (JWT) */
  updateMyIdentity: async (data: { identityMode: string; dataResidencyRegion: string }): Promise<void> => {
    try {
      await apiClient.patch("/api/v1/me/identity", data);
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Any stage — Get my onboarding status (JWT) */
  getMyStatus: async (): Promise<TenantStatusResponse> => {
    try {
      const res: AxiosResponse<TenantStatusResponse> = await apiClient.get(
        "/api/v1/me/status"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 3 — Submit commercial agreement (JWT) */
  submitMyAgreement: async (data: SubmitAgreementRequest): Promise<void> => {
    try {
      await apiClient.post("/api/v1/me/agreement", data);
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 4 — Submit programme configuration */
  submitConfiguration: async (
    tenantId: string,
    data: ProgrammeConfigRequest
  ): Promise<void> => {
    try {
      await apiClient.post(
        `/api/v1/onboarding/${tenantId}/configuration`,
        data
      );
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Stage 5 — Generate sandbox API keys */
  generateSandboxKeys: async (
    tenantId: string
  ): Promise<ApiKeyGeneratedResponse> => {
    try {
      const res: AxiosResponse<ApiKeyGeneratedResponse> = await apiClient.post(
        `/api/v1/onboarding/${tenantId}/keys/sandbox`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  /** Setup Progress — mark rules complete */
  completeRulesSetup: async (): Promise<void> => {
    try {
      await apiClient.post("/api/v1/me/setup/rules/complete", {});
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

// ─── New dashboard APIs (Steps 4–6) ───────────────────────────────────────────

export const tenantConfigApi = {
  getMyConfig: async () => {
    try {
      const res = await apiClient.get("/api/v1/me/config");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  saveMyConfig: async (data: ProgrammeConfigRequest) => {
    try {
      const res = await apiClient.post("/api/v1/me/config", data);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export const programmeApiV2 = {
  listProgrammes: async (): Promise<ProgrammeSummaryResponse[]> => {
    try {
      const res = await apiClient.get<ProgrammeSummaryResponse[]>("/api/v2/programmes");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  createProgramme: async (data: CreateProgrammeRequest): Promise<ProgrammeSummaryResponse> => {
    try {
      const res = await apiClient.post<ProgrammeSummaryResponse>("/api/v2/programmes", data);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getProgrammeConfig: async (programmeUid: string): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.get<ProgrammeConfigBlobResponse>(`/api/v2/programmes/${programmeUid}/config`);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  upsertProgrammeConfig: async (
    programmeUid: string,
    data: UpsertProgrammeConfigRequest
  ): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.put<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${programmeUid}/config`,
        data
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export const integrationApi = {
  generateSandboxCredentials: async () => {
    try {
      const res: AxiosResponse<ApiKeyGeneratedResponse> = await apiClient.post(
        "/api/v1/me/integration/credentials/SANDBOX"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  generateProductionCredentials: async () => {
    try {
      const res: AxiosResponse<ApiKeyGeneratedResponse> = await apiClient.post(
        "/api/v1/me/integration/credentials/PRODUCTION"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getCredentialSummaries: async () => {
    try {
      const res = await apiClient.get("/api/v1/me/integration/credentials");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  validateSandboxEvent: async (payloadJson: string, ruleUid?: string) => {
    try {
      const res = await apiClient.post("/api/v1/me/integration/sandbox/validate-event", { payloadJson, ruleUid });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export const goLiveApi = {
  getChecklist: async () => {
    try {
      const res = await apiClient.get("/api/v1/me/go-live/checklist");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  activate: async () => {
    try {
      const res = await apiClient.post("/api/v1/me/go-live/activate", {});
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

// ─── Rule Engine (tenant admin) ───────────────────────────────────────────────

export const loyaltyRulesAdminApi = {
  listRules: async (
    programmeUid: string = "default",
    ruleType?: "PROGRAMME" | "CAMPAIGN"
  ): Promise<EarnRuleResponse[]> => {
    try {
      const res = await apiClient.get<EarnRuleResponse[]>("/api/v1/engine/rule/admin/rules", {
        params: { programmeUid, ...(ruleType ? { ruleType } : {}) },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getRule: async (ruleUid: string, programmeUid = "default"): Promise<EarnRuleDetailResponse> => {
    try {
      const res = await apiClient.get<EarnRuleDetailResponse>(`/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}`, {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getChangeHistory: async (ruleUid: string, programmeUid = "default"): Promise<RuleChangeLogResponse[]> => {
    try {
      const res = await apiClient.get<RuleChangeLogResponse[]>(
        `/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}/change-history`,
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  createRule: async (payload: RuleUpsertRequest): Promise<EarnRuleResponse> => {
    try {
      const res = await apiClient.post<EarnRuleResponse>("/api/v1/engine/rule/admin/rules", payload);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  updateRule: async (ruleUid: string, programmeUid: string, payload: RuleUpsertRequest): Promise<EarnRuleResponse> => {
    try {
      const res = await apiClient.put<EarnRuleResponse>(`/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}`, payload, {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  patchStatus: async (ruleUid: string, programmeUid: string, status: RuleStatus): Promise<EarnRuleResponse> => {
    try {
      const res = await apiClient.patch<EarnRuleResponse>(
        `/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}/status`,
        { status },
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  archiveRule: async (ruleUid: string, programmeUid: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}`, {
        params: { programmeUid },
      });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

// ─── Campaign admin ───────────────────────────────────────────────────────────

export const campaignsAdminApi = {
  listCampaigns: async (params?: {
    programmeUid?: string;
    status?: CampaignStatus;
  }): Promise<CampaignResponse[]> => {
    try {
      const res = await apiClient.get<CampaignResponse[]>("/api/v1/campaigns/admin/campaigns", { params });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getCampaign: async (campaignUid: string): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.get<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getCampaignEventSchema: async (campaignUid: string): Promise<Record<string, unknown>> => {
    try {
      const res = await apiClient.get<Record<string, unknown>>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  upsertCampaignEventSchema: async (
    campaignUid: string,
    payload: CampaignEventSchemaUpsertRequest
  ): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.put<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema`,
        payload
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  createCampaign: async (payload: CampaignUpsertRequest): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.post<CampaignResponse>("/api/v1/campaigns/admin/campaigns", payload);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  updateCampaign: async (campaignUid: string, payload: CampaignUpsertRequest): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.put<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}`,
        payload
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  activateCampaign: async (campaignUid: string): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.post<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/activate`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  pauseCampaign: async (campaignUid: string): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.post<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/pause`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  endCampaign: async (campaignUid: string): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.post<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/end`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getStats: async (campaignUid: string): Promise<CampaignStatsResponse> => {
    try {
      const res = await apiClient.get<CampaignStatsResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/stats`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listParticipations: async (campaignUid: string, limit = 50): Promise<CampaignParticipationResponse[]> => {
    try {
      const res = await apiClient.get<CampaignParticipationResponse[]>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/participations`,
        { params: { limit } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

// ─── Analytics (tenant dashboard) ─────────────────────────────────────────────

export const analyticsApi = {
  getPointsActivity: async (from: string, to: string, programmeUid = "default"): Promise<PointsActivityRow[]> => {
    try {
      const res = await apiClient.get<PointsActivityRow[]>("/api/v1/analytics/points-activity", {
        params: { from, to, programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getRulePerformance: async (from: string, to: string, programmeUid = "default"): Promise<RulePerformanceRow[]> => {
    try {
      const res = await apiClient.get<RulePerformanceRow[]>("/api/v1/analytics/rule-performance", {
        params: { from, to, programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTierDistribution: async (programmeUid = "default"): Promise<TierDistributionRow[]> => {
    try {
      const res = await apiClient.get<TierDistributionRow[]>("/api/v1/analytics/tier-distribution", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getEngagementSegments: async (programmeUid = "default"): Promise<SegmentAnalysisRow[]> => {
    try {
      const res = await apiClient.get<SegmentAnalysisRow[]>("/api/v1/analytics/segments/engagement", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getBalanceBrackets: async (programmeUid = "default"): Promise<SegmentAnalysisRow[]> => {
    try {
      const res = await apiClient.get<SegmentAnalysisRow[]>("/api/v1/analytics/segments/balance-brackets", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getRetentionCohort: async (programmeUid = "default"): Promise<CohortRetentionRow[]> => {
    try {
      const res = await apiClient.get<CohortRetentionRow[]>("/api/v1/analytics/cohorts/retention", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTierUpgradeCohort: async (programmeUid = "default"): Promise<TierUpgradeCohortRow[]> => {
    try {
      const res = await apiClient.get<TierUpgradeCohortRow[]>("/api/v1/analytics/cohorts/tier-upgrade", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTierVelocity: async (tierName: string, programmeUid = "default"): Promise<TierVelocityBucketRow[]> => {
    try {
      const res = await apiClient.get<TierVelocityBucketRow[]>("/api/v1/analytics/cohorts/tier-velocity", {
        params: { tierName, programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getRuleEffectiveness: async (
    ruleUid: string,
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<RuleEffectivenessRow[]> => {
    try {
      const res = await apiClient.get<RuleEffectivenessRow[]>("/api/v1/analytics/cohorts/rule-effectiveness", {
        params: { ruleUid, from, to, programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  downloadExport: async (path: string, params: Record<string, string>, filename: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/api/v1/analytics/export/${path}`, {
        params,
        responseType: "blob",
      });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  downloadRuleConfig: async (programmeUid = "default", filename = "rule-config.json"): Promise<void> => {
    try {
      const res = await apiClient.get("/api/v1/analytics/export/rule-config", {
        params: { programmeUid },
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};
