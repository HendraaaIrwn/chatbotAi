"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
};

type DashboardProject = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  updatedAt: string;
};

type DashboardClientProps = {
  initialUser: DashboardUser;
  initialProjects: DashboardProject[];
};

export function DashboardClient({
  initialUser,
  initialProjects,
}: DashboardClientProps) {
  const router = useRouter();
  const [user] = useState<DashboardUser>(initialUser);
  const [projects] = useState<DashboardProject[]>(initialProjects);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsCreating(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") || ""),
        description: String(formData.get("description") || ""),
      }),
    });
    const data = await response.json();
    setIsCreating(false);

    if (!response.ok) {
      setError(data.error?.message || "Could not create project.");
      return;
    }

    router.push(`/projects/${data.project.id}`);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div>
            <p className="text-sm text-amber-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">Projects</h1>
            <p className="mt-2 text-sm text-slate-400">
              Signed in as {user.name || user.email}
            </p>
          </div>

          <form
            onSubmit={handleCreateProject}
            className="rounded-lg border border-slate-800 bg-slate-900 p-5"
          >
            <h2 className="text-base font-semibold">New project</h2>
            <label className="mt-4 block">
              <span className="text-sm text-slate-300">Name</span>
              <input
                required
                name="name"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300"
                placeholder="Support agent"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm text-slate-300">Description</span>
              <textarea
                name="description"
                rows={3}
                className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-amber-300"
                placeholder="What this agent is for"
              />
            </label>
            <button
              disabled={isCreating}
              className="mt-4 w-full rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create project"}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            Log out
          </button>
        </aside>

        <section>
          {error ? (
            <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3">
            {projects.length ? (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-5 transition hover:border-amber-300/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{project.name}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <span className="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium uppercase text-slate-300">
                      {project.role}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400">
                No projects yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
