"use client";

import { Suspense } from "react";

import { ContactSupportPanel } from "@/components/dashboard/support/ContactSupportPanel";

export default function ContactSupportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground py-8">Loading support…</p>}>
      <ContactSupportPanel />
    </Suspense>
  );
}
