export type LedgerEntryType = "CREDIT" | "DEBIT" | "EXPIRE" | "REVERSAL" | "ADJUST";

export interface PointsActivityRow {
  reportDate: string;
  entryType: LedgerEntryType | string;
  transactionCount: number;
  totalPoints: number;
  uniqueCustomers: number;
}

export interface RulePerformanceRow {
  ruleUid: string;
  ruleName: string;
  status: string;
  evaluationCount: number;
  successCount: number;
  totalPointsAwarded: number;
}

export interface TierDistributionRow {
  tierName: string;
  rankOrder: number;
  memberCount: number;
  entryThreshold: number;
  pointsMultiplier: number;
}

export interface SegmentAnalysisRow {
  segment: string;
  memberCount: number;
  avgBalance: number;
  totalPointsHeld: number;
}

export interface CohortRetentionRow {
  cohortMonth: string;
  cohortSize: number;
  monthsSinceJoin: number;
  activeCustomers: number;
  retentionPct: number;
}

export interface TierUpgradeCohortRow {
  cohortMonth: string;
  cohortSize: number;
  reachedSilver: number;
  silverPct: number;
  avgDaysToSilver: number | null;
  reachedGold: number;
  goldPct: number;
  avgDaysToGold: number | null;
}

export interface TierVelocityBucketRow {
  upgradeBucket: string;
  memberCount: number;
}

export interface RuleEffectivenessRow {
  cohort: "EXPOSED" | "NOT_EXPOSED" | string;
  memberCount: number;
  totalPointsEarned: number;
  transactionCount: number;
  avgPointsPerMember: number;
}

export interface BreakageMonthlyRow {
  month: string;
  expiredPoints: number;
  customersAffected: number;
  transactionCount: number;
}

export interface BreakageTierRow {
  tierName: string;
  rankOrder: number;
  expiredPoints: number;
  customersAffected: number;
}

export interface UpcomingExpiryMonthRow {
  expiryMonth: string;
  pointsExpiring: number;
  customersAffected: number;
}

export interface ExpiryJobRunRow {
  batchDate: string;
  status: string;
  totalExpired: number | null;
  customersAffected: number | null;
  executedAt: string | null;
}

export interface BreakageExpiryReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  currency: string;
  pointsCurrencyRate: number;
  pointsExpiredInPeriod: number;
  customersAffectedInPeriod: number;
  expireTransactionCount: number;
  monetaryBreakageInPeriod: number;
  pointsExpiredYtd: number;
  monetaryBreakageYtd: number;
  outstandingPointsLiability: number;
  outstandingMonetaryLiability: number;
  pointsExpiringNext30Days: number;
  pointsExpiringNext60Days: number;
  pointsExpiringNext90Days: number;
  monthlyBreakage: BreakageMonthlyRow[];
  breakageByTier: BreakageTierRow[];
  upcomingExpiryByMonth: UpcomingExpiryMonthRow[];
  recentExpiryJobRuns: ExpiryJobRunRow[];
}

export interface EnrollmentTrendRow {
  period: string;
  newEnrollments: number;
}

export interface EnrollmentSourceRow {
  sourceType: string;
  newEnrollments: number;
}

export interface EnrollmentRuleRow {
  ruleUid: string;
  ruleName: string;
  newEnrollments: number;
}

export interface EnrollmentReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  enrollmentDefinition: string;
  newEnrollmentsInPeriod: number;
  newEnrollmentsPriorPeriod: number;
  totalEnrolledMembers: number;
  returningActiveInPeriod: number;
  newEnrollmentsYtd: number;
  periodOverPeriodChangePct: number | null;
  dailyNewEnrollments: EnrollmentTrendRow[];
  monthlyNewEnrollments: EnrollmentTrendRow[];
  enrollmentsBySource: EnrollmentSourceRow[];
  topEnrollmentRules: EnrollmentRuleRow[];
}

export interface ReconciliationMovementRow {
  entryType: string;
  label: string;
  pointsMagnitude: number;
  signedPointsImpact: number;
  transactionCount: number;
  uniqueCustomers: number;
  monetaryValue: number;
}

