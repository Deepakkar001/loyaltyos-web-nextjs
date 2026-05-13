import { redirect } from "next/navigation";

export default function RuleUidIndex({ params }: { params: { ruleUid: string } }) {
  redirect(`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(params.ruleUid)}/details`);
}

