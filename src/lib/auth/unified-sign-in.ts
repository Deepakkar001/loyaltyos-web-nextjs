import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { clearMerchantToken, setStoredMerchantTenantId } from "@/lib/api/merchant";
import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useUserStore } from "@/lib/store/user-store";
import type { UnifiedSignInResponse } from "@/types/auth";
import type { LoginResponse } from "@/types/onboarding";
import { STATUS_TO_STEP } from "@/types/onboarding";

export async function routeAfterTenantLogin(
  router: AppRouterInstance,
  res: LoginResponse
): Promise<void> {
  if (res.onboardingStatus === "AGREEMENT_SIGNED") {
    try {
      const { accessApi } = await import("@/lib/access/access-api");
      const catalog = await accessApi.getModuleCatalog();
      router.replace(catalog.modulesConfigured ? "/dashboard/configure" : "/onboarding");
    } catch {
      router.replace("/onboarding");
    }
    return;
  }
  if (res.onboardingStatus === "CONFIGURED") {
    router.replace("/dashboard/loyalty-rules/create/basic-info");
    return;
  }
  if (res.onboardingStatus === "RULES_CONFIGURED") {
    router.replace("/dashboard/integrate");
    return;
  }
  if (res.onboardingStatus === "SANDBOX_TESTING") {
    router.replace("/dashboard/go-live");
    return;
  }
  if (res.onboardingStatus === "ACTIVE") {
    router.replace("/dashboard");
    return;
  }

  const step = STATUS_TO_STEP[res.onboardingStatus];
  router.replace(
    step === "programme" || step === "integration" || step === "complete"
      ? "/dashboard"
      : "/onboarding"
  );
}

export function applyTenantSession(res: LoginResponse): void {
  clearMerchantToken();
  useMerchantAuthStore.getState().clearSession();

  const { setAccessToken, setTenantId, setRegistrationData, setMustChangePassword, syncStatusFromBackend } =
    useOnboardingStore.getState();
  setAccessToken(res.accessToken);
  setTenantId(res.tenantId);
  setRegistrationData({ email: res.email });
  setMustChangePassword(res.mustChangePassword === true);
  syncStatusFromBackend(res.onboardingStatus);
  useUserStore.getState().setFullName(res.fullName);

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("loyaltyos_logout_intent");
  }
}

export function applyMerchantSession(res: NonNullable<UnifiedSignInResponse["merchant"]>, email: string): void {
  useOnboardingStore.getState().logout();

  setStoredMerchantTenantId(res.tenantId);
  useMerchantAuthStore.getState().setSession({ ...res, mustChangePassword: res.mustChangePassword === true });
  useMerchantAuthStore.setState({ email: email.trim().toLowerCase() });
}

export function routeAfterMerchantLogin(
  router: AppRouterInstance,
  mustChangePassword: boolean
): void {
  if (mustChangePassword) {
    router.replace("/merchant/dashboard");
    return;
  }
  router.replace("/merchant/dashboard");
}