export interface ReconciliationDailyRow {
  period: string;
  accruals: number;
  redemptions: number;
  expirations: number;
  reversals: number;
  adjustments: number;
  netChange: number;
}

export interface BalanceReconciliationVarianceRow {
  customerId: string;
  expectedBalance: number;
  cachedBalance: number;
  variance: number;
  reconciliationAction: string;
  executedAt: string | null;
}

export interface AccrualRedemptionReconciliationResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  currency: string;
  pointsCurrencyRate: number;
  reportDefinition: string;
  openingPointsLiability: number;
  openingMonetaryLiability: number;
  closingPointsLiabilityLedger: number;
  closingMonetaryLiabilityLedger: number;
  closingPointsLiabilityCache: number;
  closingMonetaryLiabilityCache: number;
  calculatedClosingPoints: number;
  waterfallVariancePoints: number;
  cacheVsLedgerVariancePoints: number;
  reconciliationStatus: "BALANCED" | "VARIANCE_DETECTED" | string;
  accrualsPoints: number;
  redemptionsPoints: number;
  expirationsPoints: number;
  reversalsPoints: number;
  adjustmentsNetPoints: number;
  netChangePoints: number;
  netChangeMonetary: number;
  priorPeriodNetChangePoints: number;
  periodOverPeriodNetChangePct: number | null;
  totalTransactionsInPeriod: number;
  uniqueCustomersInPeriod: number;
  movements: ReconciliationMovementRow[];
  dailyTrend: ReconciliationDailyRow[];
  recentBalanceVariances: BalanceReconciliationVarianceRow[];
}

export interface LiabilityMonthlyMovementRow {
  month: string;
  partialMonth: boolean;
  openingPoints: number;
  openingMonetary: number;
  pointsIssued: number;
  pointsRedeemed: number;
  pointsExpired: number;
  pointsReversed: number;
  adjustmentsNet: number;
  netChangePoints: number;
  netChangeMonetary: number;
  closingPoints: number;
  closingMonetary: number;
}

export interface LiabilityProgrammeRollupRow {
  programmeUid: string;
  memberCount: number;
  outstandingPoints: number;
  outstandingMonetary: number;
  periodPointsIssued: number;
  periodPointsRedeemed: number;
  periodPointsExpired: number;
  periodNetChangePoints: number;
  periodNetChangeMonetary: number;
}

export interface LiabilityTierBreakdownRow {
  tierName: string;
  rankOrder: number;
  memberCount: number;
  pointsLiability: number;
  monetaryLiability: number;
}

export interface FailedTransactionRow {
  source: string;
  transactionType: string;
  programmeUid: string | null;
  customerId: string;
  referenceId: string;
  eventType: string | null;
  errorCategory: string;
  errorCode: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
  processingTimeMs: number | null;
  occurredAt: string | null;
}

export interface FailureCategoryRow {
  category: string;
  transactionType: string;
  failureCount: number;
}

export interface FailureDailyTrendRow {
  period: string;
  accrualFailures: number;
  redemptionFailures: number;
}

export interface FailedAccrualRedemptionReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  reportDefinition: string;
  failedAccrualsInPeriod: number;
  failedRedemptionsInPeriod: number;
  totalFailuresInPeriod: number;
  failedAccrualsPriorPeriod: number;
  failedRedemptionsPriorPeriod: number;
  periodOverPeriodChangePct: number | null;
  accrualAttemptsInPeriod: number;
  redemptionApiAttemptsInPeriod: number;
  accrualFailureRatePct: number;
  redemptionFailureRatePct: number;
  avgFailedAccrualDurationMs: number | null;
  avgFailedRedemptionDurationMs: number | null;
  failuresByCategory: FailureCategoryRow[];
  dailyTrend: FailureDailyTrendRow[];
  recentFailures: FailedTransactionRow[];
}

