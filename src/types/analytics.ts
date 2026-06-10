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
