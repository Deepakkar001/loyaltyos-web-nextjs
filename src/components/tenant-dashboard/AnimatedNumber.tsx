"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({
  value,
  format,
  durationMs = 500,
}: {
  value: number;
  format?: (v: number) => string;
  durationMs?: number;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (latest) => {
    const v = Number.isFinite(latest) ? latest : 0;
    return format ? format(v) : Math.round(v).toLocaleString();
  });

  useEffect(() => {
    const controls = animate(mv, value, { duration: durationMs / 1000, ease: "easeOut" });
    return () => controls.stop();
  }, [mv, value, durationMs]);

  return (
    <motion.span
      style={{
        display: "inline-block",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
      }}
    >
      {rounded}
    </motion.span>
  );
}

