import { LandingPage } from "@/components/marketing/landing-page";

export default function RootPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Skip to main content
      </a>
      <LandingPage />
    </>
  );
}
