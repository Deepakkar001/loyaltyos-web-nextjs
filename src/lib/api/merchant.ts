import type {
  CreateMerchantRequest,
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantAuthResponse,
  MerchantIntegrationTestRequest,
  MerchantOnboardingAudit,
  MerchantResponse,
} from "@/types/merchant";
import type { CampaignResponse, CampaignUpsertRequest } from "@/types/campaigns";
import { apiClient, ensureAuthSession } from "@/lib/api/client";

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

  async get(merchantUid: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.get<MerchantResponse>(`/api/v1/me/merchants/${encodeURIComponent(merchantUid)}`);
    return res.data;
  },

  async submitAgreement(merchantUid: string, agreementDocumentUrl: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/agreement`,
      { agreementDocumentUrl, agreementAccepted: true }
    );
    return res.data;
  },

  async configure(
    merchantUid: string,
    body: { earnRateMultiplier?: number; settlementCycle?: string }
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

  async suspend(merchantUid: string, reason: string): Promise<MerchantResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<MerchantResponse>(
      `/api/v1/me/merchants/${encodeURIComponent(merchantUid)}/suspend`,
      { reason }
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
    const res = await apiClient.put<CampaignResponse>(
      `/api/v1/me/merchants/pending-campaign-approvals/${encodeURIComponent(campaignUid)}/approve`
    );
    return res.data;
  },

  async rejectCampaign(campaignUid: string): Promise<CampaignResponse> {
    await ensureAuthSession();
    const res = await apiClient.put<CampaignResponse>(
      `/api/v1/me/merchants/pending-campaign-approvals/${encodeURIComponent(campaignUid)}/reject`
    );
    return res.data;
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

const MERCHANT_TOKEN_KEY = "loyaltyos_merchant_token";

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

export async function merchantProfile(): Promise<MerchantResponse> {
  const token = getMerchantToken();
  const res = await apiClient.get<MerchantResponse>("/api/v1/merchant/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
}
