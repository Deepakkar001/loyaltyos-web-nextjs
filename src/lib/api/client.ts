import axios, { AxiosError, AxiosResponse } from "axios";
import {
  ApiErrorResponse,
  ApiKeyGeneratedResponse,
  LoginResponse,
  OnboardingMetadataResponse,
  ProgrammeConfigRequest,
  RegisterTenantRequest,
  SubmitAgreementRequest,
  TenantRegistrationResponse,
  TenantStatusResponse,
} from "@/types/onboarding";
import { getAccessToken, setAccessToken as setSessionAccessToken, clearSession } from "@/lib/auth/session";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // required for HttpOnly refresh cookie
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<LoginResponse> | null = null;

async function refreshSingleFlight(): Promise<LoginResponse> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await apiClient.post<LoginResponse>("/api/v1/auth/refresh", {});
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
    try {
      const res: AxiosResponse<OnboardingMetadataResponse> = await apiClient.get(
        "/api/v1/onboarding/metadata"
      );
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
};
