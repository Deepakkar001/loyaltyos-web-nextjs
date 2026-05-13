"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type AnimatedSectionProps = {
  id?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
};

export function AnimatedSection({ id, "aria-labelledby": labelledBy, className, children }: AnimatedSectionProps) {
  const reduce = usePrefersReducedMotion();

  const motionProps = reduce
    ? {
        initial: false as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0 } as const,
      }
    : {
        initial: { opacity: 0, y: 20 } as const,
        whileInView: { opacity: 1, y: 0 } as const,
        viewport: { once: true, margin: "-64px" } as const,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <section id={id} aria-labelledby={labelledBy} className={className}>
      <motion.div {...motionProps}>{children}</motion.div>
    </section>
  );
}
