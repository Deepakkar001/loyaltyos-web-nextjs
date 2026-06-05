import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "@/lib/api/get-api-base-url";
import { getAccessToken } from "@/lib/auth/session";
import type { ApiErrorResponse } from "@/types/onboarding";

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

type SupportErrorBody = ApiErrorResponse & {
  errorMessage?: string;
  errorCode?: string;
};

function handleError(err: AxiosError<SupportErrorBody>): never {
  const data = err.response?.data;
  const msg =
    data?.errorMessage ??
    data?.message ??
    (typeof data?.error === "string" ? data.error : undefined) ??
    err.message;
  throw new Error(msg);
}

export type SupportCaseCategory =
  | "INTEGRATION"
  | "RULES_CAMPAIGNS"
  | "REFERRALS"
  | "VOUCHERS"
  | "BILLING"
  | "GO_LIVE"
  | "OTHER";

export type SupportCasePriority = "NORMAL" | "URGENT";

export type SupportCaseStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type SupportActorType = "TENANT" | "PLATFORM_ADMIN";

export type IntegrationErrorSnippet = {
  requestId: string;
  httpMethod: string;
  requestPath: string;
  httpStatus: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
};

export type SupportContext = {
  tenantId: string;
  companyName?: string;
  subscriptionTier: string;
  userEmail?: string;
  slaResponseHint: string;
  recentIntegrationErrors: IntegrationErrorSnippet[];
};

export type SupportCase = {
  caseUid: string;
  tenantId: string;
  createdByEmail?: string;
  category: SupportCaseCategory;
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  subject: string;
  description: string;
  correlationId?: string;
  programmeUid?: string;
  pageUrl?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaResponseHint?: string;
  companyName?: string;
  subscriptionTier?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  statusUpdatedByType?: SupportActorType;
  allowedNextStatuses?: SupportCaseStatus[];
};

export type UpdateSupportCaseStatusRequest = {
  status: SupportCaseStatus;
};

export type CreateSupportCaseRequest = {
  category: SupportCaseCategory;
  priority: SupportCasePriority;
  subject: string;
  description: string;
  correlationId?: string;
  programmeUid?: string;
  pageUrl?: string;
};

export const supportApi = {
  getContext: async (): Promise<SupportContext> => {
    try {
      const res = await client.get<SupportContext>("/api/v1/me/support/context");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<SupportErrorBody>);
    }
  },

  listCases: async (): Promise<SupportCase[]> => {
    try {
      const res = await client.get<SupportCase[]>("/api/v1/me/support/cases");
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<SupportErrorBody>);
    }
  },

  getCase: async (caseUid: string): Promise<SupportCase> => {
    try {
      const res = await client.get<SupportCase>(
        `/api/v1/me/support/cases/${encodeURIComponent(caseUid)}`
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<SupportErrorBody>);
    }
  },

  createCase: async (body: CreateSupportCaseRequest): Promise<SupportCase> => {
    try {
      const res = await client.post<SupportCase>("/api/v1/me/support/cases", body);
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<SupportErrorBody>);
    }
  },

  updateCaseStatus: async (
    caseUid: string,
    body: UpdateSupportCaseStatusRequest
  ): Promise<SupportCase> => {
    try {
      const res = await client.patch<SupportCase>(
        `/api/v1/me/support/cases/${encodeURIComponent(caseUid)}/status`,
        body
      );
      return res.data;
    } catch (err) {
      handleError(err as AxiosError<SupportErrorBody>);
    }
  },
};
