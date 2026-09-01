"use client";

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import type { Project, ProjectFormData, ProjectStatus } from "@/types/project";

const EMPTY_FORM: ProjectFormData = {
  name: "",
  description: "",
  liveUrl: "",
  repoUrl: "",
  techStack: [],
  deploymentDate: "",
  status: "Live",
  thumbnail: null,
  notes: "",
  features: [],
};

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
}

type FormErrors = Partial<Record<keyof ProjectFormData, string>>;

function validate(data: ProjectFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Project name is required.";
  if (!data.description.trim()) errors.description = "Description is required.";
  if (!data.deploymentDate) errors.deploymentDate = "Deployment date is required.";
  if (data.techStack.length === 0) errors.techStack = "Add at least one technology.";
  return errors;
}

export default function ProjectModal({ isOpen, project, onClose, onSave }: ProjectModalProps) {
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(project);

  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setThumbnailUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "cover");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      set("thumbnail", url as string);
    } catch {
      // fall back to base64 so the user at least sees something
      const reader = new FileReader();
      reader.onload = () => set("thumbnail", reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setThumbnailUploading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt: _ca, ...rest } = project;
        setForm(rest);
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setTagInput("");
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function set<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTag(); }
    else if (e.key === "Backspace" && tagInput === "" && form.techStack.length > 0) {
      removeTag(form.techStack[form.techStack.length - 1]);
    }
  }

  function commitTag() {
    const tag = tagInput.trim().replace(/,$/, "");
    if (tag && !form.techStack.includes(tag)) {
      set("techStack", [...form.techStack, tag]);
      setErrors((prev) => ({ ...prev, techStack: undefined }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) { set("techStack", form.techStack.filter((t) => t !== tag)); }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const pendingTags = tagInput
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter((t) => t && !form.techStack.includes(t));
    const finalTechStack = [...form.techStack, ...pendingTags];
    onSave({ ...form, techStack: finalTechStack });
  }

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: "10px",
    color: "#0d0b1e",
    fontSize: "14px",
    padding: "10px 14px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const errStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: "rgba(220,38,38,0.5)",
  };

  function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (!e.target.style.borderColor.includes("220")) {
      e.target.style.borderColor = "rgba(124,58,237,0.5)";
      e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
    }
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, hasErr: boolean) {
    e.target.style.borderColor = hasErr ? "rgba(220,38,38,0.5)" : "rgba(124,58,237,0.2)";
    e.target.style.boxShadow = "none";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,11,30,0.5)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-lg flex flex-col max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: "20px",
          boxShadow: "0 8px 60px rgba(124,58,237,0.15), 0 2px 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="rounded-t-[20px] px-6 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04), rgba(14,165,233,0.04))", borderBottom: "1px solid rgba(124,58,237,0.1)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "#0d0b1e", fontFamily: "'Syne', system-ui, sans-serif" }}>
              {isEditing ? "Edit Project" : "New Project"}
            </h2>
            <p style={{ color: "#9693b8", fontSize: "12px", marginTop: "2px" }}>
              {isEditing ? "Update project details" : "Add a project to your portfolio"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 transition-colors"
            style={{ color: "#9693b8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#0d0b1e"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "65vh", scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.2) transparent" }}>
          <div className="space-y-4">

            {/* Name */}
            <GlassField label="Project Name" required error={errors.name}>
              <input
                ref={firstInputRef}
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="My Awesome Project"
                style={errors.name ? errStyle : inputStyle}
                onFocus={focusIn}
                onBlur={(e) => focusOut(e, !!errors.name)}
              />
            </GlassField>

            {/* Description */}
            <GlassField label="Description" required error={errors.description}>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A short description of what this project does…"
                rows={3}
                style={{ ...(errors.description ? errStyle : inputStyle), resize: "none" }}
                onFocus={focusIn}
                onBlur={(e) => focusOut(e, !!errors.description)}
              />
            </GlassField>

            {/* Status + Date */}
            <div className="grid grid-cols-2 gap-4">
              <GlassField label="Status" required>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as ProjectStatus)}
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, false)}
                >
                  <option value="Live">Live</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Deprecated">Deprecated</option>
                </select>
              </GlassField>

              <GlassField label="Deployment Date" required error={errors.deploymentDate}>
                <input
                  type="date"
                  value={form.deploymentDate}
                  onChange={(e) => set("deploymentDate", e.target.value)}
                  style={errors.deploymentDate ? errStyle : inputStyle}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, !!errors.deploymentDate)}
                />
              </GlassField>
            </div>

            {/* Tech Stack */}
            <GlassField label="Tech Stack" required error={errors.techStack}>
              <div
                className="flex min-h-[2.5rem] flex-wrap gap-1.5 px-3 py-2 cursor-text"
                style={{
                  background: "#ffffff",
                  border: `1px solid ${errors.techStack ? "rgba(220,38,38,0.5)" : "rgba(124,58,237,0.2)"}`,
                  borderRadius: "10px",
                  transition: "border-color 0.2s",
                }}
              >
                {form.techStack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: "rgba(124,58,237,0.08)", color: "#6d28d9", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                      aria-label={`Remove ${tag}`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={form.techStack.length === 0 ? "React, TypeScript… (Enter to add)" : ""}
                  className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "#0d0b1e" }}
                />
              </div>
            </GlassField>

            {/* Thumbnail */}
            <GlassField label="Preview Image">
              <div className="flex items-center gap-3">
                <div
                  className="shrink-0 w-20 h-14 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)" }}
                >
                  {form.thumbnail ? (
                    <img src={form.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: "#c4bfe0" }}>
                      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-.48-.48a.75.75 0 0 0-1.06 0L6.75 11.56l-4.25-4.5v4Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={thumbnailUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)", opacity: thumbnailUploading ? 0.6 : 1 }}
                    onMouseEnter={(e) => { if (!thumbnailUploading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.15)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.08)"; }}
                  >
                    {thumbnailUploading ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                      </svg>
                    )}
                    {thumbnailUploading ? "Uploading…" : form.thumbnail ? "Change Image" : "Upload Screenshot"}
                  </button>
                  {form.thumbnail && (
                    <button
                      type="button"
                      onClick={() => set("thumbnail", null)}
                      className="text-xs text-left transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
              </div>
            </GlassField>

            {/* Live URL */}
            <GlassField label="Live URL">
              <input
                type="url"
                value={form.liveUrl}
                onChange={(e) => set("liveUrl", e.target.value)}
                placeholder="https://myproject.com"
                style={inputStyle}
                onFocus={focusIn}
                onBlur={(e) => focusOut(e, false)}
              />
            </GlassField>

            {/* Repo URL */}
            <GlassField label="Repository URL">
              <input
                type="url"
                value={form.repoUrl}
                onChange={(e) => set("repoUrl", e.target.value)}
                placeholder="https://github.com/username/repo"
                style={inputStyle}
                onFocus={focusIn}
                onBlur={(e) => focusOut(e, false)}
              />
            </GlassField>

            {/* Key Features */}
            <GlassField label="Key Features">
              <div className="space-y-1.5">
                {form.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f}
                      onChange={(e) => {
                        const updated = [...form.features];
                        updated[i] = e.target.value;
                        set("features", updated);
                      }}
                      placeholder={`Feature ${i + 1}`}
                      style={{ ...inputStyle, padding: "8px 12px" }}
                      onFocus={focusIn}
                      onBlur={(e) => focusOut(e, false)}
                    />
                    <button
                      type="button"
                      onClick={() => set("features", form.features.filter((_, j) => j !== i))}
                      className="flex-shrink-0 transition-colors"
                      style={{ color: "#9693b8" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                ))}
                {form.features.length < 8 && (
                  <button
                    type="button"
                    onClick={() => set("features", [...form.features, ""])}
                    className="inline-flex items-center gap-1.5 text-xs transition-colors mt-1"
                    style={{ color: "#7c3aed" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6d28d9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; }}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Add feature
                  </button>
                )}
              </div>
            </GlassField>

          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4 rounded-b-[20px]"
          style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}
        >
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-medium transition-colors"
            style={{ background: "rgba(124,58,237,0.05)", color: "#5b5880", border: "1px solid rgba(124,58,237,0.15)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.05)"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-gradient rounded-xl px-5 py-2 text-sm font-semibold text-white"
          >
            {isEditing ? "Save Changes" : "Add Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GlassField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9693b8" }}>
        {label}
        {required && <span style={{ color: "#7c3aed" }}>*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
