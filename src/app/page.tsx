"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import type { Project, ProjectFormData, ProjectStatus } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import ProjectCard from "@/components/ProjectCard";
import ProjectModal from "@/components/ProjectModal";
import ProjectDetailModal from "@/components/ProjectDetailModal";
import SearchBar, { type SortOption } from "@/components/SearchBar";
import ProfileHeader from "@/components/ProfileHeader";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import TagCloud from "@/components/TagCloud";
import TimelineView from "@/components/TimelineView";

export default function DashboardPage() {
  const { projects, hydrated, addProject, updateProject, updateNotes, togglePin, deleteProject, importProjects } = useProjects();
  const { profile, hydrated: profileHydrated, setBio, setCover, setCoverPosition, setAvatar, setLinks, setSkills } = useProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">("grid");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [undoToast, setUndoToast] = useState<{ project: Project; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Milestone toast on project count change
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevCountRef.current;
    const curr = projects.length;
    prevCountRef.current = curr;
    if (prev === 0 || curr <= prev) return;
    const MILESTONES: Record<number, string> = {
      1: "🚀 First project added!",
      5: "🔥 5 projects — you're on a roll!",
      10: "💎 10 projects — impressive portfolio!",
      25: "🌟 25 projects — legendary!",
      50: "🏆 50 projects — absolute legend!",
    };
    if (MILESTONES[curr]) {
      setMilestoneToast(MILESTONES[curr]);
      const t = setTimeout(() => setMilestoneToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [projects.length, hydrated]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (e.key === "/" && !inInput) { e.preventDefault(); searchInputRef.current?.focus(); return; }
      if (inInput) return;
      if (e.key === "n" || e.key === "N") { openAddModal(); return; }
      if (e.key === "g" || e.key === "G") { setViewMode("grid"); return; }
      if (e.key === "l" || e.key === "L") { setViewMode("list"); return; }
      if (e.key === "t" || e.key === "T") { setViewMode("timeline"); return; }
      if (e.key === "?") { setShowShortcuts((v) => !v); return; }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoToast((prev) => { if (prev) clearTimeout(prev.timeoutId); return null; });
  }, []);

  // Clean up undo timeout on unmount
  useEffect(() => () => { if (undoToast) clearTimeout(undoToast.timeoutId); }, [undoToast]);

  const displayKey = `${query}|${statusFilter}|${tagFilter}|${sort}|${viewMode}`;

  const displayed = useMemo(() => {
    let list = projects;
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (tagFilter) list = list.filter((p) => p.techStack.includes(tagFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      // Pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return b.createdAt.localeCompare(a.createdAt); // newest
    });
    return list;
  }, [projects, query, statusFilter, tagFilter, sort]);

  function toggleSelected(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function bulkDelete() {
    selected.forEach((id) => deleteProject(id));
    setSelected(new Set());
    setBulkMode(false);
  }

  function openAddModal() { setEditingProject(null); setModalOpen(true); }
  function openEditModal(project: Project) { setEditingProject(project); setModalOpen(true); }
  function duplicateProject(project: Project) {
    const { id: _id, createdAt: _c, name, ...rest } = project;
    addProject({ ...rest, name: `${name} (copy)` });
  }

  function handleSave(data: ProjectFormData) {
    if (editingProject) updateProject(editingProject.id, data);
    else addProject(data);
    setModalOpen(false);
    setEditingProject(null);
  }

  function confirmDelete() {
    if (!deleteConfirmId) return;
    const project = projects.find((p) => p.id === deleteConfirmId);
    if (!project) { setDeleteConfirmId(null); return; }
    deleteProject(deleteConfirmId);
    setDeleteConfirmId(null);
    // Cancel any previous undo toast
    if (undoToast) clearTimeout(undoToast.timeoutId);
    const timeoutId = setTimeout(() => setUndoToast(null), 5000);
    setUndoToast({ project, timeoutId });
  }

  const projectToDelete = projects.find((p) => p.id === deleteConfirmId);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const importInputRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data)) { alert("Invalid file: expected a JSON array."); return; }
        importProjects(data as Project[]);
      } catch { alert("Failed to parse JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen" style={{
      backgroundImage: "url('/bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundAttachment: "fixed",
      backgroundColor: "#eeeaff",
    }}>

      {/* Auth button */}
      <div className="fixed top-4 right-4 z-50" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>
        <UserButton />
      </div>

      {/* Profile Header */}
      {profileHydrated && (
        <ProfileHeader
          profile={profile}
          projects={projects}
          onBioChange={setBio}
          onCoverChange={setCover}
          onCoverPositionChange={setCoverPosition}
          onAvatarChange={setAvatar}
          onLinksChange={setLinks}
          onSkillsChange={setSkills}
        />
      )}

      {/* Activity heatmap */}
      {hydrated && projects.length > 0 && (
        <div className="mb-6">
          <ActivityHeatmap projects={projects} />
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">

        {/* Section header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold" style={{ color: "#ffffff", fontFamily: "'Syne', system-ui, sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>Projects</h2>
            {hydrated && projects.length > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-sm font-semibold"
                style={{ background: "rgba(167,139,250,0.25)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.4)" }}
              >
                {projects.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            {/* Bulk select */}
            {hydrated && projects.length > 0 && (
              <button
                onClick={() => { setBulkMode((v) => !v); setSelected(new Set()); }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                style={bulkMode
                  ? { background: "rgba(167,139,250,0.3)", color: "#e0d9ff", border: "1px solid rgba(167,139,250,0.5)" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(200,190,255,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                {bulkMode ? "Cancel" : "Select"}
              </button>
            )}

            {/* Export / Import */}
            {hydrated && projects.length > 0 && (
              <button
                onClick={exportJSON}
                title="Export projects as JSON"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(200,190,255,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,190,255,0.8)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V3.75A.75.75 0 0 1 10 3ZM3.5 14.75a.75.75 0 0 0 0 1.5h13a.75.75 0 0 0 0-1.5h-13Z" clipRule="evenodd" />
                </svg>
                Export
              </button>
            )}
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              onClick={() => importInputRef.current?.click()}
              title="Import projects from JSON"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: "rgba(124,58,237,0.05)", color: "#5b5880", border: "1px solid rgba(124,58,237,0.15)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.15)"; }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V9.06l-2.22 2.22a.75.75 0 1 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 1 1-1.06 1.06L10.75 9.06v7.19A.75.75 0 0 1 10 17ZM3.5 5.25a.75.75 0 0 0 0-1.5h13a.75.75 0 0 0 0 1.5h-13Z" clipRule="evenodd" />
              </svg>
              Import
            </button>
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}>
              {(["grid","list","timeline"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                  className="p-2 transition-colors"
                  style={{ background: viewMode === mode ? "rgba(167,139,250,0.3)" : "transparent", color: viewMode === mode ? "#e0d9ff" : "rgba(200,190,255,0.5)" }}
                >
                  {mode === "grid" && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5ZM5 11a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5ZM11 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5ZM11 13a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z" /></svg>
                  )}
                  {mode === "list" && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
                  )}
                  {mode === "timeline" && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 10a.75.75 0 0 1 .75-.75h12.59l-2.1-1.95a.75.75 0 1 1 1.02-1.1l3.5 3.25a.75.75 0 0 1 0 1.1l-3.5 3.25a.75.75 0 1 1-1.02-1.1l2.1-1.95H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" /></svg>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
              className="rounded-xl p-2 text-xs font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(200,190,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", lineHeight: 1 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(200,190,255,0.6)"; }}
            >
              ?
            </button>
            <button
              onClick={openAddModal}
              className="btn-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Search bar */}
        {hydrated && projects.length > 0 && (
          <div className="mb-6">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              sort={sort}
              onSortChange={setSort}
              inputRef={searchInputRef}
            />
          </div>
        )}

        {/* Tag cloud */}
        {hydrated && projects.length > 0 && (
          <TagCloud projects={projects} activeTag={tagFilter} onTagClick={setTagFilter} />
        )}

        {/* Active filter chips */}
        {(tagFilter || statusFilter || query) && (
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium" style={{ color: "rgba(200,190,255,0.7)" }}>Filters:</span>
            {tagFilter && (
              <button
                onClick={() => setTagFilter("")}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{ background: "rgba(124,58,237,0.08)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.25)" }}
              >
                Tag: {tagFilter}
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            )}
            {statusFilter && (
              <button
                onClick={() => setStatusFilter("")}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{ background: "rgba(5,150,105,0.08)", color: "#065f46", border: "1px solid rgba(5,150,105,0.25)" }}
              >
                Status: {statusFilter}
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            )}
            {query && (
              <button
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{ background: "rgba(14,165,233,0.08)", color: "#0369a1", border: "1px solid rgba(14,165,233,0.25)" }}
              >
                Search: &ldquo;{query}&rdquo;
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            )}
            <button
              onClick={() => { setQuery(""); setStatusFilter(""); setTagFilter(""); }}
              className="text-xs transition-colors"
              style={{ color: "#9693b8" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Content area */}
        {!hydrated ? (
          // Skeleton cards
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl" style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.1)", boxShadow: "0 2px 8px rgba(124,58,237,0.05)" }}>
                <div className="shimmer" style={{ height: 180 }} />
                <div className="p-6 space-y-3">
                  <div className="shimmer rounded-lg" style={{ height: 20, width: "60%" }} />
                  <div className="shimmer rounded-lg" style={{ height: 14, width: "90%" }} />
                  <div className="shimmer rounded-lg" style={{ height: 14, width: "75%" }} />
                  <div className="flex gap-2 pt-1">
                    <div className="shimmer rounded-full" style={{ height: 24, width: 64 }} />
                    <div className="shimmer rounded-full" style={{ height: 24, width: 80 }} />
                    <div className="shimmer rounded-full" style={{ height: 24, width: 56 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          // Empty state
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div
              className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <svg className="h-12 w-12" style={{ color: "#7c3aed" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v.243a2.25 2.25 0 0 1-2.182 2.25H4.432A2.25 2.25 0 0 1 2.25 14.493V14.25" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>No projects yet</h3>
            <p className="mb-8 max-w-sm text-sm" style={{ color: "#5b5880" }}>
              Start building your portfolio. Add your first project to showcase everything you&apos;ve shipped.
            </p>
            <button
              onClick={openAddModal}
              className="btn-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add your first project
            </button>
          </div>
        ) : displayed.length === 0 ? (
          // No results
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <svg className="mb-3 h-10 w-10" style={{ color: "#c4bfe0" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803 7.5 7.5 0 0 1 15.803 15.803Z" />
            </svg>
            <p style={{ color: "#5b5880" }} className="text-sm">No projects match your search.</p>
            <button
              onClick={() => { setQuery(""); setStatusFilter(""); setTagFilter(""); }}
              className="mt-3 text-sm font-medium"
              style={{ color: "#7c3aed" }}
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView
            projects={displayed}
            onCardClick={setDetailProject}
            onEdit={openEditModal}
          />
        ) : viewMode === "grid" ? (
          // Grid view
          <div key={displayKey} className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {displayed.map((project, i) => (
              <div key={project.id} className="relative">
                {bulkMode && (
                  <button
                    onClick={() => toggleSelected(project.id)}
                    className="absolute left-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full transition-all"
                    style={selected.has(project.id)
                      ? { background: "#7c3aed", boxShadow: "0 2px 10px rgba(124,58,237,0.5)" }
                      : { background: "rgba(255,255,255,0.8)", border: "2px solid rgba(124,58,237,0.35)" }
                    }
                  >
                    {selected.has(project.id) && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="#ffffff">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
                <div style={bulkMode && selected.has(project.id) ? { outline: "2px solid #7c3aed", borderRadius: "1rem", outlineOffset: "2px" } : {}}>
                  <ProjectCard
                    project={project}
                    onEdit={openEditModal}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    onTagClick={setTagFilter}
                    activeTagFilter={tagFilter}
                    onDuplicate={duplicateProject}
                    onCardClick={bulkMode ? (p) => toggleSelected(p.id) : setDetailProject}
                    onPin={togglePin}
                    onThumbnailChange={(id, url) => {
                      const p = projects.find((x) => x.id === id);
                      if (p) updateProject(id, { ...p, thumbnail: url, name: p.name });
                    }}
                    index={i}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List view
          <div key={displayKey} className="flex flex-col gap-2">
            {displayed.map((project, i) => {
              const STATUS_COLOR: Record<string, string> = { Live: "#10b981", Maintenance: "#f59e0b", Deprecated: "#ef4444" };
              const dot = STATUS_COLOR[project.status] ?? "#64748b";
              return (
                <div
                  key={project.id}
                  className="card-enter flex items-center gap-4 rounded-xl px-4 py-3 transition-colors"
                  style={{ animationDelay: `${i * 50}ms`, background: "#ffffff", border: "1px solid rgba(124,58,237,0.1)", boxShadow: "0 1px 6px rgba(124,58,237,0.04)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.3)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.1)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 6px rgba(124,58,237,0.04)"; }}
                >
                  {/* Bulk checkbox */}
                  {bulkMode && (
                    <button
                      onClick={() => toggleSelected(project.id)}
                      className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full transition-all"
                      style={selected.has(project.id)
                        ? { background: "#7c3aed", boxShadow: "0 2px 8px rgba(124,58,237,0.4)" }
                        : { background: "transparent", border: "2px solid rgba(124,58,237,0.3)" }
                      }
                    >
                      {selected.has(project.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="#ffffff"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                      )}
                    </button>
                  )}
                  {/* Thumbnail / color swatch */}
                  <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: project.thumbnail ? undefined : "linear-gradient(135deg, #7c3aed, #db2777)" }}>
                    {project.thumbnail && <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />}
                  </div>
                  {/* Name + stack */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>{project.name}</p>
                    <p className="truncate text-xs" style={{ color: "#9693b8" }}>
                      {project.techStack.slice(0, 4).join(" · ")}
                      {project.techStack.length > 4 ? " · …" : ""}
                    </p>
                  </div>
                  {/* Status dot + label */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                    <span className="text-xs" style={{ color: dot }}>{project.status}</span>
                  </div>
                  {/* Date */}
                  <span className="hidden md:block text-xs flex-shrink-0" style={{ color: "#9693b8" }}>
                    {project.deploymentDate}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePin(project.id)}
                      className="rounded-lg p-1.5 transition-colors"
                      title={project.pinned ? "Unpin" : "Pin (max 3)"}
                      style={project.pinned ? { color: "#7c3aed", background: "rgba(124,58,237,0.1)" } : { color: "#9693b8" }}
                      onMouseEnter={(e) => { if (!project.pinned) { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; } }}
                      onMouseLeave={(e) => { if (!project.pinned) { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.447 1.053a.75.75 0 0 0-1.394.22L8.08 5H4.75A2.25 2.25 0 0 0 2.5 7.25v.5c0 .414.336.75.75.75h4.5v5.585L5.26 15.98a.75.75 0 1 0 1.06 1.06L8.5 14.86V15a.75.75 0 0 0 1.5 0v-.14l2.18 2.18a.75.75 0 0 0 1.06-1.06l-2.49-2.495V8.5h4.5a.75.75 0 0 0 .75-.75v-.5A2.25 2.25 0 0 0 13.75 5H10.42l-.973-3.947Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(project)}
                      className="rounded-lg p-1.5 transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(project.id)}
                      className="rounded-lg p-1.5 transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.08)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={detailProject}
        onClose={() => setDetailProject(null)}
        onEdit={(p) => { setDetailProject(null); openEditModal(p); }}
        onNotesChange={updateNotes}
      />

      {/* Add/Edit Modal */}
      <ProjectModal
        isOpen={modalOpen}
        project={editingProject}
        onClose={() => { setModalOpen(false); setEditingProject(null); }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(14,11,30,0.5)", backdropFilter: "blur(12px)" }}
            onClick={() => setDeleteConfirmId(null)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#ffffff", border: "1px solid rgba(220,38,38,0.2)", boxShadow: "0 8px 40px rgba(220,38,38,0.12), 0 2px 12px rgba(0,0,0,0.08)" }}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <svg className="h-6 w-6" style={{ color: "#dc2626" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>Delete project?</h3>
            <p className="mb-5 text-sm" style={{ color: "#5b5880" }}>
              <span className="font-semibold" style={{ color: "#0d0b1e" }}>&ldquo;{projectToDelete?.name}&rdquo;</span> will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: "rgba(124,58,237,0.05)", color: "#5b5880", border: "1px solid rgba(124,58,237,0.15)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.05)"; }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
                style={{ background: "#dc2626" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ef4444"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dc2626"; }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: "rgba(14,11,30,0.5)", backdropFilter: "blur(12px)" }} onClick={() => setShowShortcuts(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 8px 40px rgba(124,58,237,0.15), 0 2px 12px rgba(0,0,0,0.08)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ color: "#9693b8" }}><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg></button>
            </div>
            <div className="space-y-2">
              {([
                ["N", "New project"],
                ["/", "Focus search"],
                ["G", "Grid view"],
                ["L", "List view"],
                ["T", "Timeline view"],
                ["?", "Toggle this panel"],
                ["Esc", "Close modal"],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#5b5880" }}>{label}</span>
                  <kbd className="rounded-lg px-2.5 py-1 text-xs font-bold font-mono" style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {bulkMode && selected.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-2xl px-5 py-3"
          style={{
            transform: "translateX(-50%)",
            background: "#ffffff",
            border: "1px solid rgba(220,38,38,0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(220,38,38,0.12), 0 2px 12px rgba(0,0,0,0.08)",
            animation: "slideUp 0.25s ease",
          }}
        >
          <span className="text-sm font-semibold" style={{ color: "#0d0b1e" }}>{selected.size} selected</span>
          <button
            onClick={() => setSelected(new Set(displayed.map(p => p.id)))}
            className="text-xs font-medium transition-colors"
            style={{ color: "#7c3aed" }}
          >
            Select all
          </button>
          <button
            onClick={bulkDelete}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition-colors"
            style={{ background: "#dc2626", boxShadow: "0 0 12px rgba(220,38,38,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ef4444"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#dc2626"; }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5Z" clipRule="evenodd" />
            </svg>
            Delete {selected.size}
          </button>
        </div>
      )}

      {/* Milestone toast */}
      {milestoneToast && (
        <div
          className="fixed top-6 left-1/2 z-50 flex items-center gap-3 rounded-2xl px-6 py-3"
          style={{
            transform: "translateX(-50%)",
            background: "#ffffff",
            border: "1px solid rgba(124,58,237,0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.15), 0 2px 12px rgba(0,0,0,0.08)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <span className="text-sm font-bold" style={{ color: "#0d0b1e" }}>{milestoneToast}</span>
          <button onClick={() => setMilestoneToast(null)} style={{ color: "#9693b8" }}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </div>
      )}

      {/* Undo delete toast */}
      {undoToast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{
            transform: "translateX(-50%)",
            background: "#ffffff",
            border: "1px solid rgba(124,58,237,0.2)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.1), 0 2px 12px rgba(0,0,0,0.08)",
            animation: "slideUp 0.25s ease",
          }}
        >
          <svg className="h-4 w-4 flex-shrink-0" style={{ color: "#dc2626" }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm" style={{ color: "#5b5880" }}>
            <span className="font-semibold" style={{ color: "#0d0b1e" }}>&ldquo;{undoToast.project.name}&rdquo;</span> deleted
          </span>
          <button
            onClick={() => {
              importProjects([undoToast.project]);
              dismissUndo();
            }}
            className="ml-1 rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
            style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.18)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
          >
            Undo
          </button>
          <button onClick={dismissUndo} className="ml-1 transition-colors" style={{ color: "#9693b8" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
