"use client";

import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";

interface TimelineViewProps {
  projects: Project[];
  onCardClick?: (project: Project) => void;
  onEdit: (project: Project) => void;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const GRAD_PALETTE = [
  ["#7c3aed", "#db2777"], ["#0ea5e9", "#7c3aed"], ["#059669", "#0ea5e9"],
  ["#d97706", "#db2777"], ["#dc2626", "#7c3aed"], ["#0ea5e9", "#059669"],
  ["#7c3aed", "#dc2626"], ["#db2777", "#d97706"],
];

function projectGradient(name: string): string {
  const [a, b] = GRAD_PALETTE[hashStr(name) % GRAD_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export default function TimelineView({ projects, onCardClick, onEdit }: TimelineViewProps) {
  const sorted = [...projects].sort((a, b) => {
    const da = a.deploymentDate || a.createdAt;
    const db = b.deploymentDate || b.createdAt;
    return db.localeCompare(da);
  });

  if (sorted.length === 0) return null;

  return (
    <div className="relative">
      {/* Vertical accent line */}
      <div
        className="absolute left-5 top-0 bottom-0 w-px"
        style={{ background: "linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(219,39,119,0.2), transparent)", zIndex: 0 }}
      />

      <div className="flex flex-col gap-0">
        {sorted.map((project, i) => {
          const grad = projectGradient(project.name);
          const date = project.deploymentDate
            ? new Date(project.deploymentDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })
            : "—";

          return (
            <div key={project.id} className="relative flex gap-6 pb-8">
              {/* Node dot */}
              <div className="relative z-10 flex-shrink-0 flex flex-col items-center" style={{ width: 40 }}>
                <div
                  className="h-3 w-3 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    background: grad,
                    boxShadow: `0 0 10px ${GRAD_PALETTE[hashStr(project.name) % GRAD_PALETTE.length][0]}55`,
                    border: "2px solid #eeeaff",
                  }}
                />
              </div>

              {/* Card */}
              <div
                className="flex-1 min-w-0 rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(124,58,237,0.12)",
                  cursor: onCardClick ? "pointer" : undefined,
                  animationDelay: `${i * 60}ms`,
                }}
                onClick={() => onCardClick?.(project)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.3)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.12)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.12)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                }}
              >
                {/* Accent top bar */}
                <div className="h-1 w-full" style={{ background: grad }} />

                <div className="flex items-start gap-4 p-4">
                  {/* Thumbnail swatch */}
                  <div className="flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden" style={{ background: grad }}>
                    {project.thumbnail && <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold truncate" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>{project.name}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono" style={{ color: "#475569" }}>{date}</span>
                        <StatusBadge status={project.status} size="sm" />
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                          className="rounded-lg p-1 transition-colors"
                          style={{ color: "#9693b8" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: "#5b5880" }}>
                      {project.description || "No description."}
                    </p>
                    {project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.techStack.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(124,58,237,0.08)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.2)" }}>
                            {t}
                          </span>
                        ))}
                        {project.techStack.length > 4 && (
                          <span className="text-[10px]" style={{ color: "#334155" }}>+{project.techStack.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
