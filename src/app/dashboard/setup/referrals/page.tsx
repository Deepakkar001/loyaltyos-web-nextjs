import { redirect } from "next/navigation";

/** Legacy setup URL — referrals have their own sidebar section. */
export default function ReferralsSetupRedirectPage() {
  redirect("/dashboard/referrals/my-referrals");
}
