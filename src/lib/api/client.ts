import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}
import {
  ApiErrorResponse,
  ApiKeyGeneratedResponse,
  LoginResponse,
  OnboardingMetadataResponse,
  ProgrammeConfigRequest,
  CreateProgrammeRequest,
  ProgrammeSummaryResponse,
  ProgrammeStatusPatchRequest,
  ProgrammeConfigBlobResponse,
  RewardCatalogRecoveryResponse,
  PortalRewardCatalogResponse,
  UpsertProgrammeConfigRequest,
  RegisterTenantRequest,
  SubmitAgreementRequest,
  TenantRegistrationResponse,
  TenantStatusResponse,
} from "@/types/onboarding";
import type {
  CouponCreateRequest,
  CouponRedemptionListItem,
  CouponResponse,
  CouponUsageReportResponse,
} from "@/types/coupon";
import { dispatchSessionRefreshed } from "@/lib/auth/session-events";
import { getAccessToken, setAccessToken as setSessionAccessToken, clearSession } from "@/lib/auth/session";
import { EarnRuleDetailResponse, EarnRuleResponse, RuleChangeLogResponse, RuleStatus, RuleUpsertRequest } from "@/types/rules";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useUserStore } from "@/lib/store/user-store";
import {
  CampaignEventSchemaUpsertRequest,
  CampaignParticipationResponse,
  CampaignPerformanceReportResponse,
  CampaignResponse,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignTargetCustomerPageResponse,
  CampaignTargetUploadResponse,
  CampaignTargetUploadSpecResponse,
  CampaignUpsertRequest,
} from "@/types/campaigns";
import type {
  AccrualRedemptionReconciliationResponse,
  BreakageExpiryReportResponse,
  FailedAccrualRedemptionReportResponse,
  LiabilityReportResponse,
  ReversalsAdjustmentsReportResponse,
  SlaPerformanceReportResponse,
  CohortRetentionRow,
  EnrollmentReportResponse,
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
import type {
  VoucherBatchDetail,
  VoucherBatchListItem,
  VoucherBatchUploadResponse,
  VoucherStockResponse,
  VoucherUploadSpecResponse,
  DenominationMappingItem,
  DenominationMappingsResponse,
  VoucherStockBreakdownResponse,
} from "@/types/voucher";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
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
  store.setMustChangePassword(res.mustChangePassword === true);
  store.syncStatusFromBackend(res.onboardingStatus);
  useUserStore.getState().setFullName(res.fullName ?? null);
  dispatchSessionRefreshed();
  return res;
}

