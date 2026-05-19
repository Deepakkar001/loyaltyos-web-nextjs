import { redirect } from "next/navigation";

export default function CreateCampaignParallelRedirect() {
  redirect("/dashboard/campaigns/create/budget");
}
