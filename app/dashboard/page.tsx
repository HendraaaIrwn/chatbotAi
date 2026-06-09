"use client";

import { DashboardClient } from "@/components/dashboard-client";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; email: string; name: string | null };
type Project = { id: string; name: string; description: string | null; role: string; updated_at: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: User | null }>("/me")
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        return apiFetch<{ projects: Project[] }>("/projects");
      })
      .then((data) => {
        if (data) setProjects(data.projects);
      })
      .catch(() => setError("Failed to load dashboard"));
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020205] text-white/60">
        {error}
      </div>
    );
  }

  if (!user || !projects) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#020205] text-white/60">
        Loading...
      </div>
    );
  }

  return (
    <DashboardClient
      initialUser={user}
      initialProjects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        role: p.role,
        updatedAt: p.updated_at,
      }))}
    />
  );
}
