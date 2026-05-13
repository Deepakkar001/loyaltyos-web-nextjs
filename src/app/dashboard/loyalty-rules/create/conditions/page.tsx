/**
 * Server entry for the Conditions step.
 *
 * React Flow's stylesheet must be imported from a Server Component (or route layout),
 * not only from nested client bundles. Otherwise Next may emit `<link rel="preload" as="style">`
 * for `page.css` that the browser considers unused until hydration — Chrome logs a warning.
 *
 * Classic mode ignores these styles; the small global cost avoids the preload warning on diagram mode.
 */
import "reactflow/dist/style.css";

import ConditionsPageClient from "./ConditionsPageClient";

export default function CreateRuleConditionsPage() {
  return <ConditionsPageClient />;
}
