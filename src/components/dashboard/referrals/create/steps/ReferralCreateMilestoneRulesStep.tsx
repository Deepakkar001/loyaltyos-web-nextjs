"use client";

import { ReferralMilestoneRulesEditor } from "@/components/dashboard/referrals/ReferralMilestoneRulesEditor";
import { rulesToDisplay } from "@/lib/referrals/referral-defaults";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreateMilestoneRulesStep() {
  const {
    programmeUid,
    config,
    setConfig,
    ruleSchema,
    setProgrammeMilestoneTypes,
  } = useReferralProgramme();

  return (
    <ReferralMilestoneRulesEditor
      programmeUid={programmeUid}
      rules={config.milestoneRules ?? []}
      schema={ruleSchema}
      onChange={(milestoneRules) => {
        setConfig((c) => ({ ...c, milestoneRules }));
        setProgrammeMilestoneTypes(rulesToDisplay(milestoneRules));
      }}
    />
  );
}
