/**
 * Load React Flow styles once for the whole create-rule wizard so Next.js does not
 * preload `conditions/page.css` on unrelated steps (scheduling/review), which
 * triggered Chrome "preloaded but not used" warnings.
 */
import "reactflow/dist/style.css";

export default function CreateRuleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
