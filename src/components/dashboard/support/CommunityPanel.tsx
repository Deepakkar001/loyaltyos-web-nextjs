"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SupportSectionShell } from "@/components/dashboard/support/SupportSectionShell";
import { cn } from "@/lib/utils";

export function CommunityPanel() {
  return (
    <SupportSectionShell
      title="Community forum"
      description="Peer discussions and solution sharing are on the roadmap. Until then, use documentation and support cases."
    >
      <div className="rounded-lg border bg-card p-8 shadow-sm text-center max-w-lg mx-auto">
        <CircleHelp className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-4 text-lg font-semibold">Coming soon</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We are planning a moderated community space for LoyaltyOS operators. You will be able to
          share integration patterns, campaign ideas, and troubleshooting tips with other tenants.
        </p>
        <Link
          href="/dashboard/support/contact"
          className={cn(buttonVariants(), "mt-6 inline-flex rounded-full")}
        >
          Contact support instead
        </Link>
      </div>
    </SupportSectionShell>
  );
}
