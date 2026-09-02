"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface CommunityProfile {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  projectCount: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const GRAD_PALETTE = [
  ["#7c3aed", "#db2777"],
  ["#0ea5e9", "#7c3aed"],
  ["#059669", "#0ea5e9"],
  ["#d97706", "#db2777"],
  ["#dc2626", "#7c3aed"],
  ["#0ea5e9", "#059669"],
];

function avatarGradient(name: string): string {
  const [a, b] = GRAD_PALETTE[hashStr(name) % GRAD_PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

const pageBg: import("react").CSSProperties = {
  backgroundImage: "url('/bg.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center top",
  backgroundAttachment: "fixed",
  backgroundColor: "#eeeaff",
  minHeight: "100vh",
};

export default function CommunityPage() {
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/community")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProfiles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return profiles;
    const q = query.toLowerCase();
    return profiles.filter(
      (p) =>
        p.username?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q)
    );
  }, [profiles, query]);

  return (
    <div style={pageBg}>
      {/* Nav bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(14,11,30,0.65)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "rgba(200,190,255,0.7)" }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            My Dashboard
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span className="text-sm font-bold" style={{ color: "#ffffff", fontFamily: "'Syne', system-ui, sans-serif" }}>
            Community
          </span>
        </div>
        <span className="text-xs" style={{ color: "rgba(200,190,255,0.5)" }}>
          {loading ? "…" : `${profiles.length} member${profiles.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Hero */}
      <div className="px-6 pt-14 pb-10 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
          style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
          </svg>
          Builders & Makers
        </div>
        <h1 className="text-4xl font-bold mb-3" style={{ color: "#ffffff", fontFamily: "'Syne', system-ui, sans-serif", textShadow: "0 2px 20px rgba(124,58,237,0.4)" }}>
          Meet the Community
        </h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(200,190,255,0.65)" }}>
          Explore portfolios from everyone building on ProjectLocker.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: "rgba(200,190,255,0.4)" }}>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or bio…"
            className="w-full rounded-2xl py-3 pl-11 pr-4 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              backdropFilter: "blur(12px)",
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl p-6 space-y-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="shimmer rounded-full" style={{ height: 56, width: 56 }} />
                <div className="shimmer rounded-lg" style={{ height: 16, width: "60%" }} />
                <div className="shimmer rounded-lg" style={{ height: 12, width: "85%" }} />
                <div className="shimmer rounded-lg" style={{ height: 12, width: "70%" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="h-12 w-12 mb-4" style={{ color: "rgba(200,190,255,0.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <p className="text-sm" style={{ color: "rgba(200,190,255,0.5)" }}>
              {query ? "No members match your search" : "No members yet — be the first!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <Link
                key={p.username}
                href={`/u/${p.username}`}
                className="group flex flex-col rounded-2xl p-6 transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(12px)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.13)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.4)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                }}
              >
                {/* Avatar */}
                <div className="mb-4 flex items-start justify-between">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt={p.username ?? ""}
                      className="h-14 w-14 rounded-full object-cover"
                      style={{ border: "2px solid rgba(124,58,237,0.3)" }}
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{ background: avatarGradient(p.username ?? "") }}
                    >
                      {(p.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
                  >
                    {p.projectCount} project{p.projectCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Info */}
                <p className="text-base font-bold mb-1" style={{ color: "#ffffff", fontFamily: "'Syne', system-ui, sans-serif" }}>
                  @{p.username}
                </p>
                {p.bio && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "rgba(200,190,255,0.65)" }}>
                    {p.bio}
                  </p>
                )}

                {/* CTA */}
                <div className="mt-auto pt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#a78bfa" }}>
                  View portfolio
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
