// ─── Enums (must exactly match Java enums in tenant-onboarding-service) ──────

export type BusinessCategory =
  | "RETAIL"
  | "ECOMMERCE"
  | "FINTECH"
  | "HOSPITALITY"
  | "GAMING"
  | "HEALTHCARE"
  | "TELECOM"
  | "OTHER";

export type IdentityMode = "ID_ONLY" | "FULL_PROFILE" | "BOTH";

export type DataResidencyRegion = "IN" | "US" | "EU" | "APAC";

export type SubscriptionTier = "STANDARD" | "PROFESSIONAL" | "ENTERPRISE";

export type OnboardingStatus =
  | "PENDING_EMAIL_VERIFICATION"
  | "EMAIL_VERIFIED"
  | "AGREEMENT_PENDING"
  | "AGREEMENT_SIGNED"
  | "CONFIGURED"
  | "RULES_CONFIGURED"
  | "SANDBOX_TESTING"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type AgreementStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type SettlementFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "T_PLUS_1";

export type BusinessModel = "D2C" | "B2B" | "B2C" | "MARKETPLACE" | "FRANCHISE" | "HYBRID";

export type AnnualRevenueRange =
  | "LESS_THAN_1M"
  | "FROM_1M_TO_5M"
  | "FROM_5M_TO_25M"
  | "FROM_25M_TO_100M"
  | "OVER_100M";

export type ContactRole =
  | "PRIMARY_ADMIN"
  | "TECHNICAL_POC"
  | "BUSINESS_POC"
  | "BILLING_POC"
  | "SUPPORT_POC";

// ─── API Request Types ────────────────────────────────────────────────────────

export interface RegisterTenantRequest {
  companyName: string;
  email: string;
  password: string;
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
  identityMode: IdentityMode;
  dataResidencyRegion: DataResidencyRegion;
  timezone?: string;
  websiteUrl?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  primaryContactDesignation?: string;
}

export interface SubmitAgreementRequest {
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementFrequency: SettlementFrequency;
  pointsCurrency: string;
  expectedDailyTxnVolume?: number;
  billingContactName?: string;
  billingAddress?: string;
  paymentMethod?: string;
  contractDurationMonths?: number;
  autoRenewal?: boolean;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation?: string;
  documentS3Key?: string;
}

export interface ProgrammeConfigRequest {
  programmeName: string;
  programmeDescription?: string;
  pointsName: string;
  pointsSymbol: string;
  baseCurrency: string;
  basePointsRate: number;
  minRedemptionPoints: number;
  maxRedemptionPctPerTxn: number;
  tiersEnabled: boolean;
  tiers?: TierDefinitionInput[];
  notificationPreferences: NotificationPreferences;
  webhookConfig: WebhookConfigInput;
}

export interface TierDefinitionInput {
  name: string;
  rank: number;
  minPoints: number;
  maxPoints: number | null;
  multiplier: number;
  benefits: string[];
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  webhookEnabled: boolean;
}

export interface WebhookConfigInput {
  sandboxEndpointUrl: string;
  productionEndpointUrl?: string;
}

// ─── v2 Programme APIs ────────────────────────────────────────────────────────

export interface CreateProgrammeRequest {
  name: string;
}

export interface ProgrammeSummaryResponse {
  programmeUid: string;
  name: string;
  status: string;
  activeConfigVersion: number;
}

export interface UpsertProgrammeConfigRequest {
  config: unknown;
}

export interface ProgrammeConfigBlobResponse {
  tenantId: string;
  programmeUid: string;
  configVersion: number;
  config: unknown;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface TenantRegistrationResponse {
  tenantId: string;
  slug: string;
  email: string;
  onboardingStatus: OnboardingStatus;
  identityMode: IdentityMode;
  message: string;
  createdAt: string;
}

export interface TenantStatusResponse {
  tenantId: string;
  companyName: string;
  slug: string;
  email: string;
  onboardingStatus: OnboardingStatus;
  identityMode: IdentityMode;
  subscriptionTier: SubscriptionTier;
  dataResidencyRegion: DataResidencyRegion;
  emailVerified: boolean;
  latestAgreementStatus: AgreementStatus | null;
  rejectionReason?: string | null;
  createdAt: string;
  activatedAt: string | null;
  businessCategory?: string;
  /** Human-readable label of the resolved category. */
  businessCategoryLabel?: string | null;
  /** Moderation status: APPROVED / PENDING_REVIEW / REJECTED. */
  businessCategoryStatus?: BusinessCategoryStatus | null;
  /** Reason text when status is REJECTED. */
  businessCategoryDecisionReason?: string | null;
  countryCode?: string;
  websiteUrl?: string | null;
  timezone?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string | null;
  primaryContactDesignation?: string | null;
  legalBusinessName?: string | null;
  businessRegistrationNo?: string | null;
  subCategory?: string | null;
  businessModel?: string | null;
  numberOfLocations?: number | null;
  headquartersAddress?: string | null;
  founderNames?: string | null;
  yearFounded?: number | null;
  annualRevenueRange?: string | null;
  customerBaseSize?: number | null;
  paymentMethodsAccepted?: string | null;
}

// ─── Industry Moderation ──────────────────────────────────────────────────────

export type BusinessCategoryStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface AdminBusinessCategoryItem {
  code: string;
  label: string;
  submittedLabel?: string | null;
  sortOrder?: number | null;
  active?: boolean;
  status: BusinessCategoryStatus;
  submittedByTenantId?: string | null;
  submittedByCompanyName?: string | null;
  submittedByEmail?: string | null;
  decisionReason?: string | null;
  decidedByAdminId?: string | null;
  decidedAt?: string | null;
}

// ─── Admin Types ───────────────────────────────────────────────────────────────

export type AdminRole = "PLATFORM_ADMIN" | "COMPLIANCE_OFFICER";

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  adminUid: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface PendingAgreementListItem {
  agreementUid: string;
  tenantId: string;
  companyName: string;
  tenantEmail: string;
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementFrequency: SettlementFrequency;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation?: string;
  signedAt: string;
  status: AgreementStatus;
  createdAt: string;
}

// ─── Admin Dashboard Types ──────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalTenants: number;
  pendingEmailVerification: number;
  emailVerified: number;
  agreementPending: number;
  agreementSigned: number;
  activeTenants: number;
  suspendedTenants: number;
  terminatedTenants: number;
  totalAgreements: number;
  pendingApprovalAgreements: number;
  approvedAgreements: number;
  rejectedAgreements: number;
  registrationsToday: number;
  registrationsThisWeek: number;
  registrationsThisMonth: number;
}

