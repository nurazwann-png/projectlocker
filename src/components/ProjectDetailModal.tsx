"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";
import CommentSection from "./CommentSection";

interface Viewer {
  viewerName: string;
  viewerId: string | null;
  count: number;
  lastSeen: string;
}

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onNotesChange: (id: string, notes: string) => void;
  onNotesLockChange?: (id: string, locked: boolean) => void;
  onNotesPinChange?: (pin: string) => void;
  notesPin?: string | null;
  readOnly?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  onOpen?: (projectId: string) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ProjectDetailModal({
  project, onClose, onEdit, onNotesChange,
  onNotesLockChange, onNotesPinChange,
  notesPin, readOnly = false, isOwner = false, isAdmin = false, onOpen,
}: ProjectDetailModalProps) {
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PIN unlock state (owner only, when notesLocked = true)
  const [notesUnlocked, setNotesUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Set/change PIN dialog
  const [settingPin, setSettingPin] = useState(false);
  const [lockAfterPin, setLockAfterPin] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinConfirmError, setPinConfirmError] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);

  // Viewers (owner only)
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [viewersExpanded, setViewersExpanded] = useState(false);

  // Reset state + fire onOpen when project changes
  useEffect(() => {
    if (!project) return;
    setNotes(project.notes ?? "");
    setNotesUnlocked(false);
    setPinInput(""); setPinError(false);
    setSettingPin(false); setLockAfterPin(false);
    setPinDraft(""); setPinConfirm(""); setPinConfirmError(false);
    setViewers([]); setTotalViews(0); setViewersExpanded(false);
    onOpen?.(project.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Fetch viewers whenever project or isOwner changes (isOwner may resolve after mount)
  useEffect(() => {
    if (!project || !isOwner) return;
    fetch(`/api/projects/${project.id}/views`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setViewers(data.viewers); setTotalViews(data.totalViews); } })
      .catch(() => {});
  }, [project?.id, isOwner]);

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    setNotesSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!project) return;
    saveTimer.current = setTimeout(() => {
      onNotesChange(project.id, val);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }, 800);
  }, [project, onNotesChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler as unknown as EventListener);
    return () => window.removeEventListener("keydown", handler as unknown as EventListener);
  }, [onClose]);

  if (!project) return null;

  const liveUrl = project.liveUrl?.startsWith("http") ? project.liveUrl : project.liveUrl ? `https://${project.liveUrl}` : null;
  const repoUrl = project.repoUrl?.startsWith("http") ? project.repoUrl : project.repoUrl ? `https://${project.repoUrl}` : null;
  const isLocked = project.notesLocked ?? false;

  function tryUnlock() {
    if (!notesPin) { setNotesUnlocked(true); return; }
    if (pinInput === notesPin) { setNotesUnlocked(true); setPinError(false); setPinInput(""); }
    else { setPinError(true); setPinInput(""); }
  }

  function handleLockClick() {
    if (!notesPin) {
      // No PIN set yet — ask user to set one first, then lock
      setLockAfterPin(true);
      setSettingPin(true);
    } else {
      onNotesLockChange?.(project!.id, true);
      setNotesUnlocked(false);
    }
  }

  async function handleSavePin() {
    if (pinDraft.length !== 4) return;
    if (pinDraft !== pinConfirm) { setPinConfirmError(true); return; }
    setPinSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesPin: pinDraft }),
      });
      if (!res.ok) return;
      onNotesPinChange?.(pinDraft);
      if (lockAfterPin) {
        onNotesLockChange?.(project!.id, true);
        setNotesUnlocked(false);
      }
    } finally {
      setPinSaving(false);
      setSettingPin(false);
      setLockAfterPin(false);
      setPinDraft(""); setPinConfirm(""); setPinConfirmError(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,11,30,0.55)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(124,58,237,0.15)",
          boxShadow: "0 8px 60px rgba(124,58,237,0.15), 0 2px 20px rgba(0,0,0,0.1)",
          maxHeight: "90vh",
        }}
      >
        {/* Hero / thumbnail */}
        <div className="relative flex-shrink-0" style={{ height: 220 }}>
          {project.thumbnail ? (
            <img src={project.thumbnail} alt={project.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #7c3aed, #db2777, #0ea5e9)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #ffffff 100%)" }} />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 transition-colors"
            style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "#5b5880" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0d0b1e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; }}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
          <div className="absolute left-4 top-4">
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-7 pb-7 pt-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.2) transparent" }}>
          {/* Title row */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>{project.name}</h2>
              <p className="mt-1 text-sm" style={{ color: "#9693b8" }}>Deployed {project.deploymentDate || "—"}</p>
            </div>
            {!readOnly && (
              <button
                onClick={() => { onClose(); onEdit(project); }}
                className="mt-1 flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          {/* Description */}
          <p className="mb-5 text-sm leading-relaxed" style={{ color: "#5b5880" }}>{project.description}</p>

          {/* Tech stack */}
          {project.techStack.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(124,58,237,0.07)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.18)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key features */}
          {project.features && project.features.filter(Boolean).length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>Key Features</p>
              <ul className="space-y-1.5">
                {project.features.filter(Boolean).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5b5880" }}>
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#7c3aed" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Links */}
          {(liveUrl || (!readOnly && repoUrl)) && (
            <div className="mb-6 flex flex-wrap gap-3">
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                  </svg>
                  View Live
                </a>
              )}
              {!readOnly && repoUrl && (
                <a href={repoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                  style={{ background: "rgba(124,58,237,0.06)", color: "#5b5880", border: "1px solid rgba(124,58,237,0.15)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#0d0b1e"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.3)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#5b5880"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.15)"; }}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 0 1 2.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0 1 10 1.944ZM11 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0-7a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V7Z" clipRule="evenodd" />
                  </svg>
                  Review Link
                </a>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="mb-5" style={{ height: 1, background: "rgba(124,58,237,0.1)" }} />

          {/* Notes section */}
          {readOnly ? (
            /* Public viewer */
            isLocked ? (
              <div className="rounded-xl p-5 flex items-center gap-3" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.12)" }}>
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#9693b8" }}>
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm" style={{ color: "#9693b8" }}>Notes are private</p>
              </div>
            ) : project.notes ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>Notes</p>
                <div className="rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "rgba(124,58,237,0.03)", border: "1px solid rgba(124,58,237,0.12)", color: "#5b5880" }}>
                  {project.notes}
                </div>
              </div>
            ) : null
          ) : (
            /* Owner view */
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#7c3aed" }}>
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui, sans-serif" }}>Notes</p>
                </div>
                <div className="flex items-center gap-3">
                  {notesSaved && !isLocked && <span className="text-xs" style={{ color: "#059669" }}>Saved ✓</span>}
                  {/* Change PIN button — visible when unlocked or not locked */}
                  {(!isLocked || notesUnlocked) && (
                    <button
                      onClick={() => { setSettingPin((v) => !v); setLockAfterPin(false); }}
                      className="text-xs transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                    >
                      {notesPin ? "Change PIN" : "Set PIN"}
                    </button>
                  )}
                  {/* Lock / Unlock toggle */}
                  {!isLocked ? (
                    <button
                      onClick={handleLockClick}
                      className="inline-flex items-center gap-1 text-xs transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                      title="Lock this note"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                      </svg>
                      Lock
                    </button>
                  ) : notesUnlocked ? (
                    <button
                      onClick={() => { onNotesLockChange?.(project.id, false); setNotesUnlocked(false); }}
                      className="inline-flex items-center gap-1 text-xs transition-colors"
                      style={{ color: "#059669" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#047857"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#059669"; }}
                      title="Remove lock from this note"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M14.5 9A3.5 3.5 0 0 0 8 6.5V9h6.5Z" />
                        <path fillRule="evenodd" d="M5 9H3.5A1.5 1.5 0 0 0 2 10.5v7A1.5 1.5 0 0 0 3.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 16.5 9H5Z" clipRule="evenodd" />
                      </svg>
                      Unlock note
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Set/change PIN dialog */}
              {settingPin && (
                <div className="mb-4 rounded-xl p-4 space-y-3" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#7c3aed" }}>{notesPin ? "Change your 4-digit PIN" : "Set a 4-digit PIN"}</p>
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pinDraft}
                    onChange={(e) => { setPinDraft(e.target.value.replace(/\D/g, "")); setPinConfirmError(false); }}
                    placeholder="New PIN"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.25)", color: "#0d0b1e" }}
                  />
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pinConfirm}
                    onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "")); setPinConfirmError(false); }}
                    placeholder="Confirm PIN"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "#ffffff", border: `1px solid ${pinConfirmError ? "rgba(220,38,38,0.5)" : "rgba(124,58,237,0.25)"}`, color: "#0d0b1e" }}
                  />
                  {pinConfirmError && <p className="text-xs" style={{ color: "#dc2626" }}>PINs don&apos;t match</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePin}
                      disabled={pinSaving || pinDraft.length !== 4}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)", opacity: pinDraft.length !== 4 ? 0.5 : 1 }}
                    >
                      {pinSaving ? "Saving…" : lockAfterPin ? "Save PIN & Lock" : "Save PIN"}
                    </button>
                    <button
                      onClick={() => { setSettingPin(false); setLockAfterPin(false); setPinDraft(""); setPinConfirm(""); setPinConfirmError(false); }}
                      className="text-xs"
                      style={{ color: "#9693b8" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Locked — show PIN entry */}
              {isLocked && !notesUnlocked ? (
                <div className="rounded-xl p-6 flex flex-col items-center gap-4" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.12)" }}>
                  <p className="text-sm" style={{ color: "#5b5880" }}>Enter your PIN to view this note</p>
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
                    placeholder="····"
                    className="rounded-xl px-4 py-2 text-center text-lg font-bold tracking-widest outline-none w-32"
                    style={{ background: "#ffffff", border: `1px solid ${pinError ? "rgba(220,38,38,0.5)" : "rgba(124,58,237,0.3)"}`, color: "#0d0b1e" }}
                    autoFocus
                  />
                  {pinError && <p className="text-xs" style={{ color: "#dc2626" }}>Incorrect PIN</p>}
                  <button onClick={tryUnlock} className="rounded-xl px-5 py-2 text-sm font-semibold" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}>
                    Unlock
                  </button>
                </div>
              ) : !isLocked || notesUnlocked ? (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Jot down key learnings, known issues, future ideas…"
                    rows={5}
                    className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ background: "rgba(124,58,237,0.03)", border: "1px solid rgba(124,58,237,0.15)", color: "#0d0b1e", lineHeight: 1.7 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.08)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <p className="mt-1.5 text-xs" style={{ color: "#9693b8" }}>Auto-saved · synced across devices</p>
                </>
              ) : null}
            </div>
          )}
          {/* Viewers — owner or admin */}
          {(isOwner || isAdmin) && (
            <div className="mt-4">
              <div style={{ height: 1, background: "rgba(124,58,237,0.08)" }} />
              <button
                onClick={() => setViewersExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs transition-colors"
                style={{ color: "#9693b8", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                  </svg>
                  <span>{totalViews} view{totalViews !== 1 ? "s" : ""} · {viewers.length} unique viewer{viewers.length !== 1 ? "s" : ""}</span>
                </div>
                <span>{viewersExpanded ? "▴" : "▾"}</span>
              </button>
              {viewersExpanded && (
                <div className="px-5 pb-3 space-y-2">
                  {viewers.length === 0 ? (
                    <p className="text-xs" style={{ color: "#c4bfe0" }}>No views yet.</p>
                  ) : viewers.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.08)" }}>
                      <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: v.viewerId ? "#7c3aed" : "#9693b8" }}>
                        {v.viewerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "#0d0b1e" }}>
                          {v.viewerId ? `@${v.viewerName}` : v.viewerName}
                        </p>
                        <p className="text-[10px]" style={{ color: "#c4bfe0" }}>Last seen {relativeTime(v.lastSeen)}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>
                        {v.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="mt-2">
            <div className="mb-0" style={{ height: 1, background: "rgba(124,58,237,0.08)" }} />
            <CommentSection projectId={project.id} isOwner={isOwner} />
          </div>
        </div>
      </div>
    </div>
  );
}
