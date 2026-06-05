/** Curated help content — titles map to in-app sections; paths are repo doc references for teams. */

export type SupportDocLink = {
  title: string;
  description: string;
  /** Relative path under repo docs/ for developers cloning the repo */
  docPath: string;
  /** In-app route when available */
  portalHref?: string;
};

export const SUPPORT_DOC_SECTIONS: Array<{ heading: string; links: SupportDocLink[] }> = [
  {
    heading: "Integration & events",
    links: [
      {
        title: "Integration API guide",
        description: "Authentication, process-event payloads, idempotency, and error codes.",
        docPath: "docs/INTEGRATION_API_GUIDE.md",
        portalHref: "/dashboard/integration",
      },
      {
        title: "Postman QA guide",
        description: "End-to-end tenant testing flows including referrals and vouchers.",
        docPath: "docs/postman-qa-complete-guide.md",
      },
      {
        title: "Integration testing",
        description: "Sandbox validation and credential setup.",
        docPath: "docs/postman/INTEGRATION_TESTING_GUIDE.md",
        portalHref: "/dashboard/integration/audit-logs",
      },
    ],
  },
  {
    heading: "Rules, campaigns & referrals",
    links: [
      {
        title: "Rule & reward engine tests",
        description: "How to simulate rules and verify point issuance.",
        docPath: "docs/postman-rule-and-reward-engine-test.md",
        portalHref: "/dashboard/loyalty-rules/my-rules",
      },
      {
        title: "Referral module",
        description: "Programme config, milestones, fraud review, and API behaviour.",
        docPath: "docs/REFERRAL_MODULE_README.md",
        portalHref: "/dashboard/referrals/my-referrals",
      },
      {
        title: "Campaign module readiness",
        description: "Campaign orchestration concepts and portal workflows.",
        docPath: "docs/campaign-module-insight-and-readiness.md",
        portalHref: "/dashboard/campaigns",
      },
    ],
  },
  {
    heading: "Rewards & go-live",
    links: [
      {
        title: "Voucher multi-denomination",
        description: "Catalog denominations and redemption testing.",
        docPath: "docs/postman/MULTI_DENOM_VOUCHER_TEST.md",
        portalHref: "/dashboard/setup/voucher-programs",
      },
      {
        title: "Go-live checklist",
        description: "Validate programme, integration, and activation steps.",
        docPath: "docs/integration-module-handoff.md",
        portalHref: "/dashboard/go-live",
      },
    ],
  },
];

export const SUPPORT_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Why did my integration event not award points?",
    a: "Confirm the customer is enrolled, the rule or campaign is ACTIVE, the event type matches your schema, and the programme UID in the request matches the portal selector. Check Integration → audit logs for the request ID and HTTP status.",
  },
  {
    q: "Referral rewards went to the referrer but balance looks wrong on the API response",
    a: "Process-event responses attribute points to the event customer. Referrer points may be issued separately; use referral list and ledger for the referee. Use evaluationScope REFERRAL when testing referral-only purchase milestones.",
  },
  {
    q: "How do I test in sandbox before production?",
    a: "Generate SANDBOX credentials under Integration, send events to the sandbox base URL, and review audit logs. Promote to PRODUCTION only after go-live checklist passes.",
  },
  {
    q: "Who receives my support case?",
    a: "Cases are stored against your tenant with diagnostic context (tier, recent API errors, optional request ID). Our team uses the case reference for follow-up email.",
  },
];

export const SUPPORT_SHORTCUTS = [
  {
    label: "Integration dashboard",
    href: "/dashboard/integration",
    description: "Credentials, usage stats, recent API activity",
  },
  {
    label: "Referrals",
    href: "/dashboard/referrals/my-referrals",
    description: "Programme setup, list, fraud review",
  },
  {
    label: "Go live",
    href: "/dashboard/go-live",
    description: "Activation checklist",
  },
  {
    label: "Configure programme",
    href: "/dashboard/configure",
    description: "Tiers, earn rules, programme settings",
  },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  INTEGRATION: "Integration & API",
  RULES_CAMPAIGNS: "Rules & campaigns",
  REFERRALS: "Referrals",
  VOUCHERS: "Vouchers & catalog",
  BILLING: "Billing & subscription",
  GO_LIVE: "Go-live & onboarding",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
