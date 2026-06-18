import {
  MERCHANT_SETTLEMENT_CYCLES,
  type MerchantSettlementCycle,
} from "@/lib/merchants/settlement-cycles";

const VALID_CYCLES = new Set<string>(MERCHANT_SETTLEMENT_CYCLES.map((c) => c.value));

export function resolveSettlementCycle(value?: string | null): MerchantSettlementCycle {
  const normalized = value?.trim().toUpperCase();
  if (normalized && VALID_CYCLES.has(normalized)) {
    return normalized as MerchantSettlementCycle;
  }
  return "MONTHLY";
}
