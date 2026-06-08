"use client";

import { AssistantOrb } from "@/components/assistant-orb";
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

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error?.message || "Authentication failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_460px]">
      <section className="soft-panel relative hidden min-h-[640px] overflow-hidden rounded-[34px] p-8 lg:block">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_35rem)]" />
        <div className="relative z-10 flex h-full flex-col">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 text-white">
              <Lightning size={18} weight="fill" />
            </span>
            <span className="text-2xl font-semibold text-white">YellowAI</span>
          </Link>
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <AssistantOrb />
              <p className="mt-10 text-4xl font-semibold text-white/82">
                Private agents for every project.
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/46">
                Create secure workspaces, attach project files, and chat through
                the OpenAI Responses API.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-white/9 bg-white/[0.04] p-4">
              <ShieldCheck className="text-[#cbbcff]" size={20} />
              <p className="mt-3 text-sm text-white/70">HTTP-only JWT auth</p>
            </div>
            <div className="rounded-[20px] border border-white/9 bg-white/[0.04] p-4">
              <Sparkle className="text-[#cbbcff]" size={20} />
              <p className="mt-3 text-sm text-white/70">Prompted responses</p>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="soft-panel rounded-[34px] p-6 shadow-2xl shadow-black/30 sm:p-8"
      >
        <div>
          <p className="text-sm text-white/48">
            {isRegister ? "Start workspace" : "Welcome back"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white/88">
            {isRegister ? "Create account" : "Log in"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/46">
            {isRegister
              ? "Create a workspace for your chatbot projects."
              : "Use your email and password to continue."}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {isRegister ? (
            <label className="block">
              <span className="text-xs text-white/44">Name</span>
              <input
                name="name"
                className="field-surface mt-2 w-full rounded-[16px] px-3 py-3 text-sm"
                placeholder="Your name"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs text-white/44">Email</span>
            <input
              required
              type="email"
              name="email"
              className="field-surface mt-2 w-full rounded-[16px] px-3 py-3 text-sm"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/44">Password</span>
            <input
              required
              type="password"
              name="password"
              minLength={8}
              className="field-surface mt-2 w-full rounded-[16px] px-3 py-3 text-sm"
              placeholder="At least 8 characters"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-5 rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#b8a2ff] px-4 py-3 text-sm font-semibold text-[#070812] transition hover:bg-[#cbbcff] active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting ? "Please wait..." : isRegister ? "Register" : "Log in"}
          <ArrowUp size={17} weight="bold" />
        </button>

        <p className="mt-5 text-center text-sm text-white/46">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-[#cbbcff] hover:text-white"
          >
            {isRegister ? "Log in" : "Register"}
          </Link>
        </p>
      </form>
    </div>
  );
}
