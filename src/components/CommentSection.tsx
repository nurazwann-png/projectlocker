"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Comment {
  id: string;
  parentId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  projectId: string;
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

const AVATAR_COLORS = ["#7c3aed","#db2777","#0ea5e9","#059669","#d97706","#dc2626","#0284c7","#7e22ce"];
function avatarColor(name: string): string {
  return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
}

function buildTree(flat: Omit<Comment, "replies">[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  for (const c of flat) map.set(c.id, { ...c, replies: [] });
  for (const c of flat) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(map.get(c.id)!);
    } else if (!c.parentId) {
      roots.push(map.get(c.id)!);
    }
  }
  return roots;
}

/* ── inline comment/reply form ── */
interface CommentFormProps {
  projectId: string;
  parentId?: string;
  onPosted: (comment: Comment) => void;
  onCancel: () => void;
  placeholder?: string;
}

function CommentForm({ projectId, parentId, onPosted, onCancel, placeholder = "Write a comment…" }: CommentFormProps) {
  const { user, isLoaded } = useUser();
  const clerkName = user ? (user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "") : null;
  const [guestName, setGuestName] = useState(() => {
    try { return localStorage.getItem("comment-name") ?? ""; } catch { return ""; }
  });
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authorName = clerkName ?? guestName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      if (!clerkName) { try { localStorage.setItem("comment-name", authorName.trim()); } catch {} }
      const res = await fetch(`/api/public/comments/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorName.trim(), body: body.trim(), parentId: parentId ?? null }),
      });
      if (!res.ok) { setError("Failed to post. Try again."); return; }
      const comment: Comment = await res.json();
      onPosted(comment);
      setBody("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Identity row */}
      {isLoaded && clerkName ? (
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: avatarColor(clerkName) }}>
              {clerkName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold truncate" style={{ color: "#0d0b1e" }}>{clerkName}</span>
          <span className="text-[10px] ml-auto" style={{ color: "#9693b8" }}>signed in</span>
        </div>
      ) : (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          required
          className="w-full rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
          style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
        />
      )}

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        required
        rows={2}
        className="w-full resize-none rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
        style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e", lineHeight: 1.6 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
        autoFocus
      />

      {error && <p className="text-[10px]" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "#c4bfe0" }}>{body.length}/500</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="text-xs transition-colors" style={{ color: "#9693b8" }}>
            Cancel
          </button>
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
            {submitting ? "Posting…" : parentId ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── single comment row (with optional replies) ── */
interface CommentRowProps {
  comment: Comment;
  projectId: string;
  onReplyPosted: (reply: Comment, parentId: string) => void;
  isReply?: boolean;
}

function CommentRow({ comment, projectId, onReplyPosted, isReply = false }: CommentRowProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const replies = comment.replies ?? [];

  return (
    <div>
      {/* Comment bubble */}
      <div className="flex gap-2 items-start">
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white"
          style={{
            background: avatarColor(comment.authorName),
            width: isReply ? 22 : 26,
            height: isReply ? 22 : 26,
            fontSize: isReply ? 9 : 10,
          }}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "#0d0b1e", fontSize: isReply ? 11 : 12 }}>{comment.authorName}</span>
            <span style={{ color: "#c4bfe0", fontSize: 10 }}>{relativeTime(comment.createdAt)}</span>
          </div>
          <p className="leading-relaxed mt-0.5 break-words" style={{ color: "#5b5880", fontSize: isReply ? 11 : 12 }}>{comment.body}</p>

          {/* Reply button — only on top-level comments */}
          {!isReply && (
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="mt-1 text-[11px] font-medium transition-colors"
              style={{ color: showReplyForm ? "#7c3aed" : "#9693b8" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = showReplyForm ? "#7c3aed" : "#9693b8"; }}
            >
              {showReplyForm ? "Cancel" : "↩ Reply"}
            </button>
          )}
        </div>
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="ml-8 mt-2">
          <CommentForm
            projectId={projectId}
            parentId={comment.id}
            placeholder={`Replying to ${comment.authorName}…`}
            onPosted={(reply) => {
              onReplyPosted(reply, comment.id);
              setShowReplyForm(false);
              setRepliesExpanded(true);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2.5">
          {/* Show/hide toggle */}
          {!repliesExpanded && (
            <button
              onClick={() => setRepliesExpanded(true)}
              className="text-[11px] font-medium transition-colors"
              style={{ color: "#7c3aed" }}
            >
              ▾ {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )}

          {repliesExpanded && (
            <>
              {replies.map((r) => (
                <CommentRow key={r.id} comment={r} projectId={projectId} onReplyPosted={onReplyPosted} isReply />
              ))}
              <button
                onClick={() => setRepliesExpanded(false)}
                className="text-[11px] transition-colors"
                style={{ color: "#9693b8" }}
              >
                ▴ Hide replies
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main CommentSection ── */
export default function CommentSection({ projectId }: CommentSectionProps) {
  const [tree, setTree] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/public/comments/${projectId}`)
      .then((r) => r.json())
      .then((data: Omit<Comment, "replies">[]) => {
        if (Array.isArray(data)) {
          setTree(buildTree(data));
          setTotalCount(data.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId]);

  const VISIBLE = 2;
  const visibleRoots = expanded ? tree : tree.slice(0, VISIBLE);
  const hidden = tree.length - VISIBLE;

  function handleTopLevelPosted(comment: Comment) {
    setTree((prev) => [...prev, { ...comment, replies: [] }]);
    setTotalCount((n) => n + 1);
    setShowForm(false);
    setExpanded(true);
  }

  function handleReplyPosted(reply: Comment, parentId: string) {
    setTree((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
      )
    );
    setTotalCount((n) => n + 1);
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}
    >
      {/* Header */}
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
          <span>{loaded ? `${totalCount} comment${totalCount !== 1 ? "s" : ""}` : "…"}</span>
        </button>
        <button
          onClick={() => { setShowForm((v) => !v); }}
          className="text-xs font-medium transition-colors"
          style={{ color: showForm ? "#7c3aed" : "#9693b8" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = showForm ? "#7c3aed" : "#9693b8"; }}
        >
          {showForm ? "Cancel" : "+ Comment"}
        </button>
      </div>

      {/* Top-level comments */}
      {loaded && tree.length > 0 && (
        <div className="px-5 pb-2 space-y-3">
          {visibleRoots.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              projectId={projectId}
              onReplyPosted={handleReplyPosted}
            />
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
          {expanded && tree.length > VISIBLE && (
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

      {/* New top-level comment form */}
      {showForm && (
        <div className="px-5 pb-4">
          <CommentForm
            projectId={projectId}
            onPosted={handleTopLevelPosted}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}
