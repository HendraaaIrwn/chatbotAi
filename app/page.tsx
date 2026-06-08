"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import {
  ArrowUp,
  Lightning,
  Robot,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#05060d] text-[#f4f2fa]">
      <div className="shell-noise" />
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-[1500px] place-items-center px-4 py-5">
        <div className="soft-panel relative min-h-[calc(100dvh-2.5rem)] w-full overflow-hidden rounded-[34px] px-5 py-6 sm:px-9">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.13),transparent_38rem)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-96 bg-[radial-gradient(circle_at_100%_68%,rgba(203,188,255,0.18),transparent_24rem)]" />

          <header className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/10 text-white">
                <Lightning size={18} weight="fill" />
              </span>
              <span className="text-2xl font-semibold">YellowAI</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="glass-button rounded-full px-4 py-2 text-sm text-white/72"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#b8a2ff] px-4 py-2 text-sm font-semibold text-[#070812] transition hover:bg-[#cbbcff] active:scale-[0.99]"
              >
                Create account
              </Link>
            </div>
          </header>

          <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-12rem)] max-w-6xl place-items-center text-center">
            <div>
              <div className="mb-9">
                <AssistantOrb />
              </div>
              <p className="text-sm text-white/48">Chatbot Platform</p>
              <h1 className="mx-auto mt-5 max-w-5xl text-5xl font-semibold text-white/86 sm:text-7xl">
                Build private project agents with files, prompts, and chat.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/48">
                A minimal multi-user workspace for registration, projects,
                collaborator roles, OpenAI file uploads, and Responses API
                conversations.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-full bg-[#b8a2ff] px-5 py-3 text-sm font-semibold text-[#070812] transition hover:bg-[#cbbcff] active:scale-[0.99]"
                >
                  Create account
                  <ArrowUp size={17} weight="bold" />
                </Link>
                <Link
                  href="/login"
                  className="glass-button rounded-full px-5 py-3 text-sm font-medium text-white/76"
                >
                  Open dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Robot,
                title: "Project agents",
                text: "Keep prompts and conversations scoped to each project.",
              },
              {
                icon: ShieldCheck,
                title: "Role access",
                text: "Owner, editor, and viewer permissions stay isolated.",
              },
              {
                icon: Sparkle,
                title: "OpenAI-ready",
                text: "Attach uploaded files to selected Responses API calls.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/9 bg-black/18 p-5"
                >
                  <Icon className="text-[#cbbcff]" size={22} />
                  <p className="mt-5 text-sm font-medium text-white/78">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/42">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
