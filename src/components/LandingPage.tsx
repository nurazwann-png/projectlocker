"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const PROJECTS = [
  { label: "🚀", title: "Your Project", desc: "Log your deployed projects with status, tech stack, and deployment dates.", tags: ["React", "Node.js", "PostgreSQL"], from: "#7c3aed", to: "#4f46e5" },
  { label: "🌐", title: "Portfolio App", desc: "Share a public profile showcasing all your live projects in one place.", tags: ["Next.js", "Tailwind"], from: "#ec4899", to: "#db2777" },
  { label: "📦", title: "Side Project", desc: "Keep private notes and track progress — visible only to you.", tags: ["TypeScript", "Prisma"], from: "#06b6d4", to: "#0284c7" },
];

const MEMBERS: { initial: string; username: string; role: string; count: number; bg: string }[] = [];

const FEATURES = [
  { icon: "M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 1 1.1 1.677A.75.75 0 0 1 13 17.5h-6a.75.75 0 0 1-.745-.823A3.501 3.501 0 0 1 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Z", title: "Track every deploy", desc: "Log projects with status, tech stack, and deployment dates.", accent: "#7c3aed", light: "#f3eeff" },
  { icon: "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", title: "Share your portfolio", desc: "Public profile at /u/your-username — ready to share with anyone.", accent: "#ec4899", light: "#fff0f7" },
  { icon: "M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 0 0 1.33 0l1.713-3.293a.647.647 0 0 1 .642-.413 41.102 41.102 0 0 0 3.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z", title: "Build in public", desc: "Visitors can comment on your projects and follow your journey.", accent: "#06b6d4", light: "#ecfeff" },
  { icon: "M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439L3.5 3.066V2.75Z", title: "Activity heatmap", desc: "GitHub-style heatmap showing when and how often you ship.", accent: "#f59e0b", light: "#fffbeb" },
  { icon: "M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z", title: "Private notes", desc: "PIN-locked notes visible only to you — never to the public.", accent: "#10b981", light: "#ecfdf5" },
  { icon: "M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 9.5a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H2ZM1 15a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-1Z", title: "Multiple views", desc: "Grid, list, or timeline — your preferred view remembered for visitors.", accent: "#8b5cf6", light: "#f5f3ff" },
];

const syne: import("react").CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif" };

