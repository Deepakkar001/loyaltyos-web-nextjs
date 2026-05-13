"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  Layers,
  LogOut,
  Shield,
} from "lucide-react";
import { useAdminStore } from "@/lib/store/admin-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/admin/industry-suggestions", label: "Industry Suggestions", icon: Layers },
  { href: "/admin/audit", label: "Activity Log", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, fullName, email, role, logout } = useAdminStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAdminStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAdminStore.persist.hasHydrated()) setHydrated(true);
    return () => { unsub(); };
  }, []);

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <>{children}</>;

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessToken) {
    router.replace("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">LoyaltyOS</p>
              <p className="text-[10px] font-medium text-amber-400/80 uppercase tracking-widest">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-amber-500/10 text-amber-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5", isActive ? "text-amber-400" : "text-slate-500")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile / Logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-slate-300 truncate">{fullName}</p>
            <p className="text-[10px] text-slate-500 truncate">{email}</p>
            <p className="text-[10px] text-amber-500/70 font-medium mt-0.5">
              {role?.replace(/_/g, " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { logout(); router.replace("/admin/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
