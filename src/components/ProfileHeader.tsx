"use client";
// v2
import { useRef, useState, useCallback, useEffect } from "react";
import type { ProfileData, ProfileLinks, CoverPosition } from "@/hooks/useProfile";
import type { Project } from "@/types/project";

interface ProfileHeaderProps {
  profile: ProfileData;
  projects: Project[];
  onBioChange: (bio: string) => void;
  onCoverChange: (dataUrl: string | null) => void;
  onCoverPositionChange: (pos: CoverPosition) => void;
  onAvatarChange: (dataUrl: string | null) => void;
  onLinksChange: (links: ProfileLinks) => void;
  onSkillsChange: (skills: string[]) => void;
}

function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatChip({ label, count, color }: { label: string; count: number; color: string }) {
  const animated = useCountUp(count);
  return (
    <div
      className="flex items-center gap-2 rounded-full px-4 py-1.5 flex-shrink-0"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span className="text-lg font-bold tabular-nums" style={{ color }}>{animated}</span>
      <span className="text-xs font-medium" style={{ color: "rgba(220,215,255,0.7)" }}>{label}</span>
    </div>
  );
}

async function compressToDataUrl(file: File, type: "cover" | "avatar"): Promise<string> {
  const maxW = type === "cover" ? 1280 : 400;
  const maxH = type === "cover" ? 720 : 400;
  const quality = 0.80;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}

// ── Cover Editor ──────────────────────────────────────────────────────────────
interface CoverEditorProps {
  cover: string;
  initial: CoverPosition;
  onSave: (pos: CoverPosition) => void;
  onCancel: () => void;
}

