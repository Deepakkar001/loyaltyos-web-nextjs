import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/onboarding";
import type { DashboardOverview } from "@/types/dashboard";
import { apiClient } from "@/lib/api/client";

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

function mapKpi(raw: { value?: unknown; trendPct?: unknown } | undefined) {
  return {
    value: toNumber(raw?.value),
    trendPct: raw?.trendPct == null ? null : toNumber(raw.trendPct),
  };
}

/** Normalizes BigDecimal JSON shapes from the Java API. */
function mapOverview(data: Record<string, unknown>): DashboardOverview {
  const volumeSeries = Array.isArray(data.volumeSeries)
    ? data.volumeSeries.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          date: String(r.date ?? ""),
          issued: toNumber(r.issued),
          redeemed: toNumber(r.redeemed),
        };
      })
    : [];

  const pe = (data.pointsEconomics ?? {}) as Record<string, unknown>;

  return {
    programmeUid: String(data.programmeUid ?? "default"),
    hasData: Boolean(data.hasData),
    activeMembers: mapKpi(data.activeMembers as Record<string, unknown>),
    pointsIssuedToday: mapKpi(data.pointsIssuedToday as Record<string, unknown>),
    redemptionsToday: mapKpi(data.redemptionsToday as Record<string, unknown>),
    avgOrderValue: mapKpi(data.avgOrderValue as Record<string, unknown>),
    atRiskMemberPct: mapKpi(data.atRiskMemberPct as Record<string, unknown>),
    volumeSeries,
    tierDistribution: (data.tierDistribution as DashboardOverview["tierDistribution"]) ?? [],
    topRules: (data.topRules as DashboardOverview["topRules"]) ?? [],
    topRedemptions: (data.topRedemptions as DashboardOverview["topRedemptions"]) ?? [],
    engagement: {
      activePct: toNumber((data.engagement as Record<string, unknown>)?.activePct),
      segments:
        ((data.engagement as Record<string, unknown>)?.segments as DashboardOverview["engagement"]["segments"]) ??
        [],
    },
    retention: {
      latestRetentionPct:
        (data.retention as Record<string, unknown>)?.latestRetentionPct == null
          ? null
          : toNumber((data.retention as Record<string, unknown>)?.latestRetentionPct),
      cohortMonth: ((data.retention as Record<string, unknown>)?.cohortMonth as string) ?? null,
    },
    pointsEconomics: {
      issuedToday: toNumber(pe.issuedToday),
      redeemedToday: toNumber(pe.redeemedToday),
      netToday: toNumber(pe.netToday),
      burnRatePct30d: toNumber(pe.burnRatePct30d),
    },
    generatedAt: String(data.generatedAt ?? new Date().toISOString()),
  };
}

export const dashboardApi = {
  getOverview: async (programmeUid = "default"): Promise<DashboardOverview> => {
    try {
      const res = await apiClient.get<Record<string, unknown>>("/api/v1/me/dashboard/overview", {
        params: { programmeUid },
      });
      return mapOverview(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const msg =
        axiosErr.response?.data?.message ??
        axiosErr.response?.data?.error ??
        axiosErr.message;
      throw new Error(msg);
    }
  },
};
