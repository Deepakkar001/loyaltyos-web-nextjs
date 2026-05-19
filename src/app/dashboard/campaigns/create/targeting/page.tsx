import { redirect } from "next/navigation";

export default function CreateCampaignTargetingRedirect() {
  redirect("/dashboard/campaigns/create/budget");
}
