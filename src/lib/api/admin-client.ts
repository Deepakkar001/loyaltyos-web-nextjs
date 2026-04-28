import axios, { AxiosError, AxiosResponse } from "axios";
import {
  AdminDashboardStats,
  AdminLoginResponse,
  AdminTenantDetail,
  AdminTenantListItem,
  AllAgreementItem,
  ApiErrorResponse,
  AuditLogItem,
  PendingAgreementListItem,
} from "@/types/onboarding";

const adminClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

adminClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  let token = localStorage.getItem("loyaltyos_admin_token");
  if (!token) {
    try {
      const blob = localStorage.getItem("loyaltyos-admin");
      if (blob) {
        const parsed = JSON.parse(blob);
        token = parsed?.state?.accessToken ?? null;
      }
    } catch { /* ignore */ }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

class AdminApiError extends Error {
  status: number;
  error: string;
  constructor(res: ApiErrorResponse) {
    super(res.message);
    this.status = res.status;
    this.error = res.error;
  }
}

function handleError(err: AxiosError<ApiErrorResponse>): never {
  if (err.response?.data) throw new AdminApiError(err.response.data);
  throw new AdminApiError({
    timestamp: new Date().toISOString(),
    status: 503,
    error: "NETWORK_ERROR",
    message: "Unable to reach the server. Please try again.",
    path: "",
  });
}

export { AdminApiError };

export const adminApi = {
  login: async (email: string, password: string): Promise<AdminLoginResponse> => {
    try {
      const res: AxiosResponse<AdminLoginResponse> = await adminClient.post(
        "/api/v1/admin/auth/login",
        { email, password }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  listPending: async (): Promise<PendingAgreementListItem[]> => {
    try {
      const res: AxiosResponse<PendingAgreementListItem[]> = await adminClient.get(
        "/api/v1/admin/agreements/pending"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  approve: async (agreementUid: string, approvalNotes?: string): Promise<void> => {
    try {
      await adminClient.post(`/api/v1/admin/agreements/${agreementUid}/approve`, {
        approvalNotes: approvalNotes || null,
      });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  reject: async (agreementUid: string, rejectionReason: string): Promise<void> => {
    try {
      await adminClient.post(`/api/v1/admin/agreements/${agreementUid}/reject`, {
        rejectionReason,
      });
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  getStats: async (): Promise<AdminDashboardStats> => {
    try {
      const res: AxiosResponse<AdminDashboardStats> = await adminClient.get(
        "/api/v1/admin/dashboard/stats"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  listTenants: async (): Promise<AdminTenantListItem[]> => {
    try {
      const res: AxiosResponse<AdminTenantListItem[]> = await adminClient.get(
        "/api/v1/admin/dashboard/tenants"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  getTenantDetail: async (tenantId: string): Promise<AdminTenantDetail> => {
    try {
      const res: AxiosResponse<AdminTenantDetail> = await adminClient.get(
        `/api/v1/admin/dashboard/tenants/${tenantId}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  getAuditLogs: async (limit = 50): Promise<AuditLogItem[]> => {
    try {
      const res: AxiosResponse<AuditLogItem[]> = await adminClient.get(
        `/api/v1/admin/dashboard/audit-logs?limit=${limit}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  getTenantAuditLogs: async (tenantId: string, limit = 50): Promise<AuditLogItem[]> => {
    try {
      const res: AxiosResponse<AuditLogItem[]> = await adminClient.get(
        `/api/v1/admin/dashboard/tenants/${tenantId}/audit-logs?limit=${limit}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  listAllAgreements: async (): Promise<AllAgreementItem[]> => {
    try {
      const res: AxiosResponse<AllAgreementItem[]> = await adminClient.get(
        "/api/v1/admin/dashboard/agreements/all"
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};
