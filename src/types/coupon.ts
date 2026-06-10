export type CouponType =
  | "FIXED_DISCOUNT"
  | "PCT_DISCOUNT"
  | "FREE_ITEM"
  | "CASHBACK"
  | "POINTS_BONUS";

export type CouponStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";

export type CouponUsageType = "SINGLE_USE" | "MULTI_USE";

export type CouponConstraints = {
  minOrderAmount?: number | string | null;
  maxDiscountCap?: number | string | null;
  allowedChannels?: string[];
  categoryIds?: string[];
  freeItemSku?: string | null;
  freeItemLabel?: string | null;
  currency?: string | null;
};

export type CouponResponse = {
  couponUid: string;
  programmeUid: string;
  name: string;
  description?: string | null;
  couponCode: string;
  couponType: CouponType;
  discountValue?: number | string | null;
  discountPct?: number | string | null;
  status: CouponStatus;
  usageType: CouponUsageType;
  maxRedemptions: number;
  redemptionCount: number;
  maxRedemptionsPerCustomer: number;
  stackable: boolean;
  targetCustomerId?: string | null;
  campaignUid?: string | null;
  validFrom?: string | null;
  validUntil: string;
  constraints?: CouponConstraints | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CouponCreateRequest = {
  programmeUid: string;
  name: string;
  description?: string;
  couponCode: string;
  couponType: CouponType;
  discountValue?: number | string | null;
  discountPct?: number | string | null;
  usageType: CouponUsageType;
  maxRedemptions?: number;
  maxRedemptionsPerCustomer?: number;
  stackable?: boolean;
  targetCustomerId?: string | null;
  campaignUid?: string | null;
  validFrom?: string | null;
  validUntil: string;
  constraints?: CouponConstraints | null;
  activateImmediately?: boolean;
};

export type CouponRedemptionListItem = {
  redemptionUid: string;
  customerId: string;
  orderId: string;
  channel?: string | null;
  orderAmount?: number | string | null;
  discountAmount?: number | string | null;
  pointsCredited?: number | string | null;
  status: string;
  redeemedAt: string;
};

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  FIXED_DISCOUNT: "Fixed amount off",
  PCT_DISCOUNT: "Percentage off",
  FREE_ITEM: "Free item",
  CASHBACK: "Cashback",
  POINTS_BONUS: "Bonus points",
};

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  EXHAUSTED: "Exhausted",
};

export type CouponUsageSummary = {
  programmeUid: string;
  fromDate: string;
  toDate: string;
  totalCoupons: number;
  activeCoupons: number;
  redemptionsInPeriod: number;
  redemptionsPriorPeriod: number;
  uniqueCustomersInPeriod: number;
  totalDiscountInPeriod: number;
  totalOrderValueInPeriod: number;
  totalPointsCreditedInPeriod: number;
  periodOverPeriodChangePct?: number | null;
  currency: string;
};

export type CouponUsageTrendRow = {
  period: string;
  redemptions: number;
  discountTotal: number;
  orderValueTotal: number;
  pointsCredited: number;
};

export type CouponChannelBreakdownRow = {
  channel: string;
  redemptions: number;
  discountTotal: number;
  orderValueTotal: number;
};

export type CouponTypeBreakdownRow = {
  couponType: string;
  redemptions: number;
  discountTotal: number;
  pointsCredited: number;
};

export type CouponPerformanceRow = {
  couponUid: string;
  couponCode: string;
  couponName: string;
  couponType: string;
  status: string;
  maxRedemptions: number;
  redemptionsInPeriod: number;
  redemptionsAllTime: number;
  discountInPeriod: number;
  utilizationPct?: number | null;
  avgDiscountPerRedemption: number;
};

export type CouponUsageReportResponse = {
  summary: CouponUsageSummary;
  dailyRedemptions: CouponUsageTrendRow[];
  byChannel: CouponChannelBreakdownRow[];
  byCouponType: CouponTypeBreakdownRow[];
  coupons: CouponPerformanceRow[];
};
