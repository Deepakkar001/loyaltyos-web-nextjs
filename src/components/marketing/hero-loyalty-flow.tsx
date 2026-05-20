"use client";

import { motion } from "framer-motion";
import type { Transition } from "framer-motion";
import { BarChart3, Coins, ShoppingBag } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const STEPS = [
  { icon: ShoppingBag, label: "Purchase", sub: "Events" },
  { icon: Coins, label: "Earn points", sub: "Rules engine" },
  { icon: BarChart3, label: "Analyse", sub: "Live insights" },
] as const;

const TRAVEL_DURATION = 6;

const travelTransition: Transition = {
  duration: TRAVEL_DURATION,
  repeat: Infinity,
  ease: "linear",
  repeatDelay: 0,
};

/** Smooth fade in/out for icon bloom (spotlight stays linear) */
const bloomTransition: Transition = {
  duration: TRAVEL_DURATION,
  repeat: Infinity,
  ease: "easeInOut",
  repeatDelay: 0,
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Soft bell-shaped blink synced to each icon along the track */
function stepBlinkKeyframes(stepIndex: number) {
  const peak = stepIndex * 0.5;
  const spread = 0.09;

  const opacity = [0, 0, 0.35, 0.72, 1, 0.72, 0.35, 0, 0] as const;
  const opacityTimes = [
    0,
    clamp01(peak - spread),
    clamp01(peak - spread * 0.55),
    clamp01(peak - 0.015),
    clamp01(peak),
    clamp01(peak + 0.015),
    clamp01(peak + spread * 0.55),
    clamp01(peak + spread),
    1,
  ] as const;

  const scale = [1, 1, 1.01, 1.03, 1.04, 1.03, 1.01, 1, 1] as const;
  const scaleTimes = opacityTimes;

  if (stepIndex === 0) {
    return {
      opacity: [1, 0.72, 0.35, 0, 0, 0, 0, 0, 0] as const,
      opacityTimes: [0, 0.03, 0.065, 0.1, 0.14, 0.5, 1, 1, 1] as const,
      scale: [1.04, 1.03, 1.01, 1, 1, 1, 1, 1, 1] as const,
      scaleTimes: [0, 0.03, 0.065, 0.1, 0.14, 0.5, 1, 1, 1] as const,
    };
  }

  if (stepIndex === 2) {
    return {
      opacity: [0, 0, 0, 0, 0.35, 0.72, 1, 0.72, 0.35] as const,
      opacityTimes: [0, 0.86, 0.9, 0.92, 0.94, 0.96, 0.98, 0.995, 1] as const,
      scale: [1, 1, 1, 1, 1.01, 1.03, 1.04, 1.03, 1.01] as const,
      scaleTimes: [0, 0.86, 0.9, 0.92, 0.94, 0.96, 0.98, 0.995, 1] as const,
    };
  }

  return { opacity, opacityTimes, scale, scaleTimes };
}

export function HeroLoyaltyFlow() {
  const reduce = usePrefersReducedMotion();

  return (
    <motion.div
      className="mx-auto w-full max-w-3xl"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 backdrop-blur-sm">
        <div className="relative grid grid-cols-3 items-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-1/2 z-[1] h-2 -translate-y-1/2 overflow-visible"
          >
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
            {!reduce && (
              <motion.div
                className="absolute top-1/2 h-px w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-brand-200/95 to-transparent shadow-[0_0_10px_rgba(165,184,252,0.85),0_0_4px_rgba(98,114,241,0.5)]"
                animate={{ left: ["0%", "100%"] }}
                transition={travelTransition}
              />
            )}
          </div>

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const blink = stepBlinkKeyframes(i);

            return (
              <div key={step.label} className="relative z-10 flex justify-center">
                <div className="relative">
                  {!reduce && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute -inset-3 rounded-2xl bg-brand-400/55 blur-xl transition-opacity"
                      animate={{ opacity: [...blink.opacity] }}
                      transition={{ ...bloomTransition, times: [...blink.opacityTimes] }}
                    />
                  )}

                  {!reduce && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute -inset-0.5 rounded-xl border-2 border-brand-300/70"
                      animate={{ opacity: [...blink.opacity] }}
                      transition={{ ...bloomTransition, times: [...blink.opacityTimes] }}
                    />
                  )}

                  <motion.div
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-brand-950/80"
                    animate={
                      reduce
                        ? undefined
                        : {
                            scale: [...blink.scale],
                            borderColor: [
                              "rgba(255,255,255,0.12)",
                              "rgba(255,255,255,0.12)",
                              "rgba(165,184,252,0.45)",
                              "rgba(165,184,252,0.65)",
                              "rgba(165,184,252,0.75)",
                              "rgba(165,184,252,0.65)",
                              "rgba(165,184,252,0.45)",
                              "rgba(255,255,255,0.12)",
                              "rgba(255,255,255,0.12)",
                            ],
                          }
                    }
                    transition={
                      reduce
                        ? undefined
                        : {
                            scale: { ...bloomTransition, times: [...blink.scaleTimes] },
                            borderColor: { ...bloomTransition, times: [...blink.opacityTimes] },
                          }
                    }
                  >
                    <Icon className="h-5 w-5 text-brand-300" />
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {STEPS.map((step) => (
            <div key={step.label} className="text-center">
              <p className="text-xs font-semibold text-white">{step.label}</p>
              <p className="text-[10px] text-white/45">{step.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
