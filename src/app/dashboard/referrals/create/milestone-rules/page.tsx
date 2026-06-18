import { ReferralCreateStepPage } from "@/components/dashboard/referrals/create/ReferralCreateStepPage";
import { ReferralCreateMilestoneRulesStep } from "@/components/dashboard/referrals/create/steps/ReferralCreateMilestoneRulesStep";

export default function ReferralCreateMilestoneRulesPage() {
  return (
    <ReferralCreateStepPage stepIndex={1}>
      <ReferralCreateMilestoneRulesStep />
    </ReferralCreateStepPage>
  );
}
