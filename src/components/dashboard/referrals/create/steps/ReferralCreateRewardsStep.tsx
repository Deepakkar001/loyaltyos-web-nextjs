"use client";

import { ReferralStageEditor } from "@/components/dashboard/referrals/ReferralStageEditor";
import type { ReferralStageConfig } from "@/lib/api/client";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreateRewardsStep() {
  const { config, setConfig, programmeMilestoneTypes, enabledRuleKeys } = useReferralProgramme();

  return (
    <ReferralStageEditor
      stages={config.stages}
      milestoneTypes={programmeMilestoneTypes}
      enabledRuleKeys={enabledRuleKeys}
      onChange={(stages: ReferralStageConfig[]) => setConfig((c) => ({ ...c, stages }))}
    />
  );
}
