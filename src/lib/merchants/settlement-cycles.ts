/** Matches backend {@code com.loyaltyos.merchants.enums.SettlementCycle}. */
export const MERCHANT_SETTLEMENT_CYCLES = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Fortnightly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export type MerchantSettlementCycle = (typeof MERCHANT_SETTLEMENT_CYCLES)[number]["value"];
