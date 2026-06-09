"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  ArrowUp,
  FolderSimplePlus,
  Lightning,
  Robot,
  ShieldCheck,
  SignOut,
  Stack,
} from "@phosphor-icons/react";
import { apiFetch, clearAuthToken } from "@/lib/api";
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
    try {
      const data = await apiFetch<{ project: { id: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          description: String(formData.get("description") || ""),
        }),
      });
      setIsCreating(false);
      router.push(`/projects/${data.project.id}`);
    } catch (err: unknown) {
      setIsCreating(false);
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Could not create project.");
    }
  }

  async function handleLogout() {
    clearAuthToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#020205] text-[#f4f2fa]">
      <div className="shell-noise" />
      <div className="mx-auto grid min-h-[100dvh] max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[292px_1fr]">
        {/* ── Sidebar (.panel, not Double-Bezel) ── */}
        <aside className="panel flex flex-col rounded-[1.75rem] p-5 lg:min-h-[calc(100dvh-3rem)]">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.07] bg-white/[0.05] text-accent transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:border-white/[0.14]">
              <Lightning size={18} weight="fill" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">
              YellowAI
            </span>
          </Link>

          <nav className="mt-14">
            <div className="flex h-14 items-center gap-3 rounded-full border border-white/[0.14] bg-white/[0.06] px-5 text-sm font-medium text-white">
              <Stack size={20} weight="fill" />
              Projects
            </div>
          </nav>

          <div className="mt-auto">
            <div className="panel rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.05] text-accent">
                  <ShieldCheck size={17} weight="regular" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Signed in</p>
                  <p className="mt-0.5 truncate text-xs text-white/36">
                    {user.name || user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="glass-button mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm text-white/64"
              >
                <SignOut size={16} weight="regular" />
                Log out
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Panel (Double-Bezel shell) ── */}
        <div className="bezel-shell">
          <div className="bezel-shell-inner relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
            <div className="ambient-glow-top" />

            <div className="relative z-10 grid gap-10 xl:grid-cols-[1fr_400px]">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <ScrollReveal>
                      <span className="eyebrow border border-white/[0.06] bg-white/[0.03] text-white/46">
                        Project Console
                      </span>
                    </ScrollReveal>
                    <ScrollReveal delay={1}>
                      <h1 className="font-display mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-white/84">
                        Build agents with prompts, files, and secure access.
                      </h1>
                    </ScrollReveal>
                  </div>
                  <ScrollReveal delay={2}>
                    <AssistantOrb size="md" />
                  </ScrollReveal>
                </div>

                {error ? (
                  <p className="mt-6 rounded-2xl border border-red-400/16 bg-red-500/5 px-4 py-3 text-sm text-red-100">
                    {error}
                  </p>
                ) : null}

                {/* ── Asymmetric Bento Project Grid ── */}
                <div className="mt-10 grid grid-cols-12 gap-3">
                  {projects.length ? (
                    projects.map((project, index) => {
                      const spans = [
                        "md:col-span-7",
                        "md:col-span-5",
                        "md:col-span-5",
                        "md:col-span-7",
                        "md:col-span-5",
                        "md:col-span-7",
                      ];
                      const span = spans[index % spans.length];

                      return (
                        <ScrollReveal
                          key={project.id}
                          delay={((index % 3) + 1) as 1 | 2 | 3 | 4 | 5}
                          className={`col-span-12 ${span}`}
                        >
                          <Link
                            href={`/projects/${project.id}`}
                            className="panel group block h-full rounded-2xl p-5 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.05] active:scale-[0.985]"
                          >
                            <div className="flex min-h-52 flex-col">
                              <div className="flex items-start justify-between gap-4">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.05] text-accent transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                                  <Robot size={20} weight="regular" />
                                </span>
                                <span className="eyebrow border border-white/[0.06] bg-white/[0.03] text-white/38">
                                  {project.role}
                                </span>
                              </div>
                              <h2 className="font-display mt-8 text-xl font-semibold tracking-tight text-white/82">
                                {project.name}
                              </h2>
                              <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/38">
                                {project.description || "No description"}
                              </p>
                              <p className="mt-auto pt-6 text-xs text-white/28">
                                Updated {displayDate(project.updatedAt)}
                              </p>
                            </div>
                          </Link>
                        </ScrollReveal>
                      );
                    })
                  ) : (
                    <div className="col-span-full">
                      <div className="panel flex flex-col items-center rounded-2xl px-5 py-16 text-center">
                        <AssistantOrb size="sm" />
                        <p className="mt-5 text-sm text-white/40">
                          No projects yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Create Project Form ── */}
              <div className="xl:sticky xl:top-6 xl:self-start">
                <ScrollReveal delay={3}>
                  <div className="panel rounded-2xl p-5">
                    <form onSubmit={handleCreateProject}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white tracking-tight">
                            New project
                          </p>
                          <p className="mt-1 text-xs text-white/36">
                            Create an agent workspace
                          </p>
                        </div>
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-accent">
                          <FolderSimplePlus size={19} weight="regular" />
                        </span>
                      </div>

                      <label className="mt-6 block">
                        <span className="text-xs font-medium text-white/36">
                          Name
                        </span>
                        <input
                          required
                          name="name"
                          className="field-surface mt-2 w-full rounded-2xl px-4 py-2.5 text-sm"
                          placeholder="Support agent"
                        />
                      </label>
                      <label className="mt-4 block">
                        <span className="text-xs font-medium text-white/36">
                          Description
                        </span>
                        <textarea
                          name="description"
                          rows={5}
                          className="field-surface mt-2 w-full resize-none rounded-2xl px-4 py-2.5 text-sm"
                          placeholder="What this agent is for"
                        />
                      </label>
                      <button
                        disabled={isCreating}
                        className="accent-btn group mt-5 flex w-full items-center justify-center gap-2.5 px-6 py-3 text-sm disabled:opacity-40 disabled:shadow-none"
                      >
                        {isCreating ? "Creating..." : "Create project"}
                        <span className="btn-icon-nest">
                          <ArrowUp size={14} weight="bold" />
                        </span>
                      </button>
                    </form>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
