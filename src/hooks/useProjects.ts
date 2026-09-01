"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, ProjectFormData } from "@/types/project";

const STORAGE_KEY = "projectlocker-data";

function loadFromStorage(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function saveToStorage(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Storage quota exceeded or unavailable; silently ignore.
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Migrate old projects that don't have thumbnail field
    const loaded = loadFromStorage().map((p) => {
      const migrated = { ...p };
      if (migrated.thumbnail === undefined) (migrated as Project).thumbnail = null;
      if (!migrated.notes) (migrated as Project).notes = "";
      if (!migrated.features) (migrated as Project).features = [];
      return migrated as Project;
    });
    setProjects(loaded);
    setHydrated(true);
  }, []);

  const addProject = useCallback((data: ProjectFormData): Project => {
    const newProject: Project = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      saveToStorage(updated);
      return updated;
    });
    return newProject;
  }, []);

  const updateProject = useCallback(
    (id: string, data: ProjectFormData): void => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        );
        saveToStorage(updated);
        return updated;
      });
    },
    []
  );

  const deleteProject = useCallback((id: string): void => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const togglePin = useCallback((id: string): void => {
    setProjects((prev) => {
      const pinned = prev.filter((p) => p.pinned).length;
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        // Max 3 pinned; unpin freely
        if (!p.pinned && pinned >= 3) return p;
        return { ...p, pinned: !p.pinned };
      });
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateNotes = useCallback((id: string, notes: string): void => {
    setProjects((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, notes } : p);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const importProjects = useCallback((incoming: Project[]): void => {
    setProjects((prev) => {
      const merged = new Map<string, Project>(prev.map((p) => [p.id, p]));
      for (const p of incoming) { if (p.id) merged.set(p.id, { ...p, thumbnail: p.thumbnail ?? null }); }
      const updated = [...merged.values()];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  return { projects, hydrated, addProject, updateProject, updateNotes, togglePin, deleteProject, importProjects };
}
