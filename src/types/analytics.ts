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
