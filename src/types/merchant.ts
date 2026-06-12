export type MerchantOnboardingStage =
  | "REGISTRATION"
  | "AGREEMENT"
  | "CONFIGURATION"
  | "INTEGRATION"
  | "ACTIVE"
  | "SUSPENDED";

export interface MerchantResponse {
  merchantUid: string;
  legalName: string;
  displayName?: string;
  category?: string;
  contactEmail?: string;
  onboardingStage: MerchantOnboardingStage;
  earnRateMultiplier?: number;
  settlementCycle?: string;
  agreementAcceptedAt?: string;
  integrationTestPassedAt?: string;
  active: boolean;
  suspended: boolean;
  createdAt?: string;
}

export interface MerchantActivateResponse extends MerchantResponse {
  portalUsername?: string;
  temporaryPassword?: string;
}

export interface CreateMerchantRequest {
  legalName: string;
  displayName?: string;
  category: string;
  contactEmail: string;
  contactPhone?: string;
  taxId: string;
  earnRateMultiplier?: number;
  settlementCycle?: string;
}

export interface MerchantAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  merchantUid: string;
  merchantName: string;
  tenantId: string;
  role: string;
}

export interface MerchantOnboardingAudit {
  auditUid: string;
  fromStage: string;
  toStage: string;
  actorEmail: string;
  action: string;
  reason?: string;
  createdAt: string;
}

export interface MerchantIntegrationTestRequest {
  customerId: string;
  eventType: string;
  amount: number;
  channel?: string;
}

export interface MerchantApiKeyResponse {
  keyUid: string;
  keyPrefix: string;
  name?: string;
  environment: string;
  active: boolean;
  createdAt?: string;
  apiKey?: string;
}
