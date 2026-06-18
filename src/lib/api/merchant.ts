import type {
  CreateMerchantRequest,
  MerchantEmailAvailability,
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantAgreementPrefill,
  MerchantAgreementResponse,
  MerchantAuthResponse,
  MerchantDashboardStats,
  MerchantIntegrationTestRequest,
  MerchantInviteLinkResponse,
  MerchantInviteValidateResponse,
  MerchantOnboardingAudit,
  MerchantResendInviteResponse,
  MerchantResponse,
  SubmitMerchantAgreementRequest,
} from "@/types/merchant";
import type { ProgrammeSummaryResponse } from "@/types/onboarding";
import type { CampaignResponse, CampaignUpsertRequest } from "@/types/campaigns";
import type { CampaignStatsResponse } from "@/types/campaigns";
import { AxiosError } from "axios";
import { apiClient, ensureAuthSession } from "@/lib/api/client";

function rethrowMerchantApiError(err: unknown): never {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const message =
        (typeof record.message === "string" && record.message.trim()) ||
        (typeof record.detail === "string" && record.detail.trim());
      if (message) {
        throw new Error(message);
      }
    }
  }
  throw err instanceof Error ? err : new Error("Request failed");
}

export const merchantApi = {
  async list(stage?: string): Promise<MerchantResponse[]> {
    await ensureAuthSession();
    const res = await apiClient.get<{ content: MerchantResponse[] }>("/api/v1/me/merchants", {
      params: { page: 0, size: 100, ...(stage ? { stage } : {}) },
    });
    return res.data.content ?? [];
  },

  async create(body: CreateMerchantRequest): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.post<MerchantResponse>("/api/v1/me/merchants", body);
    return res.data;
  },

  async checkEmail(email: string, excludeMerchantUid?: string): Promise<MerchantEmailAvailability> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantEmailAvailability>("/api/v1/me/merchants/check-email", {
      params: {
        email,
        ...(excludeMerchantUid ? { excludeMerchantUid } : {}),
      },
    });
    return res.data;
  },

  async get(merchantUid: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantResponse>(`/api/v1/me/merchants/${encodeURIComponent(merchantUid)}`);
    return res.data;
  },

  async agreementPrefill(merchantUid: string): Promise<MerchantAgreementPrefill> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantAgreementPrefill>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/agreement/prefill`
    );
    return res.data;
  },

  async getAgreement(merchantUid: string): Promise<MerchantAgreementResponse | null> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantAgreementResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/agreement`,
      { validateStatus: (status) => status === 200 || status === 204 }
    );
    if (res.status === 204 || !res.data || typeof res.data !== "object") {
      return null;
    }
    return res.data;
  },

  async submitAgreement(
    merchantUid: string,
    body: SubmitMerchantAgreementRequest
  ): Promise<MerchantResponse> {
    await ensureAuthSession();
    try {
      const res = await apiClient.put<MerchantResponse>(
        `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/agreement`,
        body
      );
      return res.data;
    } catch (err) {
      rethrowMerchantApiError(err);
    }
  },

  async updateContact(merchantUid: string, contactEmail: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.patch<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/contact`,
      { contactEmail }
    );
    return res.data;
  },

  async configure(
    merchantUid: string,
    body: {
      earnRateMultiplier?: number;
      settlementCycle?: string;
      commissionConfigJson?: string;
      eligibleCategoriesJson?: string;
      capabilitiesJson?: string;
    }
  ): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/config`,
      body
    );
    return res.data;
  },

  async completeIntegration(
    merchantUid: string,
    body: MerchantIntegrationTestRequest
  ): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.post<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/integration`,
      body
    );
    return res.data;
  },

  async audit(merchantUid: string): Promise<MerchantOnboardingAudit[]> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantOnboardingAudit[]>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/audit`
    );
    return res.data;
  },

  async listApiKeys(merchantUid: string): Promise<MerchantApiKeyResponse[]> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantApiKeyResponse[]>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/api-keys`
    );
    return res.data;
  },

  async createApiKey(merchantUid: string, name?: string): Promise<MerchantApiKeyResponse> {
    await ensureAuthSession();
    const res = await apiClient.post<MerchantApiKeyResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/api-keys`,
      { name, environment: "sandbox" }
    );
    return res.data;
  },

  async revokeApiKey(merchantUid: string, keyUid: string): Promise<void> {
    await ensureAuthSession();
    await apiClient.put(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/api-keys/${encodeURIComponent(keyUid)}/revoke`
    );
  },

  async activate(merchantUid: string): Promise<MerchantActivateResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantActivateResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/activate`
    );
    return res.data;
  },

  async resendInvite(merchantUid: string): Promise<MerchantResendInviteResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResendInviteResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/resend-invite`
    );
    return res.data;
  },

  async issueInviteLink(merchantUid: string): Promise<MerchantInviteLinkResponse> {
    await ensureAuthSession();
    const res = await apiClient.post<MerchantInviteLinkResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/invite-link`
    );
    return res.data;
  },

  async suspend(merchantUid: string, reason: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/suspend`,
      { reason }
    );
    return res.data;
  },

  async unsuspend(merchantUid: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/unsuspend`
    );
    return res.data;
  },

  async listPendingCampaignApprovals(): Promise<CampaignResponse[]> {
    await ensureAuthSession();
    const res = await apiClient.get<CampaignResponse[]>("/api/v1/me/merchants/pending-campaign-approvals");
    return res.data;
  },

  async approveCampaign(campaignUid: string): Promise<CampaignResponse> {
    await ensureAuthSession();
    try {
      const res = await apiClient.put<CampaignResponse>(
        `/api/v1/me/merchants/pending-campaign-approvals/${encodeURIComponent(campaignUid)}/approve`
      );
      return res.data;
    } catch (err) {
      rethrowMerchantApiError(err);
    }
  },

  async rejectCampaign(campaignUid: string): Promise<CampaignResponse> {
    await ensureAuthSession();
    try {
      const res = await apiClient.put<CampaignResponse>(
        `/api/v1/me/merchants/pending-campaign-approvals/${encodeURIComponent(campaignUid)}/reject`
      );
      return res.data;
    } catch (err) {
      rethrowMerchantApiError(err);
    }
  },

  async opsSummary(merchantUid: string) {
    await ensureAuthSession();
    const res = await apiClient.get<import("@/types/merchant").MerchantOpsSummary>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/ops-summary`
    );
    return res.data;
  },

  async listMerchantCampaigns(merchantUid: string): Promise<CampaignResponse[]> {
    await ensureAuthSession();
    const res = await apiClient.get<CampaignResponse[]>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/campaigns`
    );
    return res.data;
  },

  async listSettlements(merchantUid: string) {
    await ensureAuthSession();
    const res = await apiClient.get<import("@/types/merchant").MerchantSettlementCycle[]>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/settlements`
    );
    return res.data;
  },

  async generateSettlement(merchantUid: string, period?: string) {
    await ensureAuthSession();
    const res = await apiClient.post<import("@/types/merchant").MerchantSettlementCycle>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/settlements/generate`,
      null,
      { params: period ? { period } : {} }
    );
    return res.data;
  },

  async finalizeSettlement(merchantUid: string, cycleUid: string) {
    await ensureAuthSession();
    const res = await apiClient.put<import("@/types/merchant").MerchantSettlementCycle>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/settlements/${encodeURIComponent(cycleUid)}/finalize`
    );
    return res.data;
  },

  async exportCsv(): Promise<Blob> {
    await ensureAuthSession();
    const res = await apiClient.get("/api/v1/me/merchants/export", {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  async listPendingFinanceAgreements() {
    await ensureAuthSession();
    const res = await apiClient.get<import("@/types/merchant").MerchantPendingFinanceAgreement[]>(
      "/api/v1/me/merchants/pending-finance-agreements"
    );
    return res.data;
  },

  async listPendingConfigApprovals() {
    await ensureAuthSession();
    const res = await apiClient.get<import("@/types/merchant").MerchantPendingConfigApproval[]>(
      "/api/v1/me/merchants/pending-config-approvals"
    );
    return res.data;
  },

  async approveFinanceAgreement(merchantUid: string, agreementUid: string) {
    await ensureAuthSession();
    const res = await apiClient.put<import("@/types/merchant").MerchantAgreementResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/agreement/${encodeURIComponent(agreementUid)}/approve-finance`
    );
    return res.data;
  },

  async approveConfigRequest(merchantUid: string, requestUid: string) {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/config-approvals/${encodeURIComponent(requestUid)}/approve`
    );
    return res.data;
  },

  async downloadSettlementExport(
    merchantUid: string,
    cycleUid: string,
    format: "csv" | "pdf" | "xlsx"
  ): Promise<Blob> {
    await ensureAuthSession();
    const res = await apiClient.get(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/settlements/${encodeURIComponent(cycleUid)}/export`,
      { params: { format }, responseType: "blob" }
    );
    return res.data as Blob;
  },
};

