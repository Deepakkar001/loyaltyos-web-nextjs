import Link from "next/link";
import { ArrowRight, Shield, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-2.5 mb-12">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold">L</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">
            LoyaltyOS
          </span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
          Launch your loyalty
          <br />
          programme today
        </h1>
        <p className="text-brand-300 text-lg mb-10 leading-relaxed">
          Go from zero to a fully configured loyalty programme in under 4 hours.
          No code required.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Zap className="w-4 h-4" />, label: "Setup in 4 hours" },
            { icon: <Star className="w-4 h-4" />, label: "No code required" },
            { icon: <Shield className="w-4 h-4" />, label: "Enterprise grade" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <div className="text-brand-400">{item.icon}</div>
              <span className="text-white/70 text-xs font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <Link href="/onboarding">
          <Button
            size="lg"
            className="w-full bg-brand-500 hover:bg-brand-400 text-white text-base h-14 rounded-xl"
          >
            Start for free <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>

        <p className="text-white/30 text-sm mt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
