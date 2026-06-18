"use client";

import { TeamShell } from "@/components/settings/team/team-shell";

export default function TeamSettingsLayout({ children }: { children: React.ReactNode }) {
  return <TeamShell>{children}</TeamShell>;
}
