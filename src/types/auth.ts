import type { LoginResponse } from "@/types/onboarding";
import type { MerchantAuthResponse } from "@/types/merchant";

export type SignInIdentityType = "TENANT" | "MERCHANT" | "ORGANISATION_SELECTION_REQUIRED";

export interface SignInOrganisationOption {
  tenantId: string;
  merchantUid: string;
  merchantName: string;
}

export interface UnifiedSignInResponse {
  identityType: SignInIdentityType;
  tenant?: LoginResponse;
  merchant?: MerchantAuthResponse;
  organisations?: SignInOrganisationOption[];
}

export interface UnifiedSignInRequest {
  email: string;
  password: string;
  tenantId?: string;
}
