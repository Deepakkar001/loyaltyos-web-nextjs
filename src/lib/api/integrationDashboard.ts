import axios, { AxiosError } from "axios";
import { ApiErrorResponse, ApiKeyGeneratedResponse } from "@/types/onboarding";
import { getApiBaseUrl } from "@/lib/api/get-api-base-url";
import { getAccessToken } from "@/lib/auth/session";

const client = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type IntegrationErrorBody = ApiErrorResponse & {
  errorMessage?: string;
  errorCode?: string;
};

function handleError(err: AxiosError<IntegrationErrorBody>): never {
  const data = err.response?.data;
  const msg =
    data?.errorMessage ??
    data?.message ??
    (typeof data?.error === "string" ? data.error : undefined) ??
    err.message;
  throw new Error(msg);
}

export type ApiKeyEnvironment = "SANDBOX" | "PRODUCTION";

export type CredentialSummary = {
  keyId: string;
  keyPrefix: string;
  secretMasked: string;
  environment: ApiKeyEnvironment;
  status: string;
  createdAt?: string;
  lastUsedAt?: string | null;
  lastSecretRevealedAt?: string | null;
  requestCountLast24h?: number;
  name?: string;
  description?: string;
  secretRetrievable?: boolean;
};

export type DashboardOverview = {
  totalActiveKeys: number;
  totalRequestsLast24h: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgResponseTime: number;
  p99ResponseTime: number;
  lastRequestAt?: string | null;
};

export type AuditLogEntry = {
  id: number;
  tenantId: string;
  apiKeyUid?: string;
  requestId: string;
  httpMethod: string;
  requestPath: string;
  eventId?: string;
  customerId?: string;
  httpStatus: number;
  processingTimeMs: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
};

export type RevealSecretResponse = {
  keyId: string;
  apiKey: string;
  signingSecret: string;
  lastSecretRevealedAt?: string | null;
  warning: string;
};

export const integrationDashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    try {
      const res = await client.get<DashboardOverview>("/api/v1/me/integration/dashboard/overview");
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  listCredentials: async (environment = "all"): Promise<CredentialSummary[]> => {
    try {
      const res = await client.get<CredentialSummary[]>("/api/v1/me/integration/dashboard/credentials", {
        params: { environment },
      });
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  generateCredentials: async (environment: ApiKeyEnvironment): Promise<ApiKeyGeneratedResponse> => {
    try {
      const res = await client.post<ApiKeyGeneratedResponse>(
        "/api/v1/me/integration/dashboard/credentials/generate",
        { environment }
      );
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  revealSecret: async (keyId: string): Promise<RevealSecretResponse> => {
    try {
      const res = await client.post<RevealSecretResponse>(
        `/api/v1/me/integration/dashboard/credentials/${keyId}/reveal-secret`
      );
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  revokeCredential: async (keyId: string): Promise<void> => {
    try {
      await client.post(`/api/v1/me/integration/dashboard/credentials/${keyId}/revoke`);
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  rotateCredential: async (keyId: string): Promise<RotateCredentialResponse> => {
    try {
      const res = await client.post<RotateCredentialResponse>(
        `/api/v1/me/integration/dashboard/credentials/${keyId}/rotate`
      );
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  getAuditLogs: async (page = 0, size = 50) => {
    try {
      const res = await client.get<{ content: AuditLogEntry[]; totalPages: number; number: number }>(
        "/api/v1/me/integration/dashboard/audit-logs",
        { params: { page, size } }
      );
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },

  getRecentActivity: async (): Promise<AuditLogEntry[]> => {
    const page = await integrationDashboardApi.getAuditLogs(0, 10);
    return page?.content ?? [];
  },

  getStatistics: async () => {
    try {
      const res = await client.get<{
        totalRequests: number;
        successful: number;
        failed: number;
        successRate: number;
        latency: { avg: number; p99: number };
        errorBreakdown: Record<string, number>;
      }>("/api/v1/me/integration/dashboard/statistics");
      return res.data;
    } catch (e) {
      handleError(e as AxiosError<ApiErrorResponse>);
    }
  },
};

export type RotateCredentialResponse = ApiKeyGeneratedResponse & {
  revokedKeyId?: string;
};