function CardStack() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset((o) => (o + 1) % PROJECTS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const pos = ["front", "mid", "back"] as const;
  return (
    <div className="relative h-[320px] w-[300px] select-none">
      {PROJECTS.map((p, i) => {
        const posIdx = (i - offset + PROJECTS.length) % PROJECTS.length;
        const styles: Record<string, import("react").CSSProperties> = {
          front: { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1, zIndex: 3 },
          mid:   { transform: "translateY(-28px) scale(0.93) rotate(-2deg)", opacity: 0.5, zIndex: 2 },
          back:  { transform: "translateY(-52px) scale(0.86) rotate(-4deg)", opacity: 0.25, zIndex: 1 },
        };
        return (
          <div key={i} className="absolute w-[300px] rounded-2xl p-5 shadow-xl" style={{ background: "#fff", border: "1.5px solid #e9e3ff", transition: "all 0.6s ease", ...styles[pos[posIdx]] }}>
            <div className="mb-4 flex h-28 w-full items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
              <span style={{ ...syne, fontSize: "1.9rem", fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "-0.05em" }}>{p.label}</span>
            </div>
            <div className="mb-1 flex items-center justify-between">
              <span style={{ ...syne, fontWeight: 700, fontSize: "0.9rem", color: "#0d0b1e" }}>{p.title}</span>
              <span className="flex items-center gap-1 text-xs font-bold" style={{ ...syne, color: "#10b981" }}>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#10b981" }} />Live
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "#9693b8" }}>{p.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ ...syne, background: p.from + "18", color: p.from, border: `1px solid ${p.from}30` }}>{t}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Btn = ({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all"
    style={{ ...syne, fontSize: "0.95rem", background: primary ? "#7c3aed" : "transparent", color: primary ? "#fff" : "#7c3aed", border: primary ? "none" : "2px solid #7c3aed", cursor: "pointer" }}
    onMouseEnter={(e) => { const b = e.currentTarget; if (primary) { b.style.background = "#6d28d9"; b.style.transform = "translateY(-1px)"; b.style.boxShadow = "0 8px 24px rgba(124,58,237,0.35)"; } else { b.style.background = "#f3eeff"; } }}
    onMouseLeave={(e) => { const b = e.currentTarget; if (primary) { b.style.background = "#7c3aed"; b.style.transform = "none"; b.style.boxShadow = "none"; } else { b.style.background = "transparent"; } }}>
    {children}
  </button>
);

export default function LandingPage() {
  return (
    <div style={{ background: "#fff", color: "#0d0b1e", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');`}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-16" style={{ height: 60, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ede9fe" }}>
        <div className="flex items-center gap-2" style={{ ...syne, fontWeight: 800, fontSize: "1.05rem", color: "#0d0b1e", letterSpacing: "-0.02em" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.jpg" alt="ProjectLocker" className="h-7 w-7 flex-shrink-0 rounded-lg object-cover" style={{ border: "2px solid #ede9fe" }} />
          ProjectLocker
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-1.5" style={{ ...syne, color: "#9693b8", background: "transparent", textDecoration: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#7c3aed"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#9693b8"; }}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
            </svg>
            Admin
          </a>
          <SignInButton mode="modal">
            <button className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ ...syne, color: "#6d28d9", background: "transparent", border: "none", cursor: "pointer" }}>Sign in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg px-4 py-2 text-sm font-bold" style={{ ...syne, background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", borderRadius: 8 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#6d28d9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7c3aed"; }}>
              Get started
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(160deg, #faf5ff 0%, #fce7f3 35%, #ecfeff 70%, #fffbeb 100%)" }}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-2 md:items-center md:py-14 lg:px-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: "#7c3aed", color: "#fff" }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "#a78bfa" }} />
              <span style={{ ...syne, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Now in public beta</span>
            </div>
            <h1 style={{ ...syne, fontWeight: 800, fontSize: "clamp(2.4rem,4.5vw,3.8rem)", lineHeight: 1.06, letterSpacing: "-0.03em", textWrap: "balance", marginBottom: "1.5rem" }}>
              Every project you ship,{" "}
              <span style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                documented and shared.
              </span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#6b6894", lineHeight: 1.75, maxWidth: "44ch", marginBottom: "2.25rem" }}>
              Deploy. Log. Showcase. ProjectLocker turns your deployment history into a living portfolio that grows with every release.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SignUpButton mode="modal">
                <Btn primary>Get started free →</Btn>
              </SignUpButton>
              <SignInButton mode="modal">
                <button style={{ ...syne, fontSize: "0.9rem", fontWeight: 600, color: "#9693b8", background: "transparent", border: "none", cursor: "pointer" }}>Already have an account →</button>
              </SignInButton>
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <CardStack />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-16">
        <div className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ ...syne, color: "#7c3aed" }}>Everything you need</div>
        <h2 style={{ ...syne, fontWeight: 800, fontSize: "clamp(1.8rem,3vw,2.6rem)", letterSpacing: "-0.03em", color: "#0d0b1e", textWrap: "balance", marginBottom: "3rem" }}>Built for developers who ship.</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-2xl p-6 transition-all" style={{ background: f.light, border: `1.5px solid ${f.accent}20` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${f.accent}20`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: f.accent }}>
                <svg viewBox="0 0 20 20" fill="white" className="h-5 w-5"><path d={f.icon} fillRule="evenodd" clipRule="evenodd" /></svg>
              </div>
              <h3 style={{ ...syne, fontWeight: 700, fontSize: "1rem", color: "#0d0b1e", marginBottom: "0.4rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b6894", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>


      {/* CTA band */}
      <div className="mx-6 my-16 overflow-hidden rounded-3xl lg:mx-16" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%)", padding: "clamp(2.5rem,5vw,4rem)" }}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 style={{ ...syne, fontWeight: 800, fontSize: "clamp(1.6rem,3vw,2.4rem)", letterSpacing: "-0.03em", color: "#fff", textWrap: "balance", maxWidth: "32ch" }}>
            Start logging your work.<br /><span style={{ opacity: 0.85 }}>Your future self will thank you.</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <SignUpButton mode="modal">
              <button className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all" style={{ ...syne, fontSize: "0.95rem", background: "#fff", color: "#7c3aed", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
                Create free account →
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button style={{ ...syne, fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.8)", background: "transparent", border: "2px solid rgba(255,255,255,0.4)", borderRadius: 12, padding: "0.75rem 1.5rem", cursor: "pointer" }}>Sign in</button>
            </SignInButton>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t px-6 py-5 lg:px-16" style={{ borderColor: "#ede9fe" }}>
        <span style={{ ...syne, fontWeight: 700, fontSize: "0.875rem", color: "#9693b8" }}>ProjectLocker</span>
        <p style={{ fontSize: "0.78rem", color: "#9693b8" }}>Track what you build. Share what you ship.</p>
      </footer>
    </div>
  );
}
