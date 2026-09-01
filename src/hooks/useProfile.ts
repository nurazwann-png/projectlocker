"use client";

import { useState, useEffect, useCallback } from "react";

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

const KEYS = {
  bio: "profile-bio",
  cover: "profile-cover",
  coverPosition: "profile-cover-position",
  avatar: "profile-avatar",
  links: "profile-links",
  skills: "profile-skills",
} as const;

function loadString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function saveString(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* quota */ }
}
function loadJson<T>(key: string, fallback: T): T {
  const raw = loadString(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
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

  useEffect(() => {
    setProfile({
      bio: loadString(KEYS.bio) ?? DEFAULT_BIO,
      cover: loadString(KEYS.cover),
      coverPosition: loadJson<CoverPosition>(KEYS.coverPosition, DEFAULT_COVER_POS),
      avatar: loadString(KEYS.avatar),
      links: loadJson<ProfileLinks>(KEYS.links, {}),
      skills: loadJson<string[]>(KEYS.skills, DEFAULT_SKILLS),
    });
    setHydrated(true);
  }, []);

  const setBio = useCallback((bio: string) => {
    saveString(KEYS.bio, bio);
    setProfile((p) => ({ ...p, bio }));
  }, []);

  const setCover = useCallback((dataUrl: string | null) => {
    saveString(KEYS.cover, dataUrl);
    setProfile((p) => ({ ...p, cover: dataUrl }));
  }, []);

  const setCoverPosition = useCallback((pos: CoverPosition) => {
    saveString(KEYS.coverPosition, JSON.stringify(pos));
    setProfile((p) => ({ ...p, coverPosition: pos }));
  }, []);

  const setAvatar = useCallback((dataUrl: string | null) => {
    saveString(KEYS.avatar, dataUrl);
    setProfile((p) => ({ ...p, avatar: dataUrl }));
  }, []);

  const setLinks = useCallback((links: ProfileLinks) => {
    saveString(KEYS.links, JSON.stringify(links));
    setProfile((p) => ({ ...p, links }));
  }, []);

  const setSkills = useCallback((skills: string[]) => {
    saveString(KEYS.skills, JSON.stringify(skills));
    setProfile((p) => ({ ...p, skills }));
  }, []);

  return { profile, hydrated, setBio, setCover, setCoverPosition, setAvatar, setLinks, setSkills };
}
