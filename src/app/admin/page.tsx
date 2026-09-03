"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";

interface RecentComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  acknowledged: boolean;
  projectId: string;
  projectTitle: string;
}

interface TopProject {
  projectId: string;
  title: string;
  count: number;
}

interface TopViewedProject {
  projectId: string;
  title: string;
  ownerUsername: string;
  totalViews: number;
}

interface RecentView {
  viewerName: string;
  isGuest: boolean;
  projectTitle: string;
  ownerUsername: string;
  createdAt: string;
}

interface StatusGroup {
  status: string;
  _count: { id: number };
}

interface Stats {
  totalProfiles: number;
  totalProjects: number;
  totalComments: number;
  acknowledgedComments: number;
  acknowledgedRate: number;
  recentComments: RecentComment[];
  topCommentedProjects: TopProject[];
  projectsByStatus: StatusGroup[];
  topViewedProjects: TopViewedProject[];
  recentViews: RecentView[];
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  live: "#10b981", wip: "#f59e0b", archived: "#6b7280", planned: "#8b5cf6",
};

function StatCard({ label, value, sub, accent = "#7c3aed" }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)", boxShadow: "0 2px 12px rgba(124,58,237,0.06)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#9693b8" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: accent, fontFamily: "'Syne', system-ui, sans-serif" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#9693b8" }}>{sub}</p>}
    </div>
  );
}

