import { redirect } from "next/navigation";

/** Legacy URL — integrations UI lives on /dashboard/integration. */
export default function IntegrateRedirectPage() {
  redirect("/dashboard/integration");
}
