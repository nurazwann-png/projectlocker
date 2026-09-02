"use client";

import { useState, useEffect } from "react";

interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface CommentSectionProps {
  projectId: string;
  defaultAuthorName?: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = [
  "#7c3aed","#db2777","#0ea5e9","#059669","#d97706","#dc2626","#0284c7","#7e22ce",
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
}

export default function CommentSection({ projectId, defaultAuthorName = "" }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState(() => {
    try { return localStorage.getItem("comment-name") ?? defaultAuthorName; } catch { return defaultAuthorName; }
  });
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/comments/${projectId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setComments(data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId]);

  const VISIBLE = 2;
  const visible = expanded ? comments : comments.slice(0, VISIBLE);
  const hidden = comments.length - VISIBLE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      try { localStorage.setItem("comment-name", authorName.trim()); } catch {}
      const res = await fetch(`/api/public/comments/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorName.trim(), body: body.trim() }),
      });
      if (!res.ok) { setError("Failed to post. Try again."); return; }
      const comment: Comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setBody("");
      setShowForm(false);
      setExpanded(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "#9693b8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{loaded ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "…"}</span>
        </button>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="text-xs font-medium transition-colors"
          style={{ color: showForm ? "#7c3aed" : "#9693b8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = showForm ? "#7c3aed" : "#9693b8"; }}
        >
          {showForm ? "Cancel" : "+ Comment"}
        </button>
      </div>

      {/* Comment list */}
      {loaded && comments.length > 0 && (
        <div className="px-5 pb-2 space-y-2.5">
          {visible.map((c) => (
            <div key={c.id} className="flex gap-2 items-start">
              <div
                className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: avatarColor(c.authorName) }}
              >
                {c.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: "#0d0b1e" }}>{c.authorName}</span>
                  <span className="text-[10px]" style={{ color: "#c4bfe0" }}>{relativeTime(c.createdAt)}</span>
                </div>
                <p className="text-xs leading-relaxed mt-0.5 break-words" style={{ color: "#5b5880" }}>{c.body}</p>
              </div>
            </div>
          ))}

          {!expanded && hidden > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-medium transition-colors"
              style={{ color: "#7c3aed" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6d28d9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
            >
              Show {hidden} more ▾
            </button>
          )}
          {expanded && comments.length > VISIBLE && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs transition-colors"
              style={{ color: "#9693b8" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
            >
              Show less ▴
            </button>
          )}
        </div>
      )}

      {/* Add comment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="px-5 pb-4 space-y-2">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            required
            className="w-full rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
            style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment…"
            maxLength={500}
            required
            rows={2}
            className="w-full resize-none rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
            style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e", lineHeight: 1.6 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
          />
          {error && <p className="text-[10px]" style={{ color: "#dc2626" }}>{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "#c4bfe0" }}>{body.length}/500</span>
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || !body.trim()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: "rgba(124,58,237,0.1)",
                color: "#7c3aed",
                border: "1px solid rgba(124,58,237,0.25)",
                opacity: (submitting || !authorName.trim() || !body.trim()) ? 0.5 : 1,
              }}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
