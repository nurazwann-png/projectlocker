"use client";

import { useState, useEffect, useMemo } from "react";
import { use } from "react";
import type { Project, ProjectStatus } from "@/types/project";
import type { ProfileData, ProfileLinks, CoverPosition } from "@/hooks/useProfile";
import ProjectCard from "@/components/ProjectCard";
import ProjectDetailModal from "@/components/ProjectDetailModal";
import ProfileHeader from "@/components/ProfileHeader";
import SearchBar, { type SortOption } from "@/components/SearchBar";
import TagCloud from "@/components/TagCloud";

const EMPTY_PROFILE: ProfileData & { username?: string | null } = {
  bio: "",
  cover: null,
  coverPosition: { x: 50, y: 50, scale: 1 },
  avatar: null,
  links: {},
  skills: [],
  username: null,
};

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<ProfileData & { username?: string | null }>(EMPTY_PROFILE);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pRes, prRes] = await Promise.all([
          fetch(`/api/public/${username}/profile`),
          fetch(`/api/public/${username}/projects`),
        ]);
        if (pRes.status === 404) { setNotFound(true); return; }
        const pData = await pRes.json();
        const prData = await prRes.json();
        setProfile({
          bio: pData.bio ?? "",
          cover: pData.coverUrl ?? null,
          coverPosition: pData.coverPosition ? JSON.parse(pData.coverPosition) : { x: 50, y: 50, scale: 1 },
          avatar: pData.avatarUrl ?? null,
          links: (pData.links as ProfileLinks) ?? {},
          skills: (pData.skills as string[]) ?? [],
          username: pData.username ?? username,
        });
        setProjects(Array.isArray(prData) ? prData.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: (p.title as string) ?? "",
          description: (p.description as string) ?? "",
          liveUrl: (p.liveUrl as string) ?? "",
          repoUrl: (p.repoUrl as string) ?? "",
          techStack: Array.isArray(p.techStack) ? p.techStack as string[] : [],
          deploymentDate: (p.deploymentDate as string) ?? "",
          status: (p.status as Project["status"]) ?? "Live",
          thumbnail: (p.coverImage as string | null) ?? null,
          notes: (p.notes as string) ?? "",
          notesLocked: Boolean(p.notesLocked),
          features: Array.isArray(p.features) ? p.features as string[] : [],
          pinned: Boolean(p.pinned),
          createdAt: (p.createdAt as string) ?? "",
          updatedAt: (p.updatedAt as string) ?? "",
        })) : []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (tagFilter) list = list.filter((p) => (p.techStack ?? []).includes(tagFilter));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (sort === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return list;
  }, [projects, query, sort, tagFilter]);

  const pageBg: import("react").CSSProperties = {
    backgroundImage: "url('/bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundAttachment: "fixed",
    backgroundColor: "#eeeaff",
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={pageBg}>
      <div className="flex flex-col items-center gap-3">
        <svg className="h-8 w-8 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-sm" style={{ color: "#9693b8" }}>Loading profile…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={pageBg}>
      <div className="text-center">
        <p className="text-6xl mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>Profile not found</h1>
        <p className="text-sm" style={{ color: "#9693b8" }}>No user found at <span className="font-mono">/u/{username}</span></p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={pageBg}>
      {/* "Viewing portfolio" banner */}
      <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium" style={{ background: "rgba(124,58,237,0.08)", borderBottom: "1px solid rgba(124,58,237,0.12)", color: "#7c3aed" }}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
        </svg>
        You&apos;re viewing <span className="font-semibold">@{username}</span>&apos;s portfolio · view only
      </div>

      <ProfileHeader
        profile={profile}
        projects={projects}
        onBioChange={() => {}}
        onCoverChange={() => {}}
        onCoverPositionChange={() => {}}
        onAvatarChange={() => {}}
        onLinksChange={() => {}}
        onSkillsChange={() => {}}
        readOnly
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Search + sort */}
        {projects.length > 0 && (
          <div className="mb-6">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              sort={sort}
              onSortChange={setSort}
            />
          </div>
        )}

        {/* Tag cloud */}
        {projects.length > 0 && (
          <TagCloud projects={projects} activeTag={tagFilter} onTagClick={(t) => setTagFilter(t === tagFilter ? "" : t)} />
        )}

        {/* Projects grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="h-12 w-12 mb-4" style={{ color: "#c4bfe0" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0A2.25 2.25 0 0 1 19.5 18H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: "#9693b8" }}>{query || tagFilter ? "No projects match your search" : "No projects yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                onEdit={() => {}}
                onDelete={() => {}}
                onCardClick={setDetailProject}
                onTagClick={(t) => setTagFilter(t === tagFilter ? "" : t)}
                activeTagFilter={tagFilter}
                readOnly
              />
            ))}
          </div>
        )}

        {/* Activity heatmap — owner only, not shown on public view */}
      </div>

      {/* Detail modal (read-only — onEdit no-op, onNotesChange no-op) */}
      <ProjectDetailModal
        project={detailProject}
        onClose={() => setDetailProject(null)}
        onEdit={() => {}}
        onNotesChange={() => {}}
        readOnly
      />
    </div>
  );
}
