import { redirect } from "next/navigation";

export default function CreateCampaignScheduleRedirect() {
  redirect("/dashboard/campaigns/create/basic-info");
}
