import axios, { AxiosError, AxiosResponse } from "axios";
import {
  AdminBusinessCategoryItem,
  AdminDashboardStats,
  AdminLoginResponse,
  AdminTenantDetail,
  AdminTenantListItem,
  AllAgreementItem,
  ApiErrorResponse,
  AuditLogItem,
  BusinessCategoryStatus,
  PendingAgreementListItem,
} from "@/types/onboarding";
import { getApiBaseUrl } from "@/lib/api/get-api-base-url";

const adminClient = axios.create({
  baseURL: getApiBaseUrl(),
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

  // Industry suggestion moderation ────────────────────────────────────────────
  listBusinessCategories: async (
    status?: BusinessCategoryStatus | "ALL"
  ): Promise<AdminBusinessCategoryItem[]> => {
    try {
      const qs =
        !status || status === "ALL"
          ? ""
          : `?status=${encodeURIComponent(status)}`;
      const res: AxiosResponse<AdminBusinessCategoryItem[]> = await adminClient.get(
        `/api/v1/admin/business-categories${qs}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  approveBusinessCategory: async (
    code: string,
    overrides?: { label?: string; sortOrder?: number }
  ): Promise<AdminBusinessCategoryItem> => {
    try {
      const res: AxiosResponse<AdminBusinessCategoryItem> = await adminClient.post(
        `/api/v1/admin/business-categories/${encodeURIComponent(code)}/approve`,
        {
          label: overrides?.label ?? null,
          sortOrder: overrides?.sortOrder ?? null,
        }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  rejectBusinessCategory: async (
    code: string,
    reason: string
  ): Promise<AdminBusinessCategoryItem> => {
    try {
      const res: AxiosResponse<AdminBusinessCategoryItem> = await adminClient.post(
        `/api/v1/admin/business-categories/${encodeURIComponent(code)}/reject`,
        { reason }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  deactivateBusinessCategory: async (
    code: string,
    reason?: string
  ): Promise<AdminBusinessCategoryItem> => {
    try {
      const res: AxiosResponse<AdminBusinessCategoryItem> = await adminClient.post(
        `/api/v1/admin/business-categories/${encodeURIComponent(code)}/deactivate`,
        { reason: reason?.trim() || null }
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },

  reactivateBusinessCategory: async (
    code: string
  ): Promise<AdminBusinessCategoryItem> => {
    try {
      const res: AxiosResponse<AdminBusinessCategoryItem> = await adminClient.post(
        `/api/v1/admin/business-categories/${encodeURIComponent(code)}/reactivate`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<ApiErrorResponse>);
    }
  },
};