export interface ReversalAdjustmentLedgerRow {
  ledgerId: number;
  entryType: string;
  programmeUid: string;
  customerId: string;
  points: number;
  signedImpact: number;
  reversalOfLedgerId: number | null;
  originalEntryType: string | null;
  originalPoints: number | null;
  originalCreatedAt: string | null;
  sourceEventId: string | null;
  ruleName: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface ReversalAdjustmentCustomerRow {
  customerId: string;
  reversalCount: number;
  reversalPoints: number;
  adjustmentCount: number;
  adjustmentNetPoints: number;
}

export interface ReversalAdjustmentDailyRow {
  period: string;
  reversalCount: number;
  reversalPoints: number;
  adjustmentCount: number;
  adjustmentNetPoints: number;
}

export type SlaStatus = "MET" | "AT_RISK" | "BREACHED" | "NO_DATA";

export interface SlaComponentMetricRow {
  componentKey: string;
  componentLabel: string;
  totalOperations: number;
  successfulOperations: number;
  successRatePct: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  maxLatencyMs: number | null;
  slaSuccessRateTargetPct: number;
  slaLatencyTargetMs: number | null;
  slaStatus: SlaStatus;
}

export interface SlaEndpointMetricRow {
  operationKey: string;
  operationLabel: string;
  requestCount: number;
  successCount: number;
  successRatePct: number;
  avgLatencyMs: number | null;
  p99LatencyMs: number | null;
}

export interface SlaDailyTrendRow {
  period: string;
  apiRequests: number;
  apiSuccessRatePct: number;
  apiAvgLatencyMs: number | null;
  issuanceAttempts: number;
  issuanceSuccessRatePct: number;
  issuanceAvgLatencyMs: number | null;
  eventProcessingAttempts: number;
  eventSuccessRatePct: number;
  eventAvgLatencyMs: number | null;
}

export interface SlaPerformanceReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  reportDefinition: string;
  overallSlaStatus: SlaStatus;
  totalApiRequests: number;
  overallApiSuccessRatePct: number;
  overallApiP99LatencyMs: number | null;
  totalIssuanceAttempts: number;
  issuanceSuccessRatePct: number;
  issuanceP99LatencyMs: number | null;
  totalEventProcessingAttempts: number;
  eventProcessingSuccessRatePct: number;
  eventProcessingP99LatencyMs: number | null;
  priorPeriodApiSuccessRatePct: number;
  periodOverPeriodApiSuccessChangePct: number | null;
  components: SlaComponentMetricRow[];
  endpointBreakdown: SlaEndpointMetricRow[];
  dailyTrend: SlaDailyTrendRow[];
}

export interface ReversalsAdjustmentsReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  reportDefinition: string;
  reversalCountInPeriod: number;
  reversalPointsInPeriod: number;
  adjustmentCountInPeriod: number;
  adjustmentNetPointsInPeriod: number;
  uniqueCustomersAffected: number;
  reversalCountPriorPeriod: number;
  adjustmentCountPriorPeriod: number;
  periodOverPeriodReversalChangePct: number | null;
  periodOverPeriodAdjustmentChangePct: number | null;
  dailyTrend: ReversalAdjustmentDailyRow[];
  topCustomers: ReversalAdjustmentCustomerRow[];
  reversals: ReversalAdjustmentLedgerRow[];
  adjustments: ReversalAdjustmentLedgerRow[];
}

export interface LiabilityReportResponse {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  currency: string;
  pointsCurrencyRate: number;
  reportDefinition: string;
  outstandingPointsLiability: number;
  outstandingMonetaryLiability: number;
  ledgerClosingPoints: number;
  ledgerClosingMonetary: number;
  ledgerVsCacheVariancePoints: number;
  periodPointsIssued: number;
  periodPointsRedeemed: number;
  periodPointsExpired: number;
  periodPointsReversed: number;
  periodAdjustmentsNet: number;
  periodNetChangePoints: number;
  periodNetChangeMonetary: number;
  openingPointsLiability: number;
  openingMonetaryLiability: number;
  closingPointsLiability: number;
  closingMonetaryLiability: number;
  membersWithBalance: number;
  totalLedgerTransactionsInPeriod: number;
  monthlyMovement: LiabilityMonthlyMovementRow[];
  programmeRollups: LiabilityProgrammeRollupRow[];
  tenantRollup: LiabilityProgrammeRollupRow | null;
  liabilityByTier: LiabilityTierBreakdownRow[];
}
