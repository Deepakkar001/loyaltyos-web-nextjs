import { redirect } from "next/navigation";

/** Tenant signup runs in the onboarding wizard (Step 1 account registration). */
export default function RegisterPage() {
  redirect("/onboarding");
}