// Attach auth token to every authenticated request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined" || config.skipAuth) return config;
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 once, then retry original request.
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorResponse>) => {
    const status = err.response?.status;
    const original = err.config as (typeof err.config & { _retry?: boolean; skipAuth?: boolean });
    if (
      typeof window !== "undefined" &&
      status === 401 &&
      original &&
      !original._retry &&
      !original.skipAuth
    ) {
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

export type EventDefinitionApiPayload = {
  eventType: string;
  coreFields: Array<{ name: string; type: string; required: boolean }>;
};

export type EventSchemaSettingsApiPayload = {
  version?: number;
  backwardCompatibilityDays?: number;
  customFields?: Array<Record<string, unknown>>;
};

/** Reads message from standard ErrorResponse or voucher upload error bodies. */
function messageFromResponseData(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  if (typeof record.errorMessage === "string" && record.errorMessage.trim()) {
    return record.errorMessage;
  }
  return undefined;
}

function handleError(err: AxiosError<ApiErrorResponse>): never {
  const data = err.response?.data;
  const parsedMessage = messageFromResponseData(data);
  if (data && typeof data === "object" && parsedMessage) {
    const record = data as unknown as Record<string, unknown>;
    throw new ApiError({
      timestamp: typeof record.timestamp === "string" ? record.timestamp : new Date().toISOString(),
      status: err.response?.status ?? 400,
      error: typeof record.error === "string" ? record.error : "REQUEST_FAILED",
      message: parsedMessage,
      path: typeof record.path === "string" ? record.path : "",
      fieldErrors:
        record.fieldErrors && typeof record.fieldErrors === "object"
          ? (record.fieldErrors as Record<string, string>)
          : undefined,
    });
  }
  if (data && typeof data === "object" && "message" in data) {
    throw new ApiError(data as ApiErrorResponse);
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
  acceptInvite: async (email: string, token: string, password: string): Promise<LoginResponse> => {
    try {
      const res: AxiosResponse<LoginResponse> = await apiClient.post(
        "/api/v1/auth/accept-invite",
        { email, token, password },
        { skipAuth: true }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<LoginResponse> => {
    try {
      const res: AxiosResponse<LoginResponse> = await apiClient.post("/api/v1/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
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
  renameProgramme: async (
    programmeUid: string,
    data: CreateProgrammeRequest
  ): Promise<ProgrammeSummaryResponse> => {
    try {
      const res = await apiClient.patch<ProgrammeSummaryResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}`,
        data
      );
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
  previewRewardCatalogRecovery: async (programmeUid: string): Promise<RewardCatalogRecoveryResponse> => {
    try {
      const res = await apiClient.get<RewardCatalogRecoveryResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/reward-catalog/recovery`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  restoreRewardCatalog: async (programmeUid: string): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.post<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/reward-catalog/restore`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getMergedRewardCatalog: async (programmeUid: string): Promise<PortalRewardCatalogResponse> => {
    try {
      const res = await apiClient.get<PortalRewardCatalogResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/reward-catalog`
      );
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
  patchProgrammeEventDefinition: async (
    programmeUid: string,
    eventType: string,
    body: EventDefinitionApiPayload
  ): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.patch<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/event-schema/events/${encodeURIComponent(eventType)}`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  addProgrammeEventDefinition: async (
    programmeUid: string,
    body: EventDefinitionApiPayload
  ): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.post<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/event-schema/events`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  removeProgrammeEventDefinition: async (
    programmeUid: string,
    eventType: string
  ): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.delete<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/event-schema/events/${encodeURIComponent(eventType)}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  patchProgrammeEventSchemaSettings: async (
    programmeUid: string,
    body: EventSchemaSettingsApiPayload
  ): Promise<ProgrammeConfigBlobResponse> => {
    try {
      const res = await apiClient.patch<ProgrammeConfigBlobResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/config/event-schema/settings`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  patchProgrammeStatus: async (
    programmeUid: string,
    data: ProgrammeStatusPatchRequest
  ): Promise<ProgrammeSummaryResponse> => {
    try {
      const res = await apiClient.patch<ProgrammeSummaryResponse>(
        `/api/v2/programmes/${encodeURIComponent(programmeUid)}/status`,
        data
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  archiveProgramme: async (programmeUid: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v2/programmes/${encodeURIComponent(programmeUid)}`);
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
  getRuleSandboxStatus: async (ruleUid: string) => {
    try {
      const res = await apiClient.get(
        `/api/v1/engine/rule/admin/rules/${encodeURIComponent(ruleUid)}/sandbox-status`
      );
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
  getCampaignSetupStatus: async (campaignUid: string) => {
    try {
      const res = await apiClient.get(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/setup-status`
      );
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
  patchCampaignEventDefinition: async (
    campaignUid: string,
    eventType: string,
    body: EventDefinitionApiPayload
  ): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.patch<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema/events/${encodeURIComponent(eventType)}`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  addCampaignEventDefinition: async (
    campaignUid: string,
    body: EventDefinitionApiPayload
  ): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.post<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema/events`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  removeCampaignEventDefinition: async (
    campaignUid: string,
    eventType: string
  ): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.delete<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema/events/${encodeURIComponent(eventType)}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  patchCampaignEventSchemaSettings: async (
    campaignUid: string,
    body: EventSchemaSettingsApiPayload
  ): Promise<CampaignResponse> => {
    try {
      const res = await apiClient.patch<CampaignResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/event-schema/settings`,
        body
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
  getPerformanceReport: async (
    programmeUid: string,
    from: string,
    to: string
  ): Promise<CampaignPerformanceReportResponse> => {
    try {
      const res = await apiClient.get<CampaignPerformanceReportResponse>(
        "/api/v1/campaigns/admin/reports/performance",
        { params: { programmeUid, from, to } }
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
  getTargetUploadSpec: async (): Promise<CampaignTargetUploadSpecResponse> => {
    try {
      const res = await apiClient.get<CampaignTargetUploadSpecResponse>(
        "/api/v1/campaigns/admin/campaigns/target-customers/upload-spec"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  uploadTargetCustomers: async (
    campaignUid: string,
    file: File
  ): Promise<CampaignTargetUploadResponse> => {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiClient.post<CampaignTargetUploadResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/target-customers/upload`,
        form,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 }
      );
      const body = res.data;
      if (body?.status === "FAILED" && body.errorMessage) {
        throw new ApiError({
          timestamp: new Date().toISOString(),
          status: res.status,
          error: "UPLOAD_FAILED",
          message: body.errorMessage,
          path: `/api/v1/campaigns/admin/campaigns/${campaignUid}/target-customers/upload`,
        });
      }
      return body;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listTargetCustomers: async (
    campaignUid: string,
    params?: { page?: number; size?: number; search?: string }
  ): Promise<CampaignTargetCustomerPageResponse> => {
    try {
      const res = await apiClient.get<CampaignTargetCustomerPageResponse>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/target-customers`,
        { params }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  removeTargetCustomer: async (campaignUid: string, customerId: string): Promise<void> => {
    try {
      await apiClient.delete(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/target-customers/${encodeURIComponent(customerId)}`
      );
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listTargetUploads: async (campaignUid: string): Promise<CampaignTargetUploadResponse[]> => {
    try {
      const res = await apiClient.get<CampaignTargetUploadResponse[]>(
        `/api/v1/campaigns/admin/campaigns/${encodeURIComponent(campaignUid)}/target-customers/uploads`
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
  getBreakageExpiryReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<BreakageExpiryReportResponse> => {
    try {
      const res = await apiClient.get<BreakageExpiryReportResponse>(
        "/api/v1/analytics/reports/breakage-expiry",
        { params: { from, to, programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getEnrollmentReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<EnrollmentReportResponse> => {
    try {
      const res = await apiClient.get<EnrollmentReportResponse>(
        "/api/v1/analytics/reports/enrollment",
        { params: { from, to, programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getAccrualRedemptionReconciliation: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<AccrualRedemptionReconciliationResponse> => {
    try {
      const res = await apiClient.get<AccrualRedemptionReconciliationResponse>(
        "/api/v1/analytics/reports/accrual-redemption-reconciliation",
        { params: { from, to, programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getLiabilityReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<LiabilityReportResponse> => {
    try {
      const res = await apiClient.get<LiabilityReportResponse>("/api/v1/analytics/reports/liability", {
        params: { from, to, programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getFailedAccrualsRedemptionsReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<FailedAccrualRedemptionReportResponse> => {
    try {
      const res = await apiClient.get<FailedAccrualRedemptionReportResponse>(
        "/api/v1/analytics/reports/failed-accruals-redemptions",
        { params: { from, to, programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getReversalsAdjustmentsReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<ReversalsAdjustmentsReportResponse> => {
    try {
      const res = await apiClient.get<ReversalsAdjustmentsReportResponse>(
        "/api/v1/analytics/reports/reversals-adjustments",
        { params: { from, to, programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getSlaPerformanceReport: async (
    from: string,
    to: string,
    programmeUid = "default"
  ): Promise<SlaPerformanceReportResponse> => {
    try {
      const res = await apiClient.get<SlaPerformanceReportResponse>(
        "/api/v1/analytics/reports/sla-performance",
        { params: { from, to, programmeUid } }
      );
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

export const voucherApi = {
  getUploadSpec: async (): Promise<VoucherUploadSpecResponse> => {
    try {
      const res = await apiClient.get<VoucherUploadSpecResponse>("/api/v1/me/vouchers/upload-spec");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  uploadBatch: async (
    programmeUid: string,
    catalogRewardUid: string,
    file: File,
    partnerUid?: string
  ): Promise<VoucherBatchUploadResponse> => {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("programmeUid", programmeUid);
      form.append("catalogRewardUid", catalogRewardUid);
      if (partnerUid?.trim()) {
        form.append("partnerUid", partnerUid.trim());
      }
      const res = await apiClient.post<VoucherBatchUploadResponse>(
        "/api/v1/me/vouchers/batches/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 }
      );
      const body = res.data;
      if (body?.status === "ERROR" && body.errorMessage) {
        throw new ApiError({
          timestamp: new Date().toISOString(),
          status: res.status,
          error: "UPLOAD_FAILED",
          message: body.errorMessage,
          path: "/api/v1/me/vouchers/batches/upload",
        });
      }
      return body;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listBatches: async (params?: {
    programmeUid?: string;
    catalogRewardUid?: string;
  }): Promise<VoucherBatchListItem[]> => {
    try {
      const res = await apiClient.get<VoucherBatchListItem[]>("/api/v1/me/vouchers/batches", {
        params: {
          programmeUid: params?.programmeUid,
          catalogRewardUid: params?.catalogRewardUid,
        },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getBatch: async (batchUid: string): Promise<VoucherBatchDetail> => {
    try {
      const res = await apiClient.get<VoucherBatchDetail>(`/api/v1/me/vouchers/batches/${encodeURIComponent(batchUid)}`);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getStockBreakdown: async (
    catalogRewardUid: string,
    programmeUid: string
  ): Promise<VoucherStockBreakdownResponse> => {
    try {
      const res = await apiClient.get<VoucherStockBreakdownResponse>(
        `/api/v1/me/vouchers/denominations/${encodeURIComponent(catalogRewardUid)}/stock`,
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getStock: async (catalogRewardUid: string, programmeUid: string): Promise<VoucherStockResponse> => {
    try {
      const res = await apiClient.get<VoucherStockResponse>(
        `/api/v1/me/vouchers/stock/${encodeURIComponent(catalogRewardUid)}`,
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export type ReferralRewardType = "POINTS" | "VOUCHER";

export type ReferralPartyRewardConfig = {
  type?: ReferralRewardType;
  points?: number;
  catalogRewardUid?: string;
  voucherFaceValue?: number;
  voucherPointsToRedeem?: number;
};

export type ReferralPointsBudget = {
  maxPoints?: number;
  period?: "LIFETIME" | "CALENDAR_MONTH" | "ROLLING_DAY";
  windowDays?: number;
};

export type ReferralStageConfig = {
  stage: number;
  type: string;
  condition?: Record<string, unknown>;
  referrerPoints?: number;
  refereePoints?: number;
  maxReferrerAwardsForStage?: number;
  referrerReward?: ReferralPartyRewardConfig;
  refereeReward?: ReferralPartyRewardConfig;
};

export type ReferralEligibilityRules = {
  refereeMustBeNewCustomer?: boolean;
  referrerMustHaveLedgerActivity?: boolean;
};

export type ReferralCapRule = {
  type: "LIFETIME_REFERRALS" | "CALENDAR_MONTH_REFERRALS" | "ROLLING_DAY_REFERRALS";
  maxCount?: number;
  windowDays?: number;
};

export type ReferralFraudPolicy = {
  blockSelfReferralByCustomerId?: boolean;
  maxReferralsPer24Hours?: number;
  matchPhoneWhenProvided?: boolean;
  matchEmailWhenProvided?: boolean;
  matchDeviceWhenProvided?: boolean;
};

export type ReferralRuleCriteria = {
  windowDays?: number;
  minPurchaseCount?: number;
  minSpend?: number;
  firstPurchaseOnly?: boolean;
  merchantId?: string;
  category?: string;
  channel?: string;
  sku?: string;
  region?: string;
  eventTypes?: string[];
  /** Optional equality filters on event metadata (schema fields not mapped to first-class keys). */
  metadataFilters?: Record<string, string>;
};

export type ReferralMilestoneRule = {
  key: string;
  label: string;
  description?: string;
  enabled?: boolean;
  trigger: "LINK" | "PURCHASE" | "INTEGRATION_EVENT";
  criteria?: ReferralRuleCriteria;
};

export type ReferralMilestoneTypeInfo = {
  value: string;
  label: string;
  description?: string;
  trigger?: string;
  custom?: boolean;
  enabled?: boolean;
};

export type ReferralRuleSchemaResponse = {
  triggers: { value: string; label: string; description?: string }[];
  criteriaFields: {
    key: string;
    label: string;
    type: string;
    hint?: string;
    purchaseOnly?: boolean;
  }[];
  programmeUid?: string;
  programmeEventTypes?: string[];
  criteriaFieldsByEvent?: Record<
    string,
    { key: string; label: string; type: string; hint?: string; purchaseOnly?: boolean }[]
  >;
  templates: {
    key: string;
    label: string;
    description?: string;
    trigger: string;
    criteriaDefaults?: Record<string, unknown>;
  }[];
};

export type ReferralProgrammeConfig = {
  stages: ReferralStageConfig[];
  milestoneRules?: ReferralMilestoneRule[];
  eligibility?: ReferralEligibilityRules;
  capRules?: ReferralCapRule[];
  fraudPolicy?: ReferralFraudPolicy;
  pointsBudget?: ReferralPointsBudget;
};

export type ReferralProgrammeResponse = {
  programmeUid: string;
  name: string;
  status: string;
  validFrom?: string;
  validUntil?: string;
  maxReferralsPerCustomer: number;
  config: ReferralProgrammeConfig;
  milestoneTypes?: ReferralMilestoneTypeInfo[];
};

export type ReferralProgrammeUpsertRequest = {
  programmeUid?: string;
  name: string;
  description?: string;
  status?: string;
  maxReferralsPerCustomer?: number;
  config: ReferralProgrammeConfig;
};

export type ReferralDashboardResponse = {
  totalReferrals: number;
  signedUp: number;
  rewarded: number;
  fraudFlagged: number;
  totalPointsIssued: number;
  conversionRatePercent?: number;
  averagePointsPerReferral?: number;
};

export type ReferralListItem = {
  referralUid: string;
  referrerCustomerId: string;
  refereeCustomerId: string;
  status: string;
  referralCodeUsed?: string;
  purchaseCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ReferralFraudQueueItem = {
  referralUid: string;
  referrerCustomerId: string;
  refereeCustomerId: string;
  referralCodeUsed?: string;
  fraudReasons: string[];
  createdAt?: string;
};

export type ReferralTrendPoint = {
  periodStart: string;
  referrals: number;
  rewarded: number;
};

export type ReferralTopReferrer = {
  referrerCustomerId: string;
  referralCount: number;
  rewardedCount: number;
  totalRefereeSpend?: number;
  pointsEarned?: number;
  conversionRatePercent?: number;
};

export type ReferralPeriodMetrics = {
  totalReferrals: number;
  signedUp: number;
  rewarded: number;
  pending: number;
  fraudFlagged: number;
  rejected: number;
  withPurchase: number;
  totalRefereeSpend: number;
  totalRewardPoints: number;
  conversionRatePercent: number;
  signupRatePercent: number;
  purchaseRatePercent: number;
};

export type ReferralFunnelStage = {
  stage: string;
  count: number;
  sharePercent: number;
};

export type ReferralEffectivenessTrendRow = {
  periodStart: string;
  referrals: number;
  signedUp: number;
  rewarded: number;
  conversionRatePercent: number;
  refereeSpend: number;
};

export type ReferralProgrammeComparisonRow = {
  programmeUid: string;
  programmeName: string;
  totalReferrals: number;
  rewarded: number;
  conversionRatePercent: number;
  totalRefereeSpend: number;
  totalRewardPoints: number;
};

export type ReferralEffectivenessReport = {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  currency: string;
  periodMetrics: ReferralPeriodMetrics;
  priorPeriodMetrics: ReferralPeriodMetrics;
  periodOverPeriodReferralsChangePct?: number | null;
  periodOverPeriodRewardedChangePct?: number | null;
  periodOverPeriodConversionChangePts?: number;
  rewardCostInCurrency: number;
  revenuePerRewardCurrency: number;
  netRefereeValue: number;
  avgPointsPerRewardedReferral: number;
  costPerRewardedReferralPoints: number;
  timeToFirstPurchase: ReferralTimeToPurchase;
  funnel: ReferralFunnelStage[];
  dailyTrends: ReferralEffectivenessTrendRow[];
  topReferrers: ReferralTopReferrer[];
  programmeComparisons: ReferralProgrammeComparisonRow[];
};

export type ReferralTimeToPurchase = {
  averageHoursToFirstPurchase: number;
  sampleSize: number;
};

export const referralApi = {
  getRuleSchema: async (programmeUid?: string): Promise<ReferralRuleSchemaResponse> => {
    try {
      const res = await apiClient.get<ReferralRuleSchemaResponse>(
        "/api/v1/me/referrals/rule-schema",
        { params: programmeUid ? { programmeUid } : undefined }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getProgramme: async (programmeUid = "default"): Promise<ReferralProgrammeResponse | null> => {
    try {
      const res = await apiClient.get<ReferralProgrammeResponse>("/api/v1/me/referrals/programmes", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      const ax = err as AxiosError<ApiErrorResponse>;
      if (ax.response?.status === 404) return null;
      handleError(ax);
    }
  },
  upsertProgramme: async (body: ReferralProgrammeUpsertRequest) => {
    try {
      const res = await apiClient.post("/api/v1/me/referrals/programmes", body);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getDashboard: async (programmeUid = "default"): Promise<ReferralDashboardResponse> => {
    try {
      const res = await apiClient.get<ReferralDashboardResponse>("/api/v1/me/referrals/dashboard", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listReferrals: async (programmeUid = "default", status?: string): Promise<ReferralListItem[]> => {
    try {
      const res = await apiClient.get<ReferralListItem[]>("/api/v1/me/referrals/list", {
        params: { programmeUid, status: status || undefined },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  exportCsv: async (programmeUid = "default", status?: string): Promise<Blob> => {
    try {
      const res = await apiClient.get("/api/v1/me/referrals/export", {
        params: { programmeUid, status: status || undefined },
        responseType: "blob",
      });
      return res.data as Blob;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  listFraudQueue: async (programmeUid = "default"): Promise<ReferralFraudQueueItem[]> => {
    try {
      const res = await apiClient.get<ReferralFraudQueueItem[]>("/api/v1/me/referrals/fraud-queue", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  approveFraud: async (referralUid: string, programmeUid = "default", note?: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/me/referrals/fraud-queue/${encodeURIComponent(referralUid)}/approve`,
        note ? { note } : {},
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  rejectFraud: async (referralUid: string, programmeUid = "default", note?: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/me/referrals/fraud-queue/${encodeURIComponent(referralUid)}/reject`,
        note ? { note } : {},
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  overrideFraud: async (referralUid: string, programmeUid = "default", note?: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/me/referrals/fraud-queue/${encodeURIComponent(referralUid)}/override`,
        note ? { note } : {},
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTrends: async (
    programmeUid = "default",
    granularity: "DAILY" | "WEEKLY" = "DAILY",
    days = 30
  ): Promise<ReferralTrendPoint[]> => {
    try {
      const res = await apiClient.get<ReferralTrendPoint[]>("/api/v1/me/referrals/analytics/trends", {
        params: { programmeUid, granularity, days },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTopReferrers: async (programmeUid = "default", limit = 10): Promise<ReferralTopReferrer[]> => {
    try {
      const res = await apiClient.get<ReferralTopReferrer[]>("/api/v1/me/referrals/analytics/top-referrers", {
        params: { programmeUid, limit },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getTimeToFirstPurchase: async (programmeUid = "default"): Promise<ReferralTimeToPurchase> => {
    try {
      const res = await apiClient.get<ReferralTimeToPurchase>(
        "/api/v1/me/referrals/analytics/time-to-first-purchase",
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getEffectivenessReport: async (
    programmeUid: string,
    from: string,
    to: string
  ): Promise<ReferralEffectivenessReport> => {
    try {
      const res = await apiClient.get<ReferralEffectivenessReport>(
        "/api/v1/me/referrals/analytics/effectiveness-report",
        { params: { programmeUid, from, to } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export const voucherDenominationApi = {
  getMappings: async (
    catalogRewardUid: string,
    programmeUid: string
  ): Promise<DenominationMappingsResponse> => {
    try {
      const res = await apiClient.get<DenominationMappingsResponse>(
        `/api/v1/me/vouchers/denominations/${encodeURIComponent(catalogRewardUid)}`,
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  saveMappings: async (
    catalogRewardUid: string,
    programmeUid: string,
    mappings: DenominationMappingItem[]
  ): Promise<DenominationMappingsResponse> => {
    try {
      const res = await apiClient.put<DenominationMappingsResponse>(
        "/api/v1/me/vouchers/denominations",
        { catalogRewardUid, mappings },
        { params: { programmeUid } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};

export const couponApi = {
  list: async (programmeUid?: string): Promise<CouponResponse[]> => {
    try {
      const res = await apiClient.get<CouponResponse[]>("/api/v1/me/coupons", {
        params: { programmeUid },
      });
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  get: async (couponUid: string): Promise<CouponResponse> => {
    try {
      const res = await apiClient.get<CouponResponse>(`/api/v1/me/coupons/${encodeURIComponent(couponUid)}`);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  create: async (body: CouponCreateRequest): Promise<CouponResponse> => {
    try {
      const res = await apiClient.post<CouponResponse>("/api/v1/me/coupons", body);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  activate: async (couponUid: string): Promise<CouponResponse> => {
    try {
      const res = await apiClient.post<CouponResponse>(
        `/api/v1/me/coupons/${encodeURIComponent(couponUid)}/activate`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  revoke: async (couponUid: string): Promise<CouponResponse> => {
    try {
      const res = await apiClient.post<CouponResponse>(
        `/api/v1/me/coupons/${encodeURIComponent(couponUid)}/revoke`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  redemptions: async (couponUid: string): Promise<CouponRedemptionListItem[]> => {
    try {
      const res = await apiClient.get<CouponRedemptionListItem[]>(
        `/api/v1/me/coupons/${encodeURIComponent(couponUid)}/redemptions`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
  getUsageReport: async (
    programmeUid: string,
    from: string,
    to: string
  ): Promise<CouponUsageReportResponse> => {
    try {
      const res = await apiClient.get<CouponUsageReportResponse>(
        "/api/v1/me/coupons/analytics/usage-report",
        { params: { programmeUid, from, to } }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};
