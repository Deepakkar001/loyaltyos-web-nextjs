"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { CampaignFormProvider } from "@/components/campaigns/campaign-create-context";
import {
  clearCampaignCreateDraft,
  isBrowserPageReload,
} from "@/lib/store/campaign-draft-storage";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

const CREATE_BASE = "/dashboard/campaigns/create";
const CREATE_START = `${CREATE_BASE}/basic-info`;

export default function CreateCampaignLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const reloadRedirectRef = useRef(false);

  useEffect(() => {
    if (!isBrowserPageReload() || reloadRedirectRef.current) return;
    reloadRedirectRef.current = true;
    if (tenantId) clearCampaignCreateDraft(tenantId);
    if (pathname !== CREATE_START && !pathname.endsWith("/basic-info")) {
      router.replace(CREATE_START);
    }
  }, [pathname, router, tenantId]);

  return <CampaignFormProvider mode="create">{children}</CampaignFormProvider>;
}
