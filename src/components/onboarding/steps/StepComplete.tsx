"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, BookOpen, Code2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/lib/store/onboarding-store";

export function CompleteStep() {
  const { companyName, generatedKeys } = useOnboardingStore();

  const quickLinks = [
    { icon: <Code2 className="w-4 h-4" />, label: "View API Documentation", href: "/docs/api" },
    { icon: <BookOpen className="w-4 h-4" />, label: "Integration Guides", href: "/docs/guides" },
    { icon: <BarChart3 className="w-4 h-4" />, label: "Go to Dashboard", href: "/dashboard" },
  ];

  return (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          You&apos;re all set{companyName ? `, ${companyName.split(" ")[0]}` : ""}! 🎉
        </h1>
        <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto mb-10">
          Your loyalty programme is configured and your sandbox keys are ready.
          Our team will review your agreement and activate your account within 1 business day.
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
          <div className="space-y-3">
            {[
              { label: "Account created", done: true },
              { label: "Email verified", done: true },
              { label: "Agreement submitted", done: true },
              { label: "Programme configured", done: true },
              { label: "API keys generated", done: !!generatedKeys },
              { label: "Agreement approved by LoyaltyOS team", done: false, pending: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.done
                      ? "bg-emerald-500"
                      : item.pending
                        ? "bg-amber-200"
                        : "bg-surface-200"
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    item.done ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
                {item.pending && (
                  <span className="ml-auto text-xs text-amber-600 font-medium">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-surface-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200"
            >
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
                {link.icon}
              </div>
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                {link.label}
              </span>
            </a>
          ))}
        </div>

        <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">
          Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

