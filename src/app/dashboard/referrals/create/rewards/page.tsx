import { ReferralCreateStepPage } from "@/components/dashboard/referrals/create/ReferralCreateStepPage";
import { ReferralCreateRewardsStep } from "@/components/dashboard/referrals/create/steps/ReferralCreateRewardsStep";

export default function ReferralCreateRewardsPage() {
  return (
    <ReferralCreateStepPage stepIndex={2}>
      <ReferralCreateRewardsStep />
    </ReferralCreateStepPage>
  );
}
