"use client";

import { useMemo } from "react";
import type { Project } from "@/types/project";

interface ActivityHeatmapProps {
  projects: Project[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["","Mon","","Wed","","Fri",""];

export default function ActivityHeatmap({ projects }: ActivityHeatmapProps) {
  const { cells, monthLabels, maxCount } = useMemo(() => {
    // Build a map of date → count using createdAt
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const day = p.createdAt.slice(0, 10); // "YYYY-MM-DD"
      counts[day] = (counts[day] ?? 0) + 1;
    }

    // Generate 52 full weeks ending today (Sunday-aligned)
    const today = new Date();
    // Snap to end of current week (Saturday)
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 52 * 7 + 1);

    const cells: { date: string; count: number; col: number; row: number }[] = [];
    const monthLabels: { month: string; col: number }[] = [];

    let d = new Date(startDate);
    let col = 0;
    let lastMonth = -1;

    while (d <= endDate) {
      if (d.getDay() === 0) {
        // Check if new month started this week
        if (d.getMonth() !== lastMonth) {
          monthLabels.push({ month: MONTHS[d.getMonth()], col });
          lastMonth = d.getMonth();
        }
      }
      const row = d.getDay(); // 0=Sun … 6=Sat
      const dateStr = d.toISOString().slice(0, 10);
      cells.push({ date: dateStr, count: counts[dateStr] ?? 0, col, row });

      if (d.getDay() === 6) col++;
      d.setDate(d.getDate() + 1);
    }

    const maxCount = Math.max(1, ...cells.map((c) => c.count));
    return { cells, monthLabels, maxCount };
  }, [projects]);

  function cellColor(count: number) {
    if (count === 0) return "rgba(124,58,237,0.07)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "rgba(124,58,237,0.25)";
    if (intensity < 0.5)  return "rgba(124,58,237,0.5)";
    if (intensity < 0.75) return "rgba(124,58,237,0.75)";
    return "#7c3aed";
  }

  function cellGlow(count: number) {
    if (count === 0) return "none";
    const intensity = Math.min(count / maxCount, 1);
    return `0 0 ${3 + intensity * 6}px rgba(124,58,237,${0.2 + intensity * 0.5})`;
  }

  const CELL = 11;
  const GAP = 2;
  const cols = 52;
  const rows = 7;
  const width = cols * (CELL + GAP);
  const height = rows * (CELL + GAP);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-2">
      <div
        className="rounded-2xl px-6 py-5"
        style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.12)", boxShadow: "0 2px 12px rgba(124,58,237,0.06)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>
            Project Activity
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "#9693b8" }}>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: v === 0 ? "rgba(124,58,237,0.07)" : `rgba(124,58,237,${v})`,
                }}
              />
            ))}
            <span className="text-xs" style={{ color: "#9693b8" }}>More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ position: "relative", minWidth: width + 24 }}>
            {/* Day labels */}
            <div style={{ position: "absolute", left: 0, top: 16 }}>
              {DAYS.map((d, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL + GAP,
                    fontSize: 9,
                    color: "#9693b8",
                    lineHeight: `${CELL + GAP}px`,
                    paddingRight: 4,
                    textAlign: "right",
                    width: 22,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Month labels + grid */}
            <div style={{ paddingLeft: 26 }}>
              {/* Month labels */}
              <div style={{ position: "relative", height: 14, marginBottom: 2 }}>
                {monthLabels.map(({ month, col: c }, i) => (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      left: c * (CELL + GAP),
                      fontSize: 9,
                      color: "#9693b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {month}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
                {cells.map(({ date, count, col: c, row: r }) => (
                  <g key={date}>
                    <rect
                      x={c * (CELL + GAP)}
                      y={r * (CELL + GAP)}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={cellColor(count)}
                      style={{ filter: count > 0 ? `drop-shadow(${cellGlow(count)})` : "none" }}
                    />
                    <title>{date}: {count} project{count !== 1 ? "s" : ""}</title>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
