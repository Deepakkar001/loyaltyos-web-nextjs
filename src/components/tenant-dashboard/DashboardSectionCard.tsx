import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Frosted-glass dashboard panels — backdrop blur + soft 3D shadow, no border. */
export const dashboardSectionCardClassName =
  "dashboard-section-card rounded-2xl border-0 p-6 ring-0";

export function DashboardSectionCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return <Card className={cn(dashboardSectionCardClassName, className)} {...props} />;
}
