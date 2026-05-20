"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const CELL = 48;
const SPOT_LENGTH = 96;
/** Pixels per second — keeps spotlight speed consistent on long lines */
const TRAVEL_SPEED = 140;

type GridLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  delay: number;
};

function buildLines(width: number, height: number): GridLine[] {
  if (width <= 0 || height <= 0) return [];

  const lines: GridLine[] = [];
  let index = 0;

  for (let y = 0; y <= height; y += CELL) {
    lines.push({
      id: `h-${y}`,
      x1: 0,
      y1: y,
      x2: width,
      y2: y,
      length: width,
      delay: index * 0.12,
    });
    index += 1;
  }

  for (let x = 0; x <= width; x += CELL) {
    lines.push({
      id: `v-${x}`,
      x1: x,
      y1: 0,
      x2: x,
      y2: height,
      length: height,
      delay: index * 0.12,
    });
    index += 1;
  }

  return lines;
}

export function HeroMatrixSpotlight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      setSize({ width: Math.ceil(width), height: Math.ceil(height) });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const lines = useMemo(() => buildLines(size.width, size.height), [size.width, size.height]);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width || 1} ${size.height || 1}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-spot-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(165,184,252,0)" />
            <stop offset="35%" stopColor="rgba(165,184,252,0.55)" />
            <stop offset="50%" stopColor="rgba(200,214,254,0.95)" />
            <stop offset="65%" stopColor="rgba(165,184,252,0.55)" />
            <stop offset="100%" stopColor="rgba(165,184,252,0)" />
          </linearGradient>
          <linearGradient id="hero-spot-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(165,184,252,0)" />
            <stop offset="35%" stopColor="rgba(165,184,252,0.55)" />
            <stop offset="50%" stopColor="rgba(200,214,254,0.95)" />
            <stop offset="65%" stopColor="rgba(165,184,252,0.55)" />
            <stop offset="100%" stopColor="rgba(165,184,252,0)" />
          </linearGradient>
          <filter id="hero-spot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static matrix grid */}
        {lines.map((line) => (
          <line
            key={`base-${line.id}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Traveling spotlight on each line */}
        {!reduce &&
          lines.map((line) => {
            const dashGap = line.length + SPOT_LENGTH;
            const duration = dashGap / TRAVEL_SPEED;

            return (
              <motion.line
                key={`spot-${line.id}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.id.startsWith("h") ? "url(#hero-spot-h)" : "url(#hero-spot-v)"}
                strokeWidth={2}
                strokeLinecap="round"
                filter="url(#hero-spot-glow)"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={`${SPOT_LENGTH} ${dashGap}`}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -dashGap }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: "linear",
                  delay: line.delay,
                }}
              />
            );
          })}
      </svg>
    </div>
  );
}
