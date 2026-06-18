import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loyalty Programmes",
  description:
    "Enterprise-grade loyalty with honest 4–6 week launches, API-guided integrations, transparent setup hours, and dashboards leadership trusts.",
  icons: { icon: "/images/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