function merchantAuthHeaders(): Record<string, string> {
  const token = getMerchantToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function merchantListCampaigns(): Promise<CampaignResponse[]> {
  const res = await apiClient.get<CampaignResponse[]>("/api/v1/merchant/campaigns", {
    headers: merchantAuthHeaders(),
  });
  return res.data;
}

export async function merchantCreateCampaign(body: CampaignUpsertRequest): Promise<CampaignResponse> {
  const res = await apiClient.post<CampaignResponse>("/api/v1/merchant/campaigns", body, {
    headers: merchantAuthHeaders(),
  });
  return res.data;
}

export async function merchantUpsertCampaignEventSchema(
  campaignUid: string,
  body: { eventSchema: unknown }
): Promise<CampaignResponse> {
  const res = await apiClient.put<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/event-schema`,
    body,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantListProgrammes(): Promise<ProgrammeSummaryResponse[]> {
  const res = await apiClient.get<ProgrammeSummaryResponse[]>(
    "/api/v1/merchant/programmes",
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantGetProgrammeConfig(programmeUid: string): Promise<{
  config?: Record<string, unknown>;
  configVersion?: number;
}> {
  const res = await apiClient.get<{ config?: Record<string, unknown>; configVersion?: number }>(
    `/api/v1/merchant/programmes/${encodeURIComponent(programmeUid)}/config`,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

const MERCHANT_TOKEN_KEY = "loyaltyos_merchant_token";
const MERCHANT_TENANT_KEY = "loyaltyos_merchant_tenant_id";

export function getStoredMerchantTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MERCHANT_TENANT_KEY);
}

export function setStoredMerchantTenantId(tenantId: string): void {
  localStorage.setItem(MERCHANT_TENANT_KEY, tenantId);
}

export function getMerchantToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MERCHANT_TOKEN_KEY);
}

export function setMerchantToken(token: string): void {
  localStorage.setItem(MERCHANT_TOKEN_KEY, token);
}

export function clearMerchantToken(): void {
  localStorage.removeItem(MERCHANT_TOKEN_KEY);
}

export async function merchantLogin(
  tenantId: string,
  username: string,
  password: string
): Promise<MerchantAuthResponse> {
  const res = await apiClient.post<MerchantAuthResponse>("/api/v1/merchant/auth/login", {
    tenantId,
    username,
    password,
  });
  setMerchantToken(res.data.accessToken);
  return res.data;
}

export async function merchantChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<MerchantAuthResponse> {
  const res = await apiClient.post<MerchantAuthResponse>(
    "/api/v1/merchant/auth/change-password",
    { currentPassword, newPassword },
    { headers: merchantAuthHeaders() }
  );
  setMerchantToken(res.data.accessToken);
  return res.data;
}

export async function merchantValidateInvite(token: string): Promise<MerchantInviteValidateResponse> {
  const res = await apiClient.get<MerchantInviteValidateResponse>(
    "/api/v1/merchant/invite/validate",
    { params: { token } }
  );
  return res.data;
}

export async function merchantAcceptInvite(
  token: string,
  newPassword: string
): Promise<void> {
  await apiClient.post("/api/v1/merchant/invite/accept", { token, newPassword });
}

export async function merchantDashboard(): Promise<MerchantDashboardStats> {
  const res = await apiClient.get<MerchantDashboardStats>("/api/v1/merchant/dashboard", {
    headers: merchantAuthHeaders(),
  });
  return res.data;
}

export async function merchantCampaignStats(campaignUid: string): Promise<CampaignStatsResponse> {
  const res = await apiClient.get<CampaignStatsResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/stats`,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantProfile(): Promise<MerchantResponse> {
  const token = getMerchantToken();
  const res = await apiClient.get<MerchantResponse>("/api/v1/merchant/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
}

export async function merchantGetAgreement(): Promise<import("@/types/merchant").MerchantAgreementResponse | null> {
  const res = await apiClient.get<import("@/types/merchant").MerchantAgreementResponse>(
    "/api/v1/merchant/agreement",
    {
      headers: merchantAuthHeaders(),
      validateStatus: (status) => status === 200 || status === 204,
    }
  );
  if (res.status === 204 || !res.data) return null;
  return res.data;
}

export async function merchantPauseCampaign(campaignUid: string): Promise<CampaignResponse> {
  const res = await apiClient.put<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/pause`,
    null,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantEndCampaign(campaignUid: string): Promise<CampaignResponse> {
  const res = await apiClient.put<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/end`,
    null,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantCampaignParticipations(
  campaignUid: string,
  limit = 50
): Promise<import("@/types/campaigns").CampaignParticipationResponse[]> {
  const res = await apiClient.get<import("@/types/campaigns").CampaignParticipationResponse[]>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/participations`,
    { headers: merchantAuthHeaders(), params: { limit } }
  );
  return res.data;
}

export async function merchantBudgetAlerts(): Promise<import("@/types/merchant").MerchantBudgetAlert[]> {
  const res = await apiClient.get<import("@/types/merchant").MerchantBudgetAlert[]>(
    "/api/v1/merchant/budget-alerts",
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantListSettlements(): Promise<import("@/types/merchant").MerchantSettlementCycle[]> {
  const res = await apiClient.get<import("@/types/merchant").MerchantSettlementCycle[]>(
    "/api/v1/merchant/settlements",
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantSettlementLineItems(cycleUid: string) {
  const res = await apiClient.get<import("@/types/merchant").SettlementLineItem[]>(
    `/api/v1/merchant/settlements/${encodeURIComponent(cycleUid)}/line-items`,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantGetCampaign(campaignUid: string): Promise<CampaignResponse> {
  const res = await apiClient.get<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}`,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantUpdateCampaign(
  campaignUid: string,
  body: CampaignUpsertRequest
): Promise<CampaignResponse> {
  const res = await apiClient.put<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}`,
    body,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantDownloadSettlement(cycleUid: string, format: "csv" | "pdf" | "xlsx") {
  const res = await apiClient.get(
    `/api/v1/merchant/settlements/${encodeURIComponent(cycleUid)}/export`,
    { headers: merchantAuthHeaders(), params: { format }, responseType: "blob" }
  );
  return res.data as Blob;
}

export async function merchantCreateSettlementDispute(
  cycleUid: string,
  body: { lineItemUid: string; reason: string }
): Promise<void> {
  await apiClient.post(
    `/api/v1/merchant/settlements/${encodeURIComponent(cycleUid)}/disputes`,
    body,
    { headers: merchantAuthHeaders() }
  );
}

export async function merchantResumeCampaign(campaignUid: string): Promise<CampaignResponse> {
  const res = await apiClient.put<CampaignResponse>(
    `/api/v1/merchant/campaigns/${encodeURIComponent(campaignUid)}/resume`,
    null,
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}

export async function merchantCampaignAnalytics(): Promise<
  import("@/types/merchant").MerchantCampaignAnalyticsResponse
> {
  const res = await apiClient.get<import("@/types/merchant").MerchantCampaignAnalyticsResponse>(
    "/api/v1/merchant/campaigns/analytics",
    { headers: merchantAuthHeaders() }
  );
  return res.data;
}
