"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";

export type KpiChartType = "line" | "area" | "bar";

type SparkPoint = { x: string; y: number };

function normalizePoints(sparkline: SparkPoint[], chartType: KpiChartType): SparkPoint[] {
  if (sparkline.length === 0) {
    return [
      { x: "—", y: 0 },
      { x: "—", y: 0 },
    ];
  }
  if (sparkline.length === 1 && chartType !== "bar") {
    return [sparkline[0], { ...sparkline[0] }];
  }
  return sparkline;
}

export function KpiSparkline({
  sparkline,
  chartType,
}: {
  sparkline: SparkPoint[];
  chartType: KpiChartType;
}) {
  const data = useMemo(
    () => normalizePoints(sparkline, chartType),
    [sparkline, chartType]
  );

  const values = data.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const allZero = values.every((value) => value === 0);
  const padding = allZero ? 1 : max === min ? Math.max(Math.abs(max) * 0.1, 1) : (max - min) * 0.15;
  const domain: [number, number] = allZero
    ? [0, 1]
    : [min - padding, max + padding];

  return (
    <div className="h-[72px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={domain} />
            <Bar dataKey="y" fill="rgba(255, 255, 255, 0.88)" radius={[4, 4, 0, 0]} minPointSize={3} />
          </BarChart>
        ) : chartType === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={domain} />
            <Area
              type="monotone"
              dataKey="y"
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth={2.5}
              fill="rgba(255, 255, 255, 0.22)"
              dot={false}
              isAnimationActive={values.length <= 31}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={domain} />
            <Line
              type="monotone"
              dataKey="y"
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={values.length <= 31}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