/* ── PIN gate ── */
function PinGate({ onVerified }: { onVerified: (pin: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError("");
    if (val && i < 3) refs[i + 1].current?.focus();
    if (!val && i > 0) refs[i - 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) { refs[i - 1].current?.focus(); }
    if (e.key === "Enter") handleSubmit();
  }

  async function handleSubmit() {
    const pin = digits.join("");
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) { setError("Incorrect PIN. Try again."); setDigits(["", "", "", ""]); refs[0].current?.focus(); return; }
      const { token } = await res.json();
      onVerified(token);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-center" style={{ color: "#9693b8" }}>Admin PIN</p>
      <div className="flex items-center justify-center gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-12 rounded-xl text-center text-xl font-bold outline-none transition-all"
            style={{
              background: "#f8f7ff",
              border: `2px solid ${error ? "rgba(220,38,38,0.4)" : d ? "#7c3aed" : "rgba(124,58,237,0.2)"}`,
              color: "#0d0b1e",
              boxShadow: d ? "0 0 0 3px rgba(124,58,237,0.1)" : "none",
            }}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && <p className="text-xs text-center" style={{ color: "#dc2626" }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={digits.join("").length !== 4 || loading}
        className="w-full rounded-xl py-3 text-sm font-bold transition-all"
        style={{
          background: digits.join("").length === 4 ? "#7c3aed" : "rgba(124,58,237,0.2)",
          color: digits.join("").length === 4 ? "#fff" : "#9693b8",
          border: "none",
          cursor: digits.join("").length === 4 ? "pointer" : "default",
        }}
      >
        {loading ? "Verifying…" : "Enter"}
      </button>
    </div>
  );
}

interface MemberProfile {
  userId: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  projectCount: number;
}

/* ── Members section ── */
function MembersSection({ pinToken }: { pinToken?: string }) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (pinToken) headers["x-admin-pin"] = pinToken;
    fetch("/api/admin/profiles", { headers, credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pinToken]);

  async function handleDelete(userId: string) {
    setDeleting(userId);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (pinToken) headers["x-admin-pin"] = pinToken;
    try {
      const res = await fetch(`/api/admin/profiles/${userId}`, { method: "DELETE", headers, credentials: "include" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } finally {
      setDeleting(null);
      setConfirm(null);
    }
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
      <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Members</h2>
      {loading ? (
        <p className="text-sm" style={{ color: "#c4bfe0" }}>Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm" style={{ color: "#c4bfe0" }}>No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(124,58,237,0.03)", border: "1px solid rgba(124,58,237,0.08)" }}>
              {/* Avatar */}
              <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white" style={{ background: "#7c3aed" }}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : (m.username ?? "?").charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#0d0b1e" }}>@{m.username ?? "—"}</p>
                <p className="text-[11px]" style={{ color: "#9693b8" }}>{m.projectCount} project{m.projectCount !== 1 ? "s" : ""} · joined {relativeTime(m.createdAt)}</p>
              </div>
              {/* Delete */}
              {confirm === m.userId ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs" style={{ color: "#dc2626" }}>Delete all data?</span>
                  <button
                    onClick={() => handleDelete(m.userId)}
                    disabled={!!deleting}
                    className="rounded-lg px-2 py-1 text-xs font-bold"
                    style={{ background: "#dc2626", color: "#fff", border: "none", opacity: deleting ? 0.6 : 1 }}
                  >
                    {deleting === m.userId ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirm(null)} className="text-xs" style={{ color: "#9693b8" }}>Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm(m.userId)}
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{ background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.15)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.07)"; }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard({ pinToken, onForbidden }: { pinToken?: string; onForbidden: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (pinToken) headers["x-admin-pin"] = pinToken;
    fetch("/api/admin/stats", { headers, credentials: "include" })
      .then(async (r) => {
        if (r.status === 403) { onForbidden(); return; }
        if (!r.ok) { setError("Failed to load analytics."); return; }
        setStats(await r.json());
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [pinToken, onForbidden]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: "#9693b8" }}>Loading analytics…</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <p style={{ color: "#dc2626" }}>{error}</p>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Members" value={stats.totalProfiles} accent="#7c3aed" />
        <StatCard label="Projects" value={stats.totalProjects} accent="#ec4899" />
        <StatCard label="Comments" value={stats.totalComments} accent="#06b6d4" />
        <StatCard label="Acknowledged" value={`${stats.acknowledgedRate}%`} sub={`${stats.acknowledgedComments} of ${stats.totalComments}`} accent="#10b981" />
      </div>

      {/* Projects by status */}
      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Projects by Status</h2>
        <div className="flex flex-wrap gap-3">
          {stats.projectsByStatus.map((s) => (
            <div key={s.status} className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: (STATUS_COLOR[s.status] ?? "#7c3aed") + "12", border: `1px solid ${(STATUS_COLOR[s.status] ?? "#7c3aed")}30` }}>
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[s.status] ?? "#7c3aed" }} />
              <span className="text-sm font-semibold capitalize" style={{ color: STATUS_COLOR[s.status] ?? "#7c3aed" }}>{s.status}</span>
              <span className="text-sm font-bold" style={{ color: "#0d0b1e" }}>{s._count.id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top commented projects */}
        <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Most Commented Projects</h2>
          {stats.topCommentedProjects.length === 0 ? (
            <p className="text-sm" style={{ color: "#c4bfe0" }}>No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topCommentedProjects.map((p, i) => (
                <div key={p.projectId} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-5 text-right flex-shrink-0" style={{ color: "#c4bfe0" }}>{i + 1}</span>
                  <p className="flex-1 text-sm font-semibold truncate" style={{ color: "#0d0b1e" }}>{p.title}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acknowledge rate */}
        <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Review Response Rate</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                  strokeDasharray={`${stats.acknowledgedRate} ${100 - stats.acknowledgedRate}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: "#10b981", fontFamily: "'Syne', system-ui" }}>{stats.acknowledgedRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm" style={{ color: "#5b5880" }}><span className="font-bold" style={{ color: "#10b981" }}>{stats.acknowledgedComments}</span> acknowledged</p>
              <p className="text-sm mt-1" style={{ color: "#9693b8" }}><span className="font-bold">{stats.totalComments - stats.acknowledgedComments}</span> pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Views */}
      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Project Views</h2>
        {stats.topViewedProjects.length === 0 ? (
          <p className="text-sm" style={{ color: "#c4bfe0" }}>No views recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
                  <th className="text-left pb-2 font-semibold" style={{ color: "#9693b8" }}>#</th>
                  <th className="text-left pb-2 font-semibold" style={{ color: "#9693b8" }}>Project</th>
                  <th className="text-left pb-2 font-semibold" style={{ color: "#9693b8" }}>Owner</th>
                  <th className="text-right pb-2 font-semibold" style={{ color: "#9693b8" }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {stats.topViewedProjects.map((p, i) => (
                  <tr key={p.projectId} style={{ borderBottom: "1px solid rgba(124,58,237,0.05)" }}>
                    <td className="py-2 pr-3 font-bold" style={{ color: "#c4bfe0" }}>{i + 1}</td>
                    <td className="py-2 pr-4 font-semibold truncate max-w-[160px]" style={{ color: "#0d0b1e" }}>{p.title}</td>
                    <td className="py-2 pr-4" style={{ color: "#7c3aed" }}>@{p.ownerUsername}</td>
                    <td className="py-2 text-right font-bold" style={{ color: "#0d0b1e" }}>{p.totalViews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent view activity */}
        {stats.recentViews.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9693b8" }}>Recent Activity</p>
            <div className="space-y-2">
              {stats.recentViews.slice(0, 8).map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: v.isGuest ? "#9693b8" : "#7c3aed" }}>
                    {v.viewerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium" style={{ color: "#5b5880" }}>
                    <span style={{ color: v.isGuest ? "#9693b8" : "#0d0b1e" }}>{v.isGuest ? "Guest" : `@${v.viewerName}`}</span>
                    {" "}viewed{" "}
                    <span className="font-semibold" style={{ color: "#0d0b1e" }}>{v.projectTitle}</span>
                    {" "}by{" "}
                    <span style={{ color: "#7c3aed" }}>@{v.ownerUsername}</span>
                  </span>
                  <span className="ml-auto flex-shrink-0" style={{ color: "#c4bfe0" }}>{relativeTime(v.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <MembersSection pinToken={pinToken} />

      {/* Recent comments */}
      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Recent Comments</h2>
        {stats.recentComments.length === 0 ? (
          <p className="text-sm" style={{ color: "#c4bfe0" }}>No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentComments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(124,58,237,0.03)", border: "1px solid rgba(124,58,237,0.08)" }}>
                <div className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#7c3aed" }}>
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: "#0d0b1e" }}>{c.authorName}</span>
                    <span className="text-[10px]" style={{ color: "#c4bfe0" }}>on</span>
                    <span className="text-xs font-medium truncate max-w-[140px]" style={{ color: "#7c3aed" }}>{c.projectTitle}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "#c4bfe0" }}>{relativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#5b5880" }}>{c.body}</p>
                </div>
                {c.acknowledged && (
                  <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>✓ Noted</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pinToken, setPinToken] = useState<string | null>(() => {
    try { return sessionStorage.getItem("admin-pin-token"); } catch { return null; }
  });
  const [showPin, setShowPin] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  function handlePinVerified(token: string) {
    try { sessionStorage.setItem("admin-pin-token", token); } catch {}
    setPinToken(token);
    setForbidden(false);
  }

  function handleSignOut() {
    try { sessionStorage.removeItem("admin-pin-token"); } catch {}
    setPinToken(null);
    setForbidden(false);
    setShowPin(false);
  }

  function handleForbidden() {
    handleSignOut();
    setForbidden(true);
  }

  const isAuthenticated = (isLoaded && isSignedIn) || !!pinToken;

  return (
    <div className="relative z-10 min-h-screen" style={{ background: "#f8f7ff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');`}</style>

      {/* Nav */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4" style={{ background: "rgba(248,247,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <a href="/" className="text-sm font-semibold" style={{ color: "#7c3aed" }}>← Back</a>
        <span style={{ color: "#e5e3f5" }}>|</span>
        <h1 className="text-base font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui" }}>Admin Analytics</h1>
        {isAuthenticated && (
          <button onClick={handleSignOut} className="ml-auto text-xs" style={{ color: "#9693b8" }}>
            Sign out
          </button>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {!isAuthenticated ? (
          <div className="mx-auto max-w-sm">
            {forbidden && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm text-center" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                Access denied. Sign in as the admin account or enter the admin PIN.
              </div>
            )}
            <div className="rounded-2xl p-8 space-y-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.15)", boxShadow: "0 8px 40px rgba(124,58,237,0.1)" }}>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(124,58,237,0.08)" }}>
                  <svg className="h-7 w-7" viewBox="0 0 20 20" fill="#7c3aed">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui" }}>Admin Access</h2>
                <p className="text-sm mt-1" style={{ color: "#9693b8" }}>Sign in or enter your admin PIN</p>
              </div>

              {/* Clerk sign in */}
              <SignInButton mode="modal">
                <button
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all"
                  style={{ background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#6d28d9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7c3aed"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                  </svg>
                  Sign in as Admin
                </button>
              </SignInButton>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.1)" }} />
                <span className="text-xs" style={{ color: "#c4bfe0" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.1)" }} />
              </div>

              {/* PIN toggle */}
              {!showPin ? (
                <button
                  onClick={() => setShowPin(true)}
                  className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
                  style={{ background: "transparent", color: "#7c3aed", border: "2px solid rgba(124,58,237,0.25)", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  Enter Admin PIN
                </button>
              ) : (
                <PinGate onVerified={handlePinVerified} />
              )}
            </div>
          </div>
        ) : (
          <Dashboard pinToken={pinToken ?? undefined} onForbidden={handleForbidden} />
        )}
      </div>
    </div>
  );
}
