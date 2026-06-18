import { redirect } from "next/navigation";

export default function CreateCampaignPage() {
  redirect("/dashboard/campaigns/create/basic-info");
}
