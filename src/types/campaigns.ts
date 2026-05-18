export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXHAUSTED" | "ENDED";

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
