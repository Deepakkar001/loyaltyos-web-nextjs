import { ReferralCreateStepPage } from "@/components/dashboard/referrals/create/ReferralCreateStepPage";
import { ReferralCreatePoliciesStep } from "@/components/dashboard/referrals/create/steps/ReferralCreatePoliciesStep";

export default function ReferralCreatePoliciesPage() {
  return (
    <ReferralCreateStepPage stepIndex={3}>
      <ReferralCreatePoliciesStep />
    </ReferralCreateStepPage>
  );
}
