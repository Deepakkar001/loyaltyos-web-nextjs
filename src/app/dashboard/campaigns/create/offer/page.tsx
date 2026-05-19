import { redirect } from "next/navigation";

export default function CreateCampaignOfferRedirect() {
  redirect("/dashboard/campaigns/create/budget");
}
