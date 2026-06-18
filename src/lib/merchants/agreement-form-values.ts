import { resolveSettlementCycle } from "@/lib/merchants/resolve-settlement-cycle";
import type { MerchantAgreementPrefill, MerchantAgreementResponse } from "@/types/merchant";

export type MerchantAgreementFormValues = {
  effectiveDate: string;
  revenueSharePct: number;
  settlementCycle: string;
  pointsCurrency: string;
  expectedDailyTxnVolume?: number;
  billingContactName: string;
  billingAddress: string;
  paymentMethod: string;
  contractDurationMonths: number;
  autoRenewal: boolean;
  proposedEarnRateMultiplier: number;
  merchantFundedCampaignsAllowed: boolean;
  signedByName: string;
  signedByEmail: string;
  signedByDesignation: string;
  termsAccepted: boolean;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value?: string | null): string {
  if (!value) return todayIsoDate();
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function buildAgreementFormValues(
  prefill: MerchantAgreementPrefill,
  saved?: MerchantAgreementResponse | null
): MerchantAgreementFormValues {
  if (saved) {
    return {
      effectiveDate: toIsoDate(saved.effectiveDate),
      revenueSharePct: Number(saved.revenueSharePct ?? 2.5),
      settlementCycle: resolveSettlementCycle(saved.settlementCycle),
      pointsCurrency: saved.pointsCurrency ?? "INR",
      expectedDailyTxnVolume: saved.expectedDailyTxnVolume,
      billingContactName: saved.billingContactName ?? "",
      billingAddress: saved.billingAddress ?? "",
      paymentMethod: saved.paymentMethod ?? "",
      contractDurationMonths: saved.contractDurationMonths ?? 12,
      autoRenewal: saved.autoRenewal ?? true,
      proposedEarnRateMultiplier: Number(saved.proposedEarnRateMultiplier ?? prefill.earnRateMultiplier ?? 1.5),
      merchantFundedCampaignsAllowed: saved.merchantFundedCampaignsAllowed,
      signedByName: saved.signedByName,
      signedByEmail: saved.signedByEmail,
      signedByDesignation: saved.signedByDesignation ?? "",
      termsAccepted: true,
    };
  }

  return {
    effectiveDate: todayIsoDate(),
    revenueSharePct: 2.5,
    settlementCycle: resolveSettlementCycle(prefill.settlementCycle),
    pointsCurrency: "INR",
    billingContactName: "",
    billingAddress: "",
    paymentMethod: "",
    contractDurationMonths: 12,
    autoRenewal: true,
    proposedEarnRateMultiplier: Number(prefill.earnRateMultiplier ?? 1.5),
    merchantFundedCampaignsAllowed: true,
    signedByName: "",
    signedByEmail: prefill.contactEmail ?? "",
    signedByDesignation: "",
    termsAccepted: false,
  };
}
