"use client";

import { useParams } from "next/navigation";

import { MerchantAgreementStepForm } from "@/components/dashboard/merchants/MerchantAgreementStepForm";

export default function MerchantAgreementStepPage() {
  const params = useParams();
  const merchantUid = typeof params.merchantUid === "string" ? params.merchantUid : "";

  if (!merchantUid) return null;

  return <MerchantAgreementStepForm merchantUid={merchantUid} />;
}
