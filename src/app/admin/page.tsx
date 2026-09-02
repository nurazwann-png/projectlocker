"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

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
  live: "#10b981",
  wip: "#f59e0b",
  archived: "#6b7280",
  planned: "#8b5cf6",
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

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f7ff" }}>
        <p style={{ color: "#9693b8" }}>Loading…</p>
      </div>
    );
  }

  if (!isSignedIn || forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f7ff" }}>
        <div className="text-center">
          <p className="text-2xl font-bold mb-2" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui" }}>Access denied</p>
          <p style={{ color: "#9693b8" }}>You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen" style={{ background: "#f8f7ff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');`}</style>

      {/* Nav */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4" style={{ background: "rgba(248,247,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <a href="/" className="text-sm font-semibold" style={{ color: "#7c3aed" }}>← Dashboard</a>
        <span style={{ color: "#e5e3f5" }}>|</span>
        <h1 className="text-base font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui" }}>Admin Analytics</h1>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Members" value={stats.totalProfiles} accent="#7c3aed" />
          <StatCard label="Projects" value={stats.totalProjects} accent="#ec4899" />
          <StatCard label="Comments" value={stats.totalComments} accent="#06b6d4" />
          <StatCard
            label="Acknowledged"
            value={`${stats.acknowledgedRate}%`}
            sub={`${stats.acknowledgedComments} of ${stats.totalComments}`}
            accent="#10b981"
          />
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#0d0b1e" }}>{p.title}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}>{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acknowledge rate visual */}
          <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)" }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#9693b8", fontFamily: "'Syne', system-ui" }}>Review Response Rate</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative h-24 w-24 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10b981" strokeWidth="2.5"
                    strokeDasharray={`${stats.acknowledgedRate} ${100 - stats.acknowledgedRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: "#10b981", fontFamily: "'Syne', system-ui" }}>{stats.acknowledgedRate}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm" style={{ color: "#5b5880" }}>
                  <span className="font-bold" style={{ color: "#10b981" }}>{stats.acknowledgedComments}</span> comments acknowledged
                </p>
                <p className="text-sm mt-1" style={{ color: "#9693b8" }}>
                  <span className="font-bold" style={{ color: "#9693b8" }}>{stats.totalComments - stats.acknowledgedComments}</span> pending review
                </p>
              </div>
            </div>
          </div>
        </div>

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
    </div>
  );
}
