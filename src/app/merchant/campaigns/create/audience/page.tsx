import { redirect } from "next/navigation";

export default function MerchantAudienceRedirectPage() {
  redirect("/merchant/campaigns/create/events");
}
