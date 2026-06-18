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
  eligibleCategoriesJson?: string;
  capabilities?: string[];
  active: boolean;
  suspended: boolean;
  createdAt?: string;
}

export interface MerchantActivateResponse extends MerchantResponse {
  portalUsername?: string;
  inviteEmailSent?: boolean;
  inviteUrl?: string;
  inviteExpiresAt?: string;
}

export interface MerchantResendInviteResponse {
  inviteEmailSent: boolean;
  portalUsername?: string;
  alreadyActivated?: boolean;
  inviteUrl?: string;
  inviteExpiresAt?: string;
}

export interface MerchantInviteLinkResponse {
  inviteUrl: string;
  inviteExpiresAt?: string;
  portalUsername?: string;
}

export interface MerchantAgreementPrefill {
  merchantUid: string;
  legalName: string;
  displayName?: string;
  category?: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  earnRateMultiplier?: number;
  settlementCycle?: string;
  hasExistingAgreement: boolean;
}

export interface SubmitMerchantAgreementRequest {
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementCycle: string;
  pointsCurrency: string;
  expectedDailyTxnVolume?: number;
  billingContactName?: string;
  billingAddress?: string;
  paymentMethod?: string;
  contractDurationMonths: number;
  autoRenewal?: boolean;
  proposedEarnRateMultiplier?: number;
  merchantFundedCampaignsAllowed?: boolean;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation?: string;
  termsAccepted: boolean;
  portalContactEmail?: string;
}

export interface MerchantAgreementResponse {
  agreementUid: string;
  merchantUid: string;
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementCycle: string;
  pointsCurrency: string;
  expectedDailyTxnVolume?: number;
  billingContactName?: string;
  billingAddress?: string;
  paymentMethod?: string;
  contractDurationMonths: number;
  autoRenewal?: boolean;
  proposedEarnRateMultiplier?: number;
  merchantFundedCampaignsAllowed: boolean;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation?: string;
  signedAt?: string;
  submittedByEmail?: string;
  status: string;
}

export interface MerchantEmailAvailability {
  available: boolean;
  message?: string | null;
}

export interface CreateMerchantRequest {
  legalName: string;
  displayName?: string;
  category: string;
  contactEmail: string;
  contactPhone?: string;
  bankDetailsVaultRef?: string;
  taxId: string;
  earnRateMultiplier?: number;
  settlementCycle?: string;
}

export interface MerchantOpsSummary {
  activeCampaigns: number;
  pendingApprovalCampaigns: number;
  totalCampaigns: number;
  totalBudgetAllocated: number;
  totalBudgetConsumed: number;
  totalParticipations: number;
  integrationTestPassed: boolean;
}

export interface MerchantSettlementCycle {
  cycleUid: string;
  merchantUid: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalPoints: number;
  totalMonetaryValue: number;
  createdAt?: string;
  finalizedAt?: string;
  lineItemCount: number;
  openDisputeCount: number;
}

export interface SettlementLineItem {
  lineItemUid: string;
  txnReference: string;
  pointsAmount: number;
  monetaryValue: number;
  disputed: boolean;
  createdAt?: string;
}

export interface MerchantBudgetAlert {
  campaignUid: string;
  alertThresholdPct: number;
  budgetConsumed: number;
  budgetTotal: number;
  notifiedAt: string;
}

export interface MerchantPendingFinanceAgreement {
  agreementUid: string;
  merchantUid: string;
  merchantLegalName: string;
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementCycle: string;
  proposedEarnRateMultiplier?: number;
  submittedByEmail?: string;
  signedAt?: string;
}

export interface MerchantPendingConfigApproval {
  requestUid: string;
  merchantUid: string;
  merchantLegalName: string;
  requestedBy: string;
  requestedAt: string;
  payloadJson: string;
}

export interface MerchantAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  merchantUid: string;
  merchantName: string;
  tenantId: string;
  role: string;
  mustChangePassword?: boolean;
}

export interface MerchantInviteValidateResponse {
  valid: boolean;
  merchantName?: string;
  emailMasked?: string;
  expiresAt?: string;
}

export interface MerchantDashboardStats {
  activeCampaigns: number;
  pendingApprovalCampaigns: number;
  totalBudgetAllocated: number;
  totalBudgetConsumed: number;
  budgetConsumedPct: number;
  totalParticipations: number;
  totalPointsIssued: number;
  recentCampaigns: MerchantCampaignSummaryRow[];
}

export interface MerchantCampaignSummaryRow {
  campaignUid: string;
  name: string;
  status: string;
  budgetTotal: number;
  budgetConsumed: number;
  budgetConsumedPct: number;
  participations: number;
  pendingMerchantApproval: boolean;
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

export interface MerchantCampaignAnalyticsResponse {
  totalCampaigns: number;
  activeCampaigns: number;
  totalParticipations: number;
  totalUniqueCustomers: number;
  totalPointsIssued: number;
  totalCashbackRecorded: number;
  totalBudgetAllocated: number;
  totalBudgetConsumed: number;
  budgetConsumedPct: number;
  campaignStats: CampaignStatEntry[];
}

export interface CampaignStatEntry {
  campaignUid: string;
  campaignName: string;
  status: string;
  budgetTotal: number;
  budgetConsumed: number;
  budgetConsumedPct: number;
  budgetRemaining: number;
  totalParticipations: number;
  uniqueCustomersReached: number;
  totalPointsIssued: number;
  totalCashbackRecorded: number;
  avgPointsPerParticipation?: number;
  avgCashbackPerParticipation?: number;
}
