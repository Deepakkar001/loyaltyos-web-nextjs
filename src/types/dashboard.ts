import type { SegmentAnalysisRow, TierDistributionRow } from "@/types/analytics";

export interface DashboardKpiMetric {
  value: number;
  trendPct: number | null;
}

export interface DashboardVolumePoint {
  date: string;
  issued: number;
  redeemed: number;
}

export interface DashboardTopRuleRow {
  ruleUid: string;
  ruleName: string;
  evaluationCount: number;
  totalPointsAwarded: number;
}

export interface DashboardRedemptionRow {
  label: string;
  redemptionCount: number;
  totalPoints: number;
}

export interface DashboardEngagementSummary {
  activePct: number;
  segments: SegmentAnalysisRow[];
}

export interface DashboardRetentionSummary {
  latestRetentionPct: number | null;
  cohortMonth: string | null;
}

export interface DashboardPointsEconomics {
  issuedToday: number;
  redeemedToday: number;
  netToday: number;
  burnRatePct30d: number;
}

export interface DashboardOverview {
  programmeUid: string;
  hasData: boolean;
  activeMembers: DashboardKpiMetric;
  pointsIssuedToday: DashboardKpiMetric;
  redemptionsToday: DashboardKpiMetric;
  avgOrderValue: DashboardKpiMetric;
  atRiskMemberPct: DashboardKpiMetric;
  volumeSeries: DashboardVolumePoint[];
  tierDistribution: TierDistributionRow[];
  topRules: DashboardTopRuleRow[];
  topRedemptions: DashboardRedemptionRow[];
  engagement: DashboardEngagementSummary;
  retention: DashboardRetentionSummary;
  pointsEconomics: DashboardPointsEconomics;
  generatedAt: string;
}
