export type ProjectStatus = "Live" | "Maintenance" | "Deprecated";

export interface Project {
  id: string;
  name: string;
  description: string;
  liveUrl: string;
  repoUrl: string;
  techStack: string[];
  deploymentDate: string;
  status: ProjectStatus;
  thumbnail: string | null;
  notes: string;
  features: string[];
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectFormData = Omit<Project, "id" | "createdAt">;
