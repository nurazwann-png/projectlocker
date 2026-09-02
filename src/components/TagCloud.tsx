"use client";

import { useState } from "react";
import type { Project } from "@/types/project";

interface TagCloudProps {
  projects: Project[];
  activeTag: string;
  onTagClick: (tag: string) => void;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Vivid colors that work on white (dark enough for text, bright enough to pop)
const TAG_COLORS = ["#7c3aed", "#0369a1", "#be185d", "#065f46", "#92400e", "#9a3412", "#4338ca", "#334155"];

function tagColor(tag: string): string {
  return TAG_COLORS[hashStr(tag) % TAG_COLORS.length];
}

export default function TagCloud({ projects, activeTag, onTagClick }: TagCloudProps) {
  const [open, setOpen] = useState(true);

  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.techStack) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const max = sorted[0][1];

  return (
    <div
      className="mb-6 rounded-2xl"
      style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.12)", boxShadow: "0 2px 12px rgba(124,58,237,0.06)" }}
    >
      {/* Header — always visible, clicking toggles */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 transition-colors"
        style={{ borderRadius: open ? "1rem 1rem 0 0" : "1rem" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>
          Tech Tags <span style={{ color: "#c4bfe0", fontWeight: 400 }}>({sorted.length})</span>
        </p>
        <div className="flex items-center gap-3">
          {activeTag && (
            <span
              onClick={(e) => { e.stopPropagation(); onTagClick(""); }}
              className="text-xs font-medium cursor-pointer transition-colors"
              style={{ color: "#7c3aed" }}
            >
              Clear ×
            </span>
          )}
          <svg
            className="h-4 w-4 transition-transform"
            style={{ color: "#9693b8", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Tags — collapsible */}
      {open && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {sorted.map(([tag, count]) => {
            const color = tagColor(tag);
            const isActive = activeTag === tag;
            const weight = count / max;
            const fontSize = 10 + Math.round(weight * 5);
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? "" : tag)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 transition-all"
                style={{
                  fontSize,
                  fontWeight: 600,
                  color: isActive ? "#ffffff" : color,
                  background: isActive ? color : `${color}12`,
                  border: `1px solid ${color}${isActive ? "ff" : "30"}`,
                  boxShadow: isActive ? `0 2px 12px ${color}40` : "none",
                }}
              >
                {tag}
                <span
                  className="rounded-full px-1 text-[9px]"
                  style={{ background: isActive ? "rgba(255,255,255,0.25)" : `${color}18`, color: isActive ? "#fff" : color }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
