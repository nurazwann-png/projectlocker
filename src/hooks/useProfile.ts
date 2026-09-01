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

  const persistToApi = useCallback((data: ProfileData & { coverUrl?: string | null; avatarUrl?: string | null }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch({
        method: "PUT",
        body: JSON.stringify({
          bio: data.bio,
          coverUrl: data.coverUrl,
          coverPosition: JSON.stringify(data.coverPosition),
          avatarUrl: data.avatarUrl,
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
          cover: (row.coverUrl as string) ?? null,
          coverPosition: row.coverPosition
            ? (JSON.parse(row.coverPosition as string) as CoverPosition)
            : DEFAULT_COVER_POS,
          avatar: (row.avatarUrl as string) ?? null,
          links: (row.links as ProfileLinks) ?? {},
          skills: (row.skills as string[]) ?? DEFAULT_SKILLS,
        });
      })
      .catch(() => {
        setProfile({
          bio: DEFAULT_BIO,
          cover: null,
          coverPosition: DEFAULT_COVER_POS,
          avatar: null,
          links: {},
          skills: DEFAULT_SKILLS,
        });
      })
      .finally(() => setHydrated(true));
  }, []);

  const setBio = useCallback((bio: string) => {
    setProfile((p) => { const next = { ...p, bio }; persistToApi({ ...next, coverUrl: p.cover, avatarUrl: p.avatar }); return next; });
  }, [persistToApi]);

  const setCover = useCallback((url: string | null) => {
    setProfile((p) => {
      const next = { ...p, cover: url };
      persistToApi({ ...next, coverUrl: url, avatarUrl: p.avatar });
      return next;
    });
  }, [persistToApi]);

  const setCoverPosition = useCallback((pos: CoverPosition) => {
    setProfile((p) => {
      const next = { ...p, coverPosition: pos };
      persistToApi({ ...next, coverUrl: p.cover, avatarUrl: p.avatar });
      return next;
    });
  }, [persistToApi]);

  const setAvatar = useCallback((url: string | null) => {
    setProfile((p) => {
      const next = { ...p, avatar: url };
      persistToApi({ ...next, coverUrl: p.cover, avatarUrl: url });
      return next;
    });
  }, [persistToApi]);

  const setLinks = useCallback((links: ProfileLinks) => {
    setProfile((p) => { const next = { ...p, links }; persistToApi({ ...next, coverUrl: p.cover, avatarUrl: p.avatar }); return next; });
  }, [persistToApi]);

  const setSkills = useCallback((skills: string[]) => {
    setProfile((p) => { const next = { ...p, skills }; persistToApi({ ...next, coverUrl: p.cover, avatarUrl: p.avatar }); return next; });
  }, [persistToApi]);

  return { profile, hydrated, setBio, setCover, setCoverPosition, setAvatar, setLinks, setSkills };
}
