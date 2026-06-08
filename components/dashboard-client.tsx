"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import {
  ArrowUp,
  FolderSimplePlus,
  Lightning,
  Robot,
  ShieldCheck,
  SignOut,
  Sparkle,
  Stack,
} from "@phosphor-icons/react";
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

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

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
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#05060d] text-[#f4f2fa]">
      <div className="shell-noise" />
      <div className="mx-auto grid min-h-[100dvh] max-w-[1500px] gap-6 px-4 py-5 lg:grid-cols-[292px_1fr]">
        <aside className="soft-panel flex flex-col rounded-[30px] p-5 lg:min-h-[calc(100dvh-2.5rem)]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 text-white">
              <Lightning size={18} weight="fill" />
            </span>
            <span className="text-2xl font-semibold">YellowAI</span>
          </div>

          <div className="mt-14 space-y-3">
            <div className="flex h-14 items-center gap-3 rounded-full border border-white/20 bg-white/12 px-5 text-sm text-white">
              <Stack size={20} weight="fill" />
              Projects
            </div>
            <div className="flex h-14 items-center gap-3 rounded-full px-5 text-sm text-white/48">
              <Sparkle size={20} />
              Intelligence
            </div>
            <div className="flex h-14 items-center gap-3 rounded-full px-5 text-sm text-white/48">
              <Robot size={20} />
              Agents
            </div>
          </div>

          <div className="mt-auto rounded-[20px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-[#cbbcff]">
                <ShieldCheck size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Signed in</p>
                <p className="mt-1 truncate text-xs text-white/42">
                  {user.name || user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="glass-button mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-white/72"
            >
              <SignOut size={17} />
              Log out
            </button>
          </div>
        </aside>

        <section className="soft-panel relative overflow-hidden rounded-[34px] px-5 py-6 sm:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_55%_0%,rgba(255,255,255,0.12),transparent_36rem)]" />
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_390px]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/48">Project console</p>
                  <h1 className="mt-3 max-w-3xl text-5xl font-semibold text-white/88">
                    Build agents with prompts, files, and secure access.
                  </h1>
                </div>
                <AssistantOrb size="md" />
              </div>

              {error ? (
                <p className="mt-6 rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </p>
              ) : null}

              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.length ? (
                  projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group min-h-56 rounded-[26px] border border-white/9 bg-black/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#cbbcff]/40 hover:bg-white/[0.055] active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/8 text-[#cbbcff] transition group-hover:scale-105">
                          <Robot size={22} />
                        </span>
                        <span className="rounded-full bg-white/7 px-3 py-1 text-xs uppercase text-white/46">
                          {project.role}
                        </span>
                      </div>
                      <h2 className="mt-8 text-xl font-semibold text-white/88">
                        {project.name}
                      </h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/46">
                        {project.description || "No description"}
                      </p>
                      <p className="mt-8 text-xs text-white/34">
                        Updated {displayDate(project.updatedAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full rounded-[26px] border border-dashed border-white/14 bg-black/18 px-5 py-14 text-center">
                    <AssistantOrb size="sm" />
                    <p className="mt-5 text-sm text-white/46">
                      No projects yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleCreateProject}
              className="soft-panel sticky top-6 rounded-[28px] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">New project</p>
                  <p className="mt-1 text-xs text-white/42">
                    Create an agent workspace
                  </p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/7 text-[#cbbcff]">
                  <FolderSimplePlus size={20} />
                </span>
              </div>

              <label className="mt-5 block">
                <span className="text-xs text-white/44">Name</span>
                <input
                  required
                  name="name"
                  className="field-surface mt-2 w-full rounded-[16px] px-3 py-2.5 text-sm"
                  placeholder="Support agent"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs text-white/44">Description</span>
                <textarea
                  name="description"
                  rows={5}
                  className="field-surface mt-2 w-full resize-none rounded-[16px] px-3 py-2.5 text-sm"
                  placeholder="What this agent is for"
                />
              </label>
              <button
                disabled={isCreating}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#b8a2ff] px-4 py-3 text-sm font-semibold text-[#070812] transition hover:bg-[#cbbcff] active:scale-[0.99] disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create project"}
                <ArrowUp size={17} weight="bold" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
