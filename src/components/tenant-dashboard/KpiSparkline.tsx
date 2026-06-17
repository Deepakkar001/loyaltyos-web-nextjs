"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useMemo } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler);

export type KpiChartType = "line" | "area" | "bar";

function buildChartConfig(
  sparkline: { x: string; y: number }[],
  chartType: KpiChartType
): { data: ChartData<"line" | "bar">; options: ChartOptions<"line" | "bar"> } {
  const points =
    sparkline.length === 0
      ? [
          { x: "—", y: 0 },
          { x: "—", y: 0 },
        ]
      : sparkline.length === 1 && chartType !== "bar"
        ? [sparkline[0], { ...sparkline[0] }]
        : sparkline;

  const labels = points.map((point) => point.x);
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const allZero = values.every((value) => value === 0);
  const padding = allZero ? 1 : max === min ? Math.max(Math.abs(max) * 0.1, 1) : (max - min) * 0.15;

  const data: ChartData<"line" | "bar"> = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: "rgba(255, 255, 255, 0.95)",
        backgroundColor:
          chartType === "bar"
            ? "rgba(255, 255, 255, 0.88)"
            : chartType === "area"
              ? "rgba(255, 255, 255, 0.22)"
              : "transparent",
        borderWidth: chartType === "bar" ? 0 : 2.5,
        borderRadius: chartType === "bar" ? 4 : 0,
        borderSkipped: false,
        fill: chartType === "area",
        tension: chartType === "line" || chartType === "area" ? 0.42 : 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        ...(chartType === "bar" ? { minBarLength: 3 } : {}),
      },
    ],
  };

  const options: ChartOptions<"line" | "bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: values.length > 31 ? 0 : 320,
      easing: "easeOutQuart",
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        display: false,
        grid: { display: false },
      },
      y: {
        display: false,
        min: allZero ? 0 : min - padding,
        max: allZero ? 1 : max + padding,
        grid: { display: false },
      },
    },
    layout: {
      padding: { top: 4, bottom: 0, left: 0, right: 0 },
    },
  };

  return { data, options };
}

export function KpiSparkline({
  sparkline,
  chartType,
}: {
  sparkline: { x: string; y: number }[];
  chartType: KpiChartType;
}) {
  const { data, options } = useMemo(
    () => buildChartConfig(sparkline, chartType),
    [sparkline, chartType]
  );

  return (
    <div className="h-[72px] w-full min-w-0">
      {chartType === "bar" ? (
        <Bar data={data as ChartData<"bar">} options={options as ChartOptions<"bar">} />
      ) : (
        <Line data={data as ChartData<"line">} options={options as ChartOptions<"line">} />
      )}
    </div>
  );
}
