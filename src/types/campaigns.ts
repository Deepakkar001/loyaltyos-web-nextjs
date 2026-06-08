export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXHAUSTED" | "EXPIRED" | "ENDED";

export type CampaignExecutionMode = "RULE_GATED" | "LEGACY_OFFER";

export type CustomerScope = "ALL" | "TARGETED";

export type StackMode = "ADDITIVE" | "BEST_OFFER" | "FIRST_MATCH";

export type CampaignAwardType =
  | "POINTS_BONUS"
  | "MULTIPLIER_ON_RULE_POINTS"
  | "FLAT_CASHBACK"
  | "PERCENT_CASHBACK";

export interface CampaignOfferConfig {
  awardType: CampaignAwardType;
  bonusPoints?: number;
  multiplierOnRulePoints?: number;
  cashbackValue?: number;
  expiryDays?: number;
  stackableWithRules?: boolean;
}

export interface CampaignTargetSegment {
  tierUids?: string[];
  channels?: string[];
  minAmount?: number;
  countries?: string[];
}

export interface CampaignUpsertRequest {
  programmeUid: string;
  campaignUid?: string;
  name: string;
  description?: string;
  campaignType: string;
  occasionTags?: string[];
  targetSegment?: CampaignTargetSegment;
  offerConfig: CampaignOfferConfig;
  triggerEventType: string;
  mutualExclGroup?: string;
  stackMode?: StackMode;
  budgetTotal: number;
  alertThresholdPct?: number;
  priority?: number;
  maxParticipations?: number;
  maxPerCustomer?: number;
  globalRewardCap?: number;
  merchantId?: string;
  validFrom: string;
  validUntil: string;
  customerScope?: CustomerScope;
}

export interface CampaignEventSchemaUpsertRequest {
  eventSchema: Record<string, unknown>;
}

export interface CampaignResponse {
  tenantId: string;
  programmeUid: string;
  campaignUid: string;
  name: string;
  description?: string;
  campaignType: string;
  occasionTags?: unknown;
  status: CampaignStatus;
  targetSegment?: CampaignTargetSegment;
  triggerEventType: string;
  eventSchema?: Record<string, unknown> | null;
  offerConfig?: CampaignOfferConfig;
  mutualExclGroup?: string;
  stackMode: StackMode;
  budgetTotal: number;
  budgetConsumed: number;
  budgetConsumedPct: number;
  budgetRemaining: number;
  alertThresholdPct?: number;
  priority?: number;
  maxParticipations?: number;
  maxPerCustomer?: number;
  globalRewardCap?: number;
  merchantId?: string;
  validFrom: string;
  validUntil: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  budgetExceedsApprovalThreshold?: boolean;
  customerScope?: CustomerScope;
  customerCount?: number;
  executionMode?: CampaignExecutionMode;
}

export interface RuleSandboxStatusResponse {
  tenantId: string;
  ruleUid: string;
  campaignUid?: string;
  sandboxPassed: boolean;
  targetedCustomerOk?: boolean;
  customerId?: string;
  passedAt?: string;
}

export interface CampaignSetupStatusResponse {
  campaignUid: string;
  campaignStatus: CampaignStatus;
  executionMode?: CampaignExecutionMode;
  campaignSaved: boolean;
  campaignRuleCreated: boolean;
  campaignRuleUid?: string;
  campaignRuleActive: boolean;
  sandboxPassed: boolean;
  sandboxPassedAt?: string;
  canActivateCampaign: boolean;
  activateBlockReason?: string;
}

export interface CampaignTargetUploadColumnSpec {
  name: string;
  required: boolean;
  dataType: string;
  description: string;
  example: string;
}

export interface CampaignTargetUploadSpecResponse {
  format: string;
  encoding: string;
  maxFileSizeMb: number;
  maxRows: number;
  standardHeaders: string[];
  columns: CampaignTargetUploadColumnSpec[];
  exampleCsv: string;
  exampleFilename: string;
  notes: string[];
}

export interface CampaignTargetUploadResponse {
  uploadUid?: string;
  status?: string;
  totalRowsUploaded?: number;
  importedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  errorReport?: Array<{ row: number; customerId: string; reason: string }>;
  tenantId?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  /** Same CSV file (content hash) already uploaded for this campaign. */
  duplicateFileReplay?: boolean;
}

export interface CampaignTargetCustomerResponse {
  customerId: string;
  addedAt?: string;
  addedBy?: string;
}

export interface CampaignTargetCustomerPageResponse {
  content: CampaignTargetCustomerResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CampaignStatsResponse {
  campaignUid: string;
  campaignName: string;
  status: CampaignStatus;
  budgetTotal: number;
  budgetConsumed: number;
  budgetConsumedPct: number;
  budgetRemaining: number;
  totalParticipations: number;
  uniqueCustomersReached: number;
  totalPointsIssued: number;
  totalCashbackRecorded: number;
}

export interface CampaignParticipationResponse {
  campaignUid: string;
  programmeUid: string;
  customerId: string;
  eventId: string;
  pointsAwarded?: number;
  cashbackAmount?: number;
  participatedAt: string;
}