export interface AdminTenantListItem {
  tenantId: string;
  companyName: string;
  slug: string;
  email: string;
  businessCategory: string;
  countryCode: string;
  onboardingStatus: OnboardingStatus;
  identityMode: IdentityMode;
  dataResidencyRegion: DataResidencyRegion;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  latestAgreementStatus: string | null;
  createdAt: string;
  activatedAt: string | null;
}

export interface AdminTenantDetail {
  tenantId: string;
  companyName: string;
  slug: string;
  email: string;
  websiteUrl: string | null;
  timezone: string;
  countryCode: string;
  businessCategory: string;
  onboardingStatus: OnboardingStatus;
  identityMode: IdentityMode;
  dataResidencyRegion: DataResidencyRegion;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  terminatedAt: string | null;
  contacts: TenantContactItem[];
  agreements: AgreementHistoryItem[];
}

export interface TenantContactItem {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  designation: string | null;
  role: string;
}

export interface AgreementHistoryItem {
  agreementUid: string;
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementFrequency: string;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation: string | null;
  signedAt: string;
  status: string;
  approvedByAdminId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  tenantId: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: string;
}

export interface AllAgreementItem {
  agreementUid: string;
  tenantId: string;
  companyName: string;
  tenantEmail: string;
  termsVersion: string;
  effectiveDate: string;
  revenueSharePct: number;
  settlementFrequency: string;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation: string | null;
  signedAt: string;
  status: string;
  approvedByAdminId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
  tenantId: string;
  email: string;
  onboardingStatus: OnboardingStatus;
  latestAgreementStatus: AgreementStatus | null;
}

export interface OnboardingSelectOption {
  value: string;
  label: string;
}

export interface OnboardingMetadataResponse {
  businessCategories: OnboardingSelectOption[];
  countries: OnboardingSelectOption[];
  timezones: OnboardingSelectOption[];
  businessModels: OnboardingSelectOption[];
  annualRevenueRanges: OnboardingSelectOption[];
  paymentMethodsAccepted: OnboardingSelectOption[];
  settlementFrequencies: OnboardingSelectOption[];
  currencies: OnboardingSelectOption[];
  billingPaymentMethods: OnboardingSelectOption[];
  contractDurations: OnboardingSelectOption[];
}

export interface ApiKeyGeneratedResponse {
  keyUid: string;
  apiKey: string; // Raw key — shown ONCE, never retrievable again
  signingSecret: string; // Raw secret — shown ONCE, never retrievable again
  environment: "SANDBOX" | "PRODUCTION";
  keyPrefix: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

// ─── Wizard State Types ───────────────────────────────────────────────────────

export type WizardStep =
  | "account" // Step 1 — Company + contact details + password
  | "identity" // Step 2 — Identity mode + data residency selection
  | "agreement" // Step 3 — Commercial terms
  | "programme" // Step 4 — Programme config + tier setup
  | "integration" // Step 5 — API keys + webhook setup
  | "complete"; // Step 6 — Go-live summary

export interface WizardStepMeta {
  id: WizardStep;
  label: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
  apiStatus: OnboardingStatus | null; // the backend status that maps to this step
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  {
    id: "account",
    label: "Account Setup",
    description: "Company info and admin contact",
    isComplete: false,
    isActive: true,
    apiStatus: "PENDING_EMAIL_VERIFICATION",
  },
  {
    id: "identity",
    label: "Programme Type",
    description: "Identity mode and data region",
    isComplete: false,
    isActive: false,
    apiStatus: "EMAIL_VERIFIED",
  },
  {
    id: "agreement",
    label: "Agreement",
    description: "Commercial terms and settlement",
    isComplete: false,
    isActive: false,
    apiStatus: "AGREEMENT_PENDING",
  },
];

// Maps backend OnboardingStatus → wizard step
export const STATUS_TO_STEP: Record<OnboardingStatus, WizardStep> = {
  PENDING_EMAIL_VERIFICATION: "account",
  EMAIL_VERIFIED: "identity",
  AGREEMENT_PENDING: "agreement",
  AGREEMENT_SIGNED: "agreement",
  CONFIGURED: "programme",
  RULES_CONFIGURED: "integration",
  SANDBOX_TESTING: "integration",
  ACTIVE: "complete",
  SUSPENDED: "complete",
  TERMINATED: "complete",
};
