import Link from "next/link";

const links = [
  { href: "#timeline", label: "Timeline" },
  { href: "#differentiation", label: "Why us" },
  { href: "#proof", label: "Case studies" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
  { href: "/onboarding", label: "Get started" },
] as const;

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5"
      >
        <Link href="/" className="flex items-center gap-2 text-slate-900 font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white text-sm font-bold">
            L
          </span>
          LoyaltyOS
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-2 text-slate-600 hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
