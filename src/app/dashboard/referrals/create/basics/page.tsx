import { ReferralCreateStepPage } from "@/components/dashboard/referrals/create/ReferralCreateStepPage";
import { ReferralCreateBasicsStep } from "@/components/dashboard/referrals/create/steps/ReferralCreateBasicsStep";

export default function ReferralCreateBasicsPage() {
  return (
    <ReferralCreateStepPage stepIndex={0}>
      <ReferralCreateBasicsStep />
    </ReferralCreateStepPage>
  );
}
