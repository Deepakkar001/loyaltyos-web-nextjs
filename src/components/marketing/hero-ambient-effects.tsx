"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const PARTICLES = [
  { left: "12%", top: "18%", size: 3, delay: 0 },
  { left: "78%", top: "12%", size: 2, delay: 1.2 },
  { left: "65%", top: "72%", size: 4, delay: 0.6 },
  { left: "28%", top: "65%", size: 2, delay: 2 },
  { left: "88%", top: "48%", size: 3, delay: 1.5 },
  { left: "42%", top: "28%", size: 2, delay: 0.9 },
] as const;

export function HeroAmbientEffects() {
  const reduce = usePrefersReducedMotion();

  if (reduce) return null;

  return (
    <>
      {/* Soft centre halo pulse */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[min(520px,80vw)] w-[min(520px,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(98,114,241,0.12) 0%, transparent 68%)",
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p) => (
        <motion.span
          key={`${p.left}-${p.top}`}
          aria-hidden
          className="absolute rounded-full bg-brand-300/60"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{
            duration: 5 + p.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}
