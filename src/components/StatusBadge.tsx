import type { ProjectStatus } from "@/types/project";

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: "sm" | "md";
}

const config: Record<ProjectStatus, { label: string; bg: string; text: string; border: string; dotClass: string; dot: string }> = {
  Live: {
    label: "Live",
    bg: "rgba(5,150,105,0.1)",
    text: "#065f46",
    border: "rgba(5,150,105,0.3)",
    dotClass: "status-glow-live",
    dot: "#059669",
  },
  Maintenance: {
    label: "In Maintenance",
    bg: "rgba(217,119,6,0.1)",
    text: "#92400e",
    border: "rgba(217,119,6,0.3)",
    dotClass: "status-glow-maintenance",
    dot: "#d97706",
  },
  Deprecated: {
    label: "Deprecated",
    bg: "rgba(220,38,38,0.1)",
    text: "#991b1b",
    border: "rgba(220,38,38,0.3)",
    dotClass: "status-glow-deprecated",
    dot: "#dc2626",
  },
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const c = config[status];
  const padding = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding}`}
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontFamily: "'Syne', system-ui, sans-serif",
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${c.dotClass}`}
        style={{ background: c.dot, display: "inline-block" }}
      />
      {c.label}
    </span>
  );
}
