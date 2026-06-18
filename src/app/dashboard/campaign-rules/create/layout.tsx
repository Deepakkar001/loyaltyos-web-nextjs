import "reactflow/dist/style.css";

import { RuleCreateFlowProvider } from "@/app/dashboard/loyalty-rules/create/_components/rule-create-flow";

export default function CreateCampaignRuleLayout({ children }: { children: React.ReactNode }) {
  return <RuleCreateFlowProvider kind="campaign">{children}</RuleCreateFlowProvider>;
}
