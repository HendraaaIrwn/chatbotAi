"use client";

import {
  ProjectWorkspaceClient,
  type WorkspaceProject,
} from "@/components/project-workspace-client";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

type PageProps = { params: Promise<{ projectId: string }> };

type User = { id: string; email: string; name: string | null };

type ProjectResponse = {
  project: {
    id: string;
    name: string;
    description: string | null;
    role: string;
    prompt: { id: string; content: string; updated_at: string } | null;
    files: { id: string; filename: string; mime_type: string; bytes: number; openai_file_id: string; created_at: string }[];
    members: { id: string; role: string; user: { id: string; email: string; name: string | null } }[];
  };
};

export default function ProjectPage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: User | null }>("/me")
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return null;
        }

        setUser(data.user);
        return apiFetch<ProjectResponse>(`/projects/${projectId}`);
      })
      .then((data) => {
        if (!data) return;

        const p = data.project;
        setProject({
          id: p.id,
          name: p.name,
          description: p.description,
          role: p.role,
          members: p.members.map((m) => ({
            id: m.id,
            role: m.role,
            user: m.user,
          })),
          prompt: p.prompt ? { ...p.prompt, updatedAt: p.prompt.updated_at } : null,
          files: p.files.map((f) => ({
            id: f.id,
            filename: f.filename,
            mimeType: f.mime_type,
            bytes: f.bytes,
            openaiFileId: f.openai_file_id,
            createdAt: f.created_at,
          })),
        });
      })
      .catch((err: unknown) => {
        const apiErr = err as { code?: string };
        if (apiErr.code === "not_found") {
          router.push("/dashboard");
          return;
        }
        setError("Failed to load project");
      });
  }, [projectId, router]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020205] text-white/60">
        {error}
      </div>
    );
  }

  if (!user || !project) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020205] text-white/60">
        Loading...
      </div>
    );
  }

  return <ProjectWorkspaceClient initialProject={project} initialUser={user} />;
}
