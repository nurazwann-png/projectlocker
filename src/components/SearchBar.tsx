"use client";

import React, { type RefObject } from "react";
import type { ProjectStatus } from "@/types/project";

export type SortOption = "newest" | "oldest" | "az" | "status";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: ProjectStatus | "";
  onStatusChange: (s: ProjectStatus | "") => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  inputRef?: RefObject<HTMLInputElement>;
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "Live", label: "Live" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Deprecated", label: "Deprecated" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "A → Z" },
  { value: "status", label: "By status" },
];

const selectStyle = {
  background: "#ffffff",
  border: "1px solid rgba(124,58,237,0.15)",
  color: "#0d0b1e",
  borderRadius: "12px",
} as const;

export default function SearchBar({ query, onQueryChange, statusFilter, onStatusChange, sort, onSortChange, inputRef }: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "#9693b8" }}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, description or tech…"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(124,58,237,0.15)",
            color: "#0d0b1e",
            borderRadius: "12px",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          className="w-full py-2.5 pl-10 pr-10 text-sm outline-none"
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#9693b8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#5b5880"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9693b8"; }}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as ProjectStatus | "")}
        style={selectStyle}
        className="py-2.5 px-3 text-sm outline-none sm:w-44 transition"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        style={selectStyle}
        className="py-2.5 px-3 text-sm outline-none sm:w-40 transition"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
