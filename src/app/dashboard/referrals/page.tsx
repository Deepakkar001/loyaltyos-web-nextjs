import { redirect } from "next/navigation";

export default function ReferralsIndexPage() {
  redirect("/dashboard/referrals/my-referrals");
}
