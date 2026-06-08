"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import { ScrollReveal } from "@/components/scroll-reveal";
import { apiFetch, setAuthToken } from "@/lib/api";
import { ArrowUp, Lightning, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: isRegister ? String(formData.get("name") || "") : undefined,
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };

    try {
      const data = await apiFetch<{ token: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAuthToken(data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as { message?: string; error?: { message?: string } };
      setError(apiErr?.message || apiErr?.error?.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_440px]">
      {/* ── Branding Panel ── */}
      <div className="bezel-shell hidden lg:block">
        <div className="bezel-shell-inner relative flex min-h-[640px] flex-col overflow-hidden p-8">
          <div className="ambient-glow-top" />

          <div className="relative z-10 flex h-full flex-col">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.07] bg-white/[0.05] text-accent transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:border-white/[0.14]">
                <Lightning size={18} weight="fill" />
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight text-white">
                YellowAI
              </span>
            </Link>

            <div className="grid flex-1 place-items-center text-center">
              <div>
                <AssistantOrb />
                <p className="mt-10 text-4xl font-semibold text-white/78 tracking-tight">
                  Private agents for every project.
                </p>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/40">
                  Create secure workspaces, attach project files, and chat
                  through the OpenAI Responses API.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="panel rounded-2xl p-4">
                <ShieldCheck className="text-accent" size={19} weight="regular" />
                <p className="mt-3 text-sm text-white/60">HTTP-only JWT auth</p>
              </div>
              <div className="panel rounded-2xl p-4">
                <Sparkle className="text-accent" size={19} weight="regular" />
                <p className="mt-3 text-sm text-white/60">Prompted responses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel (Double-Bezel) ── */}
      <div className="bezel-shell">
        <div className="bezel-shell-inner p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            <ScrollReveal>
              <span className="eyebrow border border-white/[0.06] bg-white/[0.03] text-white/46">
                {isRegister ? "Start workspace" : "Welcome back"}
              </span>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h1 className="font-display mt-4 text-4xl font-semibold text-white/84 tracking-tight">
                {isRegister ? "Create account" : "Log in"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/40">
                {isRegister
                  ? "Create a workspace for your chatbot projects."
                  : "Use your email and password to continue."}
              </p>
            </ScrollReveal>

            <div className="mt-10 space-y-4">
              {isRegister ? (
                <ScrollReveal delay={2}>
                  <label className="block">
                    <span className="text-xs font-medium text-white/36">Name</span>
                    <input
                      name="name"
                      className="field-surface mt-2 w-full rounded-2xl px-4 py-3 text-sm"
                      placeholder="Your name"
                    />
                  </label>
                </ScrollReveal>
              ) : null}

              <ScrollReveal delay={isRegister ? 3 : 2}>
                <label className="block">
                  <span className="text-xs font-medium text-white/36">Email</span>
                  <input
                    required
                    type="email"
                    name="email"
                    className="field-surface mt-2 w-full rounded-2xl px-4 py-3 text-sm"
                    placeholder="you@example.com"
                  />
                </label>
              </ScrollReveal>

              <ScrollReveal delay={isRegister ? 4 : 3}>
                <label className="block">
                  <span className="text-xs font-medium text-white/36">Password</span>
                  <input
                    required
                    type="password"
                    name="password"
                    minLength={8}
                    className="field-surface mt-2 w-full rounded-2xl px-4 py-3 text-sm"
                    placeholder="At least 8 characters"
                  />
                </label>
              </ScrollReveal>
            </div>

            {error ? (
              <ScrollReveal delay={5}>
                <p className="mt-6 rounded-2xl border border-red-400/16 bg-red-500/5 px-4 py-3 text-sm text-red-100">
                  {error}
                </p>
              </ScrollReveal>
            ) : null}

            <ScrollReveal delay={isRegister ? 5 : 4}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="accent-btn group mt-8 flex w-full items-center justify-center gap-2.5 px-6 py-3.5 text-sm disabled:opacity-40 disabled:shadow-none"
              >
                {isSubmitting
                  ? "Please wait..."
                  : isRegister
                    ? "Register"
                    : "Log in"}
                <span className="btn-icon-nest">
                  <ArrowUp size={14} weight="bold" />
                </span>
              </button>
            </ScrollReveal>

            <ScrollReveal delay={isRegister ? 5 : 4}>
              <p className="mt-6 text-center text-sm text-white/38">
                {isRegister ? "Already have an account?" : "Need an account?"}{" "}
                <Link
                  href={isRegister ? "/login" : "/register"}
                  className="text-link font-medium"
                >
                  {isRegister ? "Log in" : "Register"}
                </Link>
              </p>
            </ScrollReveal>
          </form>
        </div>
      </div>
    </div>
  );
}
