"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type AnimatedSectionProps = {
  id?: string;
  "aria-labelledby"?: string;
  className?: string;
  children: ReactNode;
};

export function AnimatedSection({ id, "aria-labelledby": labelledBy, className, children }: AnimatedSectionProps) {
  const reduce = useReducedMotion();

  return (
    <section id={id} aria-labelledby={labelledBy} className={className}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-64px" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}
