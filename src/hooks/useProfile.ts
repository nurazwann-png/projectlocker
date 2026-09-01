"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ProfileLinks {
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface CoverPosition {
  x: number;
  y: number;
  scale: number;
}

export interface ProfileData {
  bio: string;
  cover: string | null;
  coverPosition: CoverPosition;
  avatar: string | null;
  links: ProfileLinks;
  skills: string[];
}

const DEFAULT_BIO = "Full-Stack Developer · Building things that matter";
const DEFAULT_COVER_POS: CoverPosition = { x: 50, y: 50, scale: 1 };
const DEFAULT_SKILLS = ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker"];

// Cover and avatar are base64 data URLs — kept in localStorage to avoid large DB payloads
function loadLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function saveLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* quota */ }
}

async function apiFetch(init?: RequestInit) {
  const res = await fetch("/api/profile", {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Profile API → ${res.status}`);
  return res.json();
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData>({
    bio: DEFAULT_BIO,
    cover: null,
    coverPosition: DEFAULT_COVER_POS,
    avatar: null,
    links: {},
    skills: DEFAULT_SKILLS,
  });
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save to API (skips cover/avatar — those stay local only)
  const persistToApi = useCallback((data: ProfileData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch({
        method: "PUT",
        body: JSON.stringify({
          bio: data.bio,
          coverUrl: null,         // not stored in DB
          coverPosition: JSON.stringify(data.coverPosition),
          avatarUrl: null,        // not stored in DB
          links: data.links,
          skills: data.skills,
        }),
      }).catch(() => {});
    }, 800);
  }, []);

  useEffect(() => {
    apiFetch()
      .then((row: Record<string, unknown>) => {
        setProfile({
          bio: (row.bio as string) ?? DEFAULT_BIO,
          cover: loadLocal("profile-cover"),
          coverPosition: row.coverPosition
            ? (JSON.parse(row.coverPosition as string) as CoverPosition)
            : DEFAULT_COVER_POS,
          avatar: loadLocal("profile-avatar"),
          links: (row.links as ProfileLinks) ?? {},
          skills: (row.skills as string[]) ?? DEFAULT_SKILLS,
        });
      })
      .catch(() => {
        // Fallback to localStorage if API fails
        setProfile({
          bio: loadLocal("profile-bio") ?? DEFAULT_BIO,
          cover: loadLocal("profile-cover"),
          coverPosition: (() => { try { return JSON.parse(loadLocal("profile-cover-position") ?? "{}"); } catch { return DEFAULT_COVER_POS; } })(),
          avatar: loadLocal("profile-avatar"),
          links: (() => { try { return JSON.parse(loadLocal("profile-links") ?? "{}"); } catch { return {}; } })(),
          skills: (() => { try { return JSON.parse(loadLocal("profile-skills") ?? "null") ?? DEFAULT_SKILLS; } catch { return DEFAULT_SKILLS; } })(),
        });
      })
      .finally(() => setHydrated(true));
  }, []);

  const setBio = useCallback((bio: string) => {
    setProfile((p) => { const next = { ...p, bio }; persistToApi(next); return next; });
  }, [persistToApi]);

  const setCover = useCallback((dataUrl: string | null) => {
    saveLocal("profile-cover", dataUrl);
    setProfile((p) => ({ ...p, cover: dataUrl }));
  }, []);

  const setCoverPosition = useCallback((pos: CoverPosition) => {
    setProfile((p) => { const next = { ...p, coverPosition: pos }; persistToApi(next); return next; });
  }, [persistToApi]);

  const setAvatar = useCallback((dataUrl: string | null) => {
    saveLocal("profile-avatar", dataUrl);
    setProfile((p) => ({ ...p, avatar: dataUrl }));
  }, []);

  const setLinks = useCallback((links: ProfileLinks) => {
    setProfile((p) => { const next = { ...p, links }; persistToApi(next); return next; });
  }, [persistToApi]);

  const setSkills = useCallback((skills: string[]) => {
    setProfile((p) => { const next = { ...p, skills }; persistToApi(next); return next; });
  }, [persistToApi]);

  return { profile, hydrated, setBio, setCover, setCoverPosition, setAvatar, setLinks, setSkills };
}
