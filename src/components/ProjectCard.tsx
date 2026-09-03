"use client";

import { useRef, useState } from "react";
import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";
import CommentSection from "./CommentSection";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string;
  onDuplicate?: (project: Project) => void;
  onCardClick?: (project: Project) => void;
  onPin?: (id: string) => void;
  onThumbnailChange?: (id: string, url: string | null) => void;
  onView?: (id: string) => void;
  index?: number;
  readOnly?: boolean;
}

const GRAD_PALETTE = [
  ["#7c3aed", "#db2777"],
  ["#0ea5e9", "#7c3aed"],
  ["#059669", "#0ea5e9"],
  ["#d97706", "#db2777"],
  ["#dc2626", "#7c3aed"],
  ["#0ea5e9", "#059669"],
  ["#7c3aed", "#dc2626"],
  ["#db2777", "#d97706"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function healthScore(project: Project): number {
  let score = 100;
  if (project.status === "Maintenance") score -= 20;
  if (project.status === "Deprecated") score -= 60;
  const dateStr = project.deploymentDate?.trim() || project.createdAt;
  const ageYears = (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000);
  score -= Math.min(30, Math.floor(ageYears * 5));
  return Math.max(0, Math.min(100, score));
}

function healthColor(score: number) {
  if (score >= 75) return "#059669";
  if (score >= 45) return "#d97706";
  return "#dc2626";
}

function projectGradient(name: string): string {
  const idx = hashStr(name) % GRAD_PALETTE.length;
  const [a, b] = GRAD_PALETTE[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

const TAG_MAP: Record<string, string> = {
  react: "tag-cyan", "react.js": "tag-cyan", reactjs: "tag-cyan",
  typescript: "tag-blue", ts: "tag-blue",
  "next.js": "tag-slate", nextjs: "tag-slate",
  javascript: "tag-yellow", js: "tag-yellow",
  python: "tag-yellow", vue: "tag-emerald", "vue.js": "tag-emerald", svelte: "tag-orange",
  node: "tag-emerald", "node.js": "tag-emerald", nodejs: "tag-emerald",
  tailwind: "tag-cyan", tailwindcss: "tag-cyan",
  prisma: "tag-blue", postgres: "tag-blue", postgresql: "tag-blue",
  mysql: "tag-orange", mongodb: "tag-emerald", redis: "tag-rose",
  graphql: "tag-rose", docker: "tag-blue", go: "tag-cyan",
  rust: "tag-orange", php: "tag-violet", laravel: "tag-rose",
  django: "tag-emerald", flask: "tag-slate", fastapi: "tag-emerald",
};

function tagClass(tag: string): string {
  const key = tag.toLowerCase().trim();
  if (TAG_MAP[key]) return TAG_MAP[key];
  const idx = hashStr(tag) % 8;
  return ["tag-cyan","tag-blue","tag-violet","tag-emerald","tag-yellow","tag-rose","tag-orange","tag-slate"][idx];
}

async function compressThumbnail(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1280, maxH = 720;
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProjectCard({
  project, onEdit, onDelete, onTagClick, activeTagFilter, onDuplicate, onCardClick, onPin, onThumbnailChange, onView, index = 0, readOnly = false,
}: ProjectCardProps) {
  const grad = projectGradient(project.name);
  const score = healthScore(project);
  const hColor = healthColor(score);
  const R = 14, CIRC = 2 * Math.PI * R;
  const dash = (score / 100) * CIRC;
  const formattedDate = project.deploymentDate
    ? new Date(project.deploymentDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasLiveUrl = Boolean(project.liveUrl && /^https?:\/\//i.test(project.liveUrl));
  const hasRepoUrl = Boolean(project.repoUrl && /^https?:\/\//i.test(project.repoUrl));

  async function handleThumbnailPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onThumbnailChange) return;
    setUploading(true);
    try {
      const url = await compressThumbnail(file);
      onThumbnailChange(project.id, url);
    } catch {
      // silently fail — keep existing thumbnail
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="card-enter group relative flex flex-col rounded-2xl overflow-hidden"
      onClick={() => onCardClick?.(project)}
      style={{
        cursor: onCardClick ? "pointer" : undefined,
        background: "#ffffff",
        border: "1px solid rgba(124,58,237,0.12)",
        boxShadow: "0 2px 12px rgba(124,58,237,0.06)",
        animationDelay: `${index * 80}ms`,
        transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.18), 0 0 0 1px rgba(124,58,237,0.25)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(124,58,237,0.06)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.12)";
      }}
    >
      {/* Thumbnail area — fixed 16:9 aspect ratio */}
      <div
        className="relative overflow-hidden"
        style={{ background: grad, aspectRatio: "16/9" }}
      >
        {project.thumbnail && (
          <img
            src={project.thumbnail}
            alt={`${project.name} preview`}
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "center",
              transition: "transform 0.4s ease",
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: project.thumbnail
            ? "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.60) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)"
          }}
        />

        {/* Photo edit overlay — shows on hover when onThumbnailChange is provided */}
        {!readOnly && onThumbnailChange && (
          <button
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", cursor: "pointer", zIndex: 10 }}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            title="Change preview image"
            disabled={uploading}
          >
            {uploading ? (
              <svg className="h-5 w-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd"/>
              </svg>
            )}
            <span className="text-white text-xs font-medium">{uploading ? "Uploading…" : project.thumbnail ? "Change photo" : "Add photo"}</span>
          </button>
        )}

        {/* Pinned badge */}
        {project.pinned && (
          <div
            className="absolute top-0 left-0 flex items-center gap-1 rounded-br-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.2)", color: "#fff", backdropFilter: "blur(4px)", fontFamily: "'Syne', system-ui, sans-serif", zIndex: 20 }}
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.447 1.053a.75.75 0 0 0-1.394.22L8.08 5H4.75A2.25 2.25 0 0 0 2.5 7.25v.5c0 .414.336.75.75.75h4.5v5.585L5.26 15.98a.75.75 0 1 0 1.06 1.06L8.5 14.86V15a.75.75 0 0 0 1.5 0v-.14l2.18 2.18a.75.75 0 0 0 1.06-1.06l-2.49-2.495V8.5h4.5a.75.75 0 0 0 .75-.75v-.5A2.25 2.25 0 0 0 13.75 5H10.42l-.973-3.947Z" />
            </svg>
            Pinned
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-0 right-0 left-0 px-4 pt-3 flex items-start justify-between" style={{ zIndex: 20 }}>
          <StatusBadge status={project.status} size="sm" />
          {!readOnly && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100" style={{ transition: "opacity 0.2s ease" }}>
            {onPin && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(project.id); }}
                aria-label={project.pinned ? "Unpin project" : "Pin project"}
                className="rounded-lg p-1.5 transition-colors"
                style={project.pinned
                  ? { color: "#fff", background: "rgba(255,255,255,0.35)" }
                  : { color: "rgba(255,255,255,0.7)", background: "transparent" }
                }
                title={project.pinned ? "Unpin" : "Pin (max 3)"}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.447 1.053a.75.75 0 0 0-1.394.22L8.08 5H4.75A2.25 2.25 0 0 0 2.5 7.25v.5c0 .414.336.75.75.75h4.5v5.585L5.26 15.98a.75.75 0 1 0 1.06 1.06L8.5 14.86V15a.75.75 0 0 0 1.5 0v-.14l2.18 2.18a.75.75 0 0 0 1.06-1.06l-2.49-2.495V8.5h4.5a.75.75 0 0 0 .75-.75v-.5A2.25 2.25 0 0 0 13.75 5H10.42l-.973-3.947Z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(project); }}
              aria-label="Edit project"
              className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(project); }}
                aria-label="Duplicate project"
                className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                  <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              aria-label="Delete project"
              className="rounded-lg p-1.5 text-white/70 hover:text-red-200 hover:bg-red-500/30 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>}
        </div>

        {/* Project name + health ring */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between gap-2" style={{ zIndex: 20 }}>
          <h3
            className="font-bold text-white leading-snug drop-shadow-sm line-clamp-2"
            style={{
              fontFamily: "'Syne', system-ui, sans-serif",
              fontSize: project.name.length > 40 ? "0.95rem" : "1.125rem",
            }}
          >
            {project.name}
          </h3>
          <div className="flex-shrink-0 relative" title={`Health: ${score}%`}>
            <svg width={34} height={34} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={17} cy={17} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
              <circle
                cx={17} cy={17} r={R} fill="none"
                stroke="#fff"
                strokeWidth={3}
                strokeDasharray={`${dash} ${CIRC}`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${hColor}88)` }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              {score}
            </span>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailPick} />
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 px-6 pt-5 pb-6">
        <p className="text-sm leading-relaxed line-clamp-2 mb-5" style={{ color: "#5b5880" }}>
          {project.description || "No description provided."}
        </p>

        {/* Tech stack tags */}
        {project.techStack.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {project.techStack.slice(0, 5).map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.stopPropagation(); onTagClick?.(activeTagFilter === tag ? "" : tag); }}
                className={`${tagClass(tag)} inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition-all`}
                style={activeTagFilter === tag ? { outline: "2px solid currentColor", outlineOffset: "2px" } : {}}
                title={activeTagFilter === tag ? `Clear "${tag}" filter` : `Filter by "${tag}"`}
              >
                {tag}
              </button>
            ))}
            {project.techStack.length > 5 && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tag-slate border">
                +{project.techStack.length - 5} more
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Footer */}
        <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#9693b8" }}>
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
              </svg>
              <span className="text-xs" style={{ color: "#9693b8" }}>{formattedDate}</span>
            </div>
            {project.updatedAt && (
              <span className="text-[10px]" style={{ color: "#c4bfe0" }} title={`Last updated: ${new Date(project.updatedAt).toLocaleString()}`}>
                edited {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasLiveUrl ? (
              <a
                href={project.liveUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="btn-gradient inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                </svg>
                Live
              </a>
            ) : !readOnly && project.status === "Live" ? (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                title="Add live URL"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                style={{ background: "rgba(124,58,237,0.06)", color: "#9693b8", border: "1px dashed rgba(124,58,237,0.25)" }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "rgba(124,58,237,0.12)"; el.style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(124,58,237,0.06)"; el.style.color = "#9693b8"; }}
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Add URL
              </button>
            ) : null}
            {!readOnly && hasRepoUrl && (
              <a
                href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                style={{ background: "rgba(124,58,237,0.08)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.2)" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(124,58,237,0.15)"; el.style.borderColor = "rgba(124,58,237,0.35)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(124,58,237,0.08)"; el.style.borderColor = "rgba(124,58,237,0.2)"; }}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Review Link
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSection projectId={project.id} />
    </div>
  );
}
