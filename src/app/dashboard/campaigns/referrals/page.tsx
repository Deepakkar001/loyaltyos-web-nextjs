import { redirect } from "next/navigation";

/** Legacy URL under Campaigns — referrals have their own sidebar section. */
export default function CampaignReferralsRedirectPage() {
  redirect("/dashboard/referrals/my-referrals");
}