function CoverEditor({ cover, initial, onSave, onCancel }: CoverEditorProps) {
  const [pos, setPos] = useState<CoverPosition>(initial);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      const pxPerPctX = rect.width / 100;
      const pxPerPctY = rect.height / 100;
      setPos((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(100, prev.x - dx / pxPerPctX)),
        y: Math.max(0, Math.min(100, prev.y - dy / pxPerPctY)),
      }));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragging.current = true;
    lastMouse.current = { x: t.clientX, y: t.clientY };
  }, []);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const t = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const dx = t.clientX - lastMouse.current.x;
      const dy = t.clientY - lastMouse.current.y;
      lastMouse.current = { x: t.clientX, y: t.clientY };
      const pxPerPctX = rect.width / 100;
      const pxPerPctY = rect.height / 100;
      setPos((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(100, prev.x - dx / pxPerPctX)),
        y: Math.max(0, Math.min(100, prev.y - dy / pxPerPctY)),
      }));
    };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: "rgba(14,11,30,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="mb-4 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium" style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e", boxShadow: "0 2px 12px rgba(124,58,237,0.1)" }}>
        <svg className="h-4 w-4" style={{ color: "#7c3aed" }} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd"/>
        </svg>
        Drag to reposition · Use slider to zoom
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden select-none"
        style={{
          width: "min(90vw, 960px)",
          height: "340px",
          borderRadius: "16px",
          border: "2px dashed rgba(124,58,237,0.5)",
          cursor: dragging.current ? "grabbing" : "grab",
          boxShadow: "0 0 40px rgba(124,58,237,0.2)",
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <img
          src={cover}
          alt="Cover preview"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: pos.scale === 1 ? "contain" : "cover",
            objectPosition: `${pos.x}% ${pos.y}%`,
            transform: `scale(${pos.scale})`,
            transformOrigin: `${pos.x}% ${pos.y}%`,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((cls) => (
          <div key={cls} className={`absolute ${cls} w-4 h-4 rounded-sm`} style={{ border: "2px solid rgba(124,58,237,0.7)" }} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 w-full" style={{ maxWidth: "min(90vw, 960px)" }}>
        <div className="flex items-center gap-3 w-full">
          <svg className="h-4 w-4 shrink-0" style={{ color: "#9693b8" }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="range"
            min={100}
            max={200}
            step={1}
            value={Math.round(pos.scale * 100)}
            onChange={(e) => setPos((prev) => ({ ...prev, scale: Number(e.target.value) / 100 }))}
            className="flex-1 h-1.5 rounded-full appearance-none outline-none"
            style={{ accentColor: "#7c3aed", background: "rgba(124,58,237,0.15)" }}
          />
          <svg className="h-5 w-5 shrink-0" style={{ color: "#9693b8" }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <span className="text-xs w-12 text-right" style={{ color: "#5b5880" }}>{Math.round(pos.scale * 100)}%</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.2)", color: "#5b5880" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(pos)}
            className="btn-gradient px-6 py-2 rounded-xl text-sm font-semibold text-white"
          >
            Save Position
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProfileHeader ────────────────────────────────────────────────────────
export default function ProfileHeader({
  profile,
  projects,
  onBioChange,
  onCoverChange,
  onCoverPositionChange,
  onAvatarChange,
  onLinksChange,
  onSkillsChange,
}: ProfileHeaderProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);
  const [editingLinks, setEditingLinks] = useState(false);
  const [linksDraft, setLinksDraft] = useState<ProfileLinks>(profile.links);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const typedBio = useTypewriter(profile.bio, 18);
  const [editingCover, setEditingCover] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const total = projects.length;
  const live = projects.filter((p) => p.status === "Live").length;
  const maintenance = projects.filter((p) => p.status === "Maintenance").length;
  const deprecated = projects.filter((p) => p.status === "Deprecated").length;

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    try {
      const dataUrl = await compressToDataUrl(file, "cover");
      onCoverChange(dataUrl);
      onCoverPositionChange({ x: 50, y: 50, scale: 1 });
      setEditingCover(true);
    } catch {
      alert("Failed to process cover photo. Please try again.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    try {
      const dataUrl = await compressToDataUrl(file, "avatar");
      onAvatarChange(dataUrl);
    } catch {
      alert("Failed to process profile photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function saveBio() {
    onBioChange(bioDraft);
    setEditingBio(false);
  }

  function saveLinks() {
    onLinksChange(linksDraft);
    setEditingLinks(false);
  }

  const coverImgStyle: React.CSSProperties = profile.cover
    ? {
        width: "100%",
        height: "100%",
        objectFit: profile.coverPosition.scale === 1 ? "contain" : "cover",
        objectPosition: `${profile.coverPosition.x}% ${profile.coverPosition.y}%`,
        transform: `scale(${profile.coverPosition.scale})`,
        transformOrigin: `${profile.coverPosition.x}% ${profile.coverPosition.y}%`,
      }
    : {};

  return (
    <div className="relative mb-8">
      {editingCover && profile.cover && (
        <CoverEditor
          cover={profile.cover}
          initial={profile.coverPosition}
          onSave={(pos) => { onCoverPositionChange(pos); setEditingCover(false); }}
          onCancel={() => setEditingCover(false)}
        />
      )}

      {/* Cover photo */}
      <div
        className="relative w-full overflow-hidden group/cover"
        style={{ height: "clamp(220px, 45vw, 380px)", borderRadius: "0 0 28px 28px" }}
      >
        {/* Bottom fade blends into lavender bg */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{ height: "clamp(80px, 18vw, 140px)", background: "linear-gradient(to bottom, transparent, rgba(10,8,28,0.5))" }}
        />
        {profile.cover ? (
          <img src={profile.cover} alt="Cover" draggable={false} style={coverImgStyle} />
        ) : (
          /* Default futuristic circuit-board cover */
          <svg
            className="w-full h-full"
            viewBox="0 0 1024 380"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="cg1" cx="35%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#0a1628"/>
                <stop offset="100%" stopColor="#040d1e"/>
              </radialGradient>
              <radialGradient id="cglow" cx="38%" cy="50%" r="35%">
                <stop offset="0%" stopColor="#00c8ff" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#00c8ff" stopOpacity="0"/>
              </radialGradient>
              <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
              <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
            </defs>
            {/* Deep dark blue background */}
            <rect width="1024" height="380" fill="url(#cg1)"/>
            {/* Ambient glow behind hex */}
            <ellipse cx="390" cy="190" rx="280" ry="200" fill="url(#cglow)"/>

            {/* Scattered background nodes */}
            {[[80,60],[920,40],[950,300],[60,320],[800,80],[700,340],[150,200],[860,190]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="2" fill="#1a3a5c"/>
                <line x1={x} y1={y} x2={x+(i%2?60:-80)} y2={y+(i%3?40:-30)} stroke="#1a3a5c" strokeWidth="0.8"/>
              </g>
            ))}

            {/* Circuit traces - horizontal/vertical lines */}
            <g stroke="#0d2a45" strokeWidth="1" fill="none">
              <polyline points="0,120 180,120 220,80 380,80"/>
              <polyline points="0,240 100,240 140,200 200,200"/>
              <polyline points="600,80 720,80 760,120 900,120 1024,120"/>
              <polyline points="620,300 740,300 780,260 1024,260"/>
              <polyline points="200,200 260,200 300,240 400,240 420,220"/>
              <polyline points="700,180 760,180 800,140 900,140"/>
            </g>
            {/* Brighter accent traces */}
            <g stroke="#0a4a6e" strokeWidth="1.2" fill="none">
              <polyline points="160,120 220,80 350,80 390,120"/>
              <polyline points="420,220 460,260 560,260 600,300 680,300"/>
              <polyline points="750,180 790,140 870,140 900,120"/>
            </g>
            {/* Glowing trace segments */}
            <g stroke="#00c8ff" strokeWidth="1.5" fill="none" opacity="0.5">
              <polyline points="220,80 310,80 340,108"/>
              <polyline points="460,260 540,260 560,240"/>
              <polyline points="790,140 850,140 870,120"/>
            </g>

            {/* Small junction dots on traces */}
            {[[220,80],[310,80],[460,260],[540,260],[790,140],[850,140],[200,200],[300,240],[760,180]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r="3" fill="#0d3050" stroke="#1a5a80" strokeWidth="1"/>
            ))}
            {/* Glowing junction dots */}
            {[[310,80],[540,260],[850,140]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#00c8ff" opacity="0.15" filter="url(#blur2)"/>
                <circle cx={x} cy={y} r="2.5" fill="#00c8ff" opacity="0.7"/>
              </g>
            ))}

            {/* ── Main hexagon ── */}
            {/* Outer hex glow */}
            <polygon points="390,60 480,110 480,210 390,260 300,210 300,110" fill="none" stroke="#00c8ff" strokeWidth="1" opacity="0.12" filter="url(#blur6)"/>
            {/* Hex layers */}
            <polygon points="390,70 472,115 472,205 390,250 308,205 308,115" fill="none" stroke="#0d3a58" strokeWidth="1.5"/>
            <polygon points="390,82 460,122 460,198 390,238 320,198 320,122" fill="none" stroke="#0d3a58" strokeWidth="1.2"/>
            <polygon points="390,95 448,130 448,190 390,225 332,190 332,130" fill="none" stroke="#0d4a6e" strokeWidth="1"/>
            <polygon points="390,108 436,138 436,182 390,212 344,182 344,138" fill="none" stroke="#0d5a80" strokeWidth="1"/>
            {/* Outer hex bright */}
            <polygon points="390,70 472,115 472,205 390,250 308,205 308,115" fill="none" stroke="#00c8ff" strokeWidth="1.5" opacity="0.35"/>
            {/* Inner filled hex */}
            <polygon points="390,110 430,133 430,179 390,202 350,179 350,133" fill="#071525" stroke="#00c8ff" strokeWidth="1.5" opacity="0.8"/>
            {/* C-shape inside (circuit symbol) */}
            <path d="M415,146 Q390,128 365,146 L365,194 Q390,212 415,194" fill="none" stroke="#00c8ff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            {/* Center glow dot */}
            <circle cx="390" cy="160" r="8" fill="#00c8ff" opacity="0.08" filter="url(#blur2)"/>
            <circle cx="390" cy="160" r="3" fill="#00c8ff" opacity="0.5"/>

            {/* Hex connection arms */}
            <g stroke="#00c8ff" strokeWidth="1.2" opacity="0.4">
              <line x1="308" y1="160" x2="250" y2="160"/>
              <line x1="472" y1="160" x2="540" y2="160"/>
              <line x1="350" y1="115" x2="310" y2="80"/>
              <line x1="430" y1="115" x2="470" y2="80"/>
            </g>
            {/* Arm endpoint dots */}
            {[[250,160],[540,160],[310,80],[470,80]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#00c8ff" opacity="0.12" filter="url(#blur2)"/>
                <circle cx={x} cy={y} r="2.5" fill="#00c8ff" opacity="0.6"/>
              </g>
            ))}

            {/* Right side shattered triangles */}
            <g fill="none" strokeWidth="1">
              <polygon points="680,100 740,60 760,130" stroke="#0d3a58" fill="#071828"/>
              <polygon points="740,60 810,80 760,130" stroke="#0d4a68" fill="#091525"/>
              <polygon points="760,130 810,80 840,160" stroke="#0d3a58" fill="#071828"/>
              <polygon points="800,170 840,160 820,220" stroke="#0a4a6e" fill="#071525"/>
              <polygon points="680,200 720,240 660,260" stroke="#0d3a58" fill="#071828"/>
            </g>
            {/* Triangle accent edges */}
            <polygon points="740,60 810,80 760,130" stroke="#00c8ff" strokeWidth="0.8" fill="none" opacity="0.25"/>

            {/* Top-right scattered nodes */}
            {[[900,50],[930,90],[870,110],[950,140],[880,160]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="2" fill="#1a3a5c"/>
                <line x1={x} y1={y} x2={x-30} y2={y+20} stroke="#1a3a5c" strokeWidth="0.8"/>
              </g>
            ))}
            {/* Glowing network dots - right cluster */}
            {[[900,50],[870,110],[950,140]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#00c8ff" opacity="0.1" filter="url(#blur2)"/>
                <circle cx={x} cy={y} r="2" fill="#00c8ff" opacity="0.55"/>
              </g>
            ))}
            <line x1="900" y1="50" x2="870" y2="110" stroke="#1a4a6e" strokeWidth="0.8"/>
            <line x1="870" y1="110" x2="950" y2="140" stroke="#1a4a6e" strokeWidth="0.8"/>
            <line x1="950" y1="140" x2="900" y2="50" stroke="#1a4a6e" strokeWidth="0.8"/>

            {/* Bottom-left network */}
            {[[80,280],[140,320],[60,350],[120,360]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="2" fill="#1a3a5c"/>
              </g>
            ))}
            {[[80,280],[60,350]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#00c8ff" opacity="0.1" filter="url(#blur2)"/>
                <circle cx={x} cy={y} r="2" fill="#00c8ff" opacity="0.5"/>
              </g>
            ))}
            <line x1="80" y1="280" x2="140" y2="320" stroke="#1a4a6e" strokeWidth="0.8"/>
            <line x1="140" y1="320" x2="60" y2="350" stroke="#1a4a6e" strokeWidth="0.8"/>
          </svg>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover/cover:opacity-100 transition-opacity"
          style={{ background: "rgba(14,11,30,0.4)" }}
        >
          <button
            onClick={() => !coverUploading && coverInputRef.current?.click()}
            disabled={coverUploading}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", opacity: coverUploading ? 0.7 : 1 }}
          >
            {coverUploading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            )}
            {coverUploading ? "Processing…" : "Change Photo"}
          </button>

          {profile.cover && (
            <button
              onClick={() => setEditingCover(true)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
              style={{ background: "rgba(124,58,237,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(124,58,237,0.5)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5A.75.75 0 0 1 9 10ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/>
              </svg>
              Reposition
            </button>
          )}

          {profile.cover && (
            <button
              onClick={() => onCoverChange(null)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
              style={{ background: "rgba(220,38,38,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(220,38,38,0.4)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              Remove
            </button>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </div>

      {/* Avatar + profile info */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        <div
          className="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer group/avatar"
          style={{ marginTop: "-40px", zIndex: 20 }}
          onClick={() => !avatarUploading && avatarInputRef.current?.click()}
          title="Click to change avatar"
        >
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-bold"
            style={{
              background: profile.avatar ? "transparent" : "linear-gradient(135deg, #7c3aed, #db2777, #0ea5e9)",
              border: "4px solid #eeeaff",
              color: "white",
              boxShadow: "0 4px 16px rgba(124,58,237,0.2)",
            }}
          >
            {profile.avatar
              ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              : <span>NI</span>
            }
          </div>
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-200"
            style={{ background: "rgba(14,11,30,0.5)" }}
          >
            {avatarUploading ? (
              <svg className="h-5 w-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "#ffffff", fontFamily: "'Syne', system-ui, sans-serif", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>Nurazwann Ismail</h1>
            <div className="flex items-center gap-1 ml-1">
              {profile.links.github && (
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: "rgba(200,190,255,0.65)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(200,190,255,0.65)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              )}
              {profile.links.linkedin && (
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: "rgba(200,190,255,0.65)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(200,190,255,0.65)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              {profile.links.website && (
                <a href={profile.links.website} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: "rgba(200,190,255,0.65)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(200,190,255,0.65)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1.69-9.995a3.5 3.5 0 0 1 5.99-2.451l-1.413 1.413A1.5 1.5 0 0 0 10.81 8H9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 1 0 1.5H9.25a.75.75 0 0 0-.75.75v1.5a.75.75 0 0 0 1.5 0v-.75h.81a3 3 0 0 0 2.84-2.007.75.75 0 0 0-1.42-.486 1.5 1.5 0 0 1-1.42 1.003H10a.75.75 0 0 1 0-1.5h1.25a.75.75 0 0 0 0-1.5H10a2 2 0 0 1-2-2Z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
              <button
                onClick={() => { setLinksDraft(profile.links); setEditingLinks(true); }}
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: "#c4bfe0" }}
                title="Edit social links"
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#c4bfe0"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            {editingBio ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveBio(); if (e.key === "Escape") setEditingBio(false); }}
                  className="flex-1 rounded-lg px-3 py-1 text-sm outline-none"
                  style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.4)", color: "#0d0b1e", boxShadow: "0 0 0 3px rgba(124,58,237,0.1)" }}
                />
                <button onClick={saveBio} className="btn-gradient rounded-lg px-3 py-1 text-xs font-semibold text-white">Save</button>
                <button onClick={() => setEditingBio(false)} className="text-xs transition-colors" style={{ color: "#9693b8" }}>Cancel</button>
              </div>
            ) : (
              <>
                <p className="text-sm" style={{ color: "rgba(220,215,255,0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                  {typedBio}
                  {typedBio.length < profile.bio.length && (
                    <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "#a78bfa" }} />
                  )}
                </p>
                <button
                  onClick={() => { setBioDraft(profile.bio); setEditingBio(true); }}
                  className="shrink-0 rounded p-0.5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  title="Edit bio"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Vanity URL chip */}
        {profile.links.website && (
          <div className="mt-3">
            <a
              href={profile.links.website.startsWith("http") ? profile.links.website : `https://${profile.links.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold transition-all"
              style={{
                background: "rgba(124,58,237,0.25)",
                color: "#c4b5fd",
                border: "1px solid rgba(167,139,250,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.38)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px rgba(124,58,237,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.25)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.25-9.5a.75.75 0 0 0 0 1.5h2.44l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 0 0-1.06 1.06l1.72 1.72H7.75Z" clipRule="evenodd" />
              </svg>
              {profile.links.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </div>
        )}

        {/* Stats chips */}
        {total > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            <StatChip label="Total Projects" count={total} color="#7c3aed" />
            <StatChip label="Live" count={live} color="#059669" />
            <StatChip label="In Maintenance" count={maintenance} color="#d97706" />
            <StatChip label="Deprecated" count={deprecated} color="#dc2626" />
          </div>
        )}

        {/* Skills / expertise */}
        {profile.skills.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(200,190,255,0.55)", fontFamily: "'Syne', system-ui, sans-serif" }}>Expertise</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#e0d9ff", border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  {skill}
                </span>
              ))}
              <button
                onClick={() => setEditingSkills(true)}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs transition-colors"
                style={{ background: "transparent", color: "rgba(200,190,255,0.55)", border: "1px dashed rgba(200,190,255,0.3)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e0d9ff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(200,190,255,0.6)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,190,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(200,190,255,0.3)"; }}
              >
                + Edit
              </button>
            </div>
          </div>
        )}
        {profile.skills.length === 0 && (
          <button
            onClick={() => setEditingSkills(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "rgba(200,190,255,0.55)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e0d9ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,190,255,0.55)"; }}
          >
            + Add skills
          </button>
        )}
      </div>

      {/* Links edit modal */}
      {editingLinks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(14,11,30,0.5)", backdropFilter: "blur(12px)" }} onClick={() => setEditingLinks(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 8px 40px rgba(124,58,237,0.12), 0 2px 12px rgba(0,0,0,0.08)" }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>Social Links</h3>
            <div className="space-y-3">
              {(["github","linkedin","website"] as const).map((key) => (
                <div key={key}>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "#9693b8" }}>{key}</label>
                  <input
                    type="url"
                    value={linksDraft[key] ?? ""}
                    onChange={(e) => setLinksDraft((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                    placeholder={key === "github" ? "https://github.com/username" : key === "linkedin" ? "https://linkedin.com/in/username" : "https://yoursite.com"}
                    className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditingLinks(false)} className="px-4 py-2 text-sm rounded-xl transition-colors" style={{ background: "rgba(124,58,237,0.05)", color: "#5b5880", border: "1px solid rgba(124,58,237,0.15)" }}>Cancel</button>
              <button onClick={saveLinks} className="btn-gradient px-4 py-2 text-sm font-semibold text-white rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Skills edit modal */}
      {editingSkills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(14,11,30,0.5)", backdropFilter: "blur(12px)" }} onClick={() => setEditingSkills(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 8px 40px rgba(124,58,237,0.12), 0 2px 12px rgba(0,0,0,0.08)" }}>
            <h3 className="text-base font-bold mb-1" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>Skills & Expertise</h3>
            <p className="text-xs mb-4" style={{ color: "#9693b8" }}>Click a skill to remove it. Type below to add.</p>
            <div className="flex flex-wrap gap-1.5 mb-4 min-h-[40px]">
              {profile.skills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => onSkillsChange(profile.skills.filter((s) => s !== skill))}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all group"
                  style={{ background: "rgba(124,58,237,0.08)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.2)" }}
                  title="Click to remove"
                >
                  {skill}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = skillInput.trim();
                    if (val && !profile.skills.includes(val)) onSkillsChange([...profile.skills, val]);
                    setSkillInput("");
                  }
                }}
                placeholder="e.g. Rust, Figma, AWS…"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", color: "#0d0b1e" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <button
                onClick={() => {
                  const val = skillInput.trim();
                  if (val && !profile.skills.includes(val)) onSkillsChange([...profile.skills, val]);
                  setSkillInput("");
                }}
                className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.18)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
              >
                Add
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setEditingSkills(false)} className="btn-gradient px-4 py-2 text-sm font-semibold text-white rounded-xl">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
