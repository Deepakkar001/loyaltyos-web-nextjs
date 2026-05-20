import { redirect } from "next/navigation";

/** Legacy settings URL — integrations UI lives on /dashboard/integrate. */
export default function SettingsIntegrationsRedirectPage() {
  redirect("/dashboard/integrate");
}
