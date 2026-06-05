"use client";

import Link from "next/link";
import { BookOpenText, ExternalLink } from "lucide-react";

import { SupportSectionShell } from "@/components/dashboard/support/SupportSectionShell";
import { SUPPORT_DOC_SECTIONS, SUPPORT_FAQ } from "@/lib/support/support-content";

export function DocumentationPanel() {
  return (
    <SupportSectionShell
      title="Documentation"
      description="Guides for integration, rules, referrals, and go-live. Use in-app tools where linked; doc files live in the repository docs/ folder for your engineering team."
    >
      <div className="space-y-8">
        {SUPPORT_DOC_SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {section.heading}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {section.links.map((link) => (
                <li
                  key={link.docPath}
                  className="rounded-lg border bg-card p-4 shadow-sm flex flex-col"
                >
                  <div className="flex items-start gap-2">
                    <BookOpenText className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{link.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">{link.docPath}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {link.portalHref && (
                      <Link
                        href={link.portalHref}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open in portal →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Frequently asked questions
          </h2>
          <dl className="mt-3 space-y-4">
            {SUPPORT_FAQ.map((item) => (
              <div key={item.q} className="rounded-lg border bg-card p-4 shadow-sm">
                <dt className="text-sm font-medium">{item.q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Need more help?{" "}
          <Link href="/dashboard/support/contact" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </SupportSectionShell>
  );
}
