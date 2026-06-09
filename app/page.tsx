"use client";

import { AssistantOrb } from "@/components/assistant-orb";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ArrowUp, Lightning, Robot, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import Link from "next/link";

const features = [
  {
    icon: Robot,
    title: "Project agents",
    text: "Keep prompts and conversations scoped to each project workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Role access",
    text: "Owner, editor, and viewer permissions stay isolated per project.",
  },
  {
    icon: Sparkle,
    title: "OpenAI-ready",
    text: "Attach uploaded files to Responses API calls with full context.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#020205] text-[#f4f2fa]">
      <div className="shell-noise" />

      {/* ── Header ── */}
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.07] bg-white/[0.05] text-accent transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:border-white/[0.14]">
            <Lightning size={18} weight="fill" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">
            YellowAI
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="glass-button rounded-full px-5 py-2.5 text-sm font-medium text-white/66"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="accent-btn group flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            Create account
            <span className="btn-icon-nest">
              <ArrowUp size={13} weight="bold" />
            </span>
          </Link>
        </div>
      </header>

      {/* ── Hero (left-aligned, asymmetric) ── */}
      <section className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 md:flex-row md:items-center md:pb-24 md:pt-16">
        {/* Left: text block */}
        <div className="relative z-10 flex-1 md:pr-8">
          <ScrollReveal>
            <span className="eyebrow border border-white/[0.06] bg-white/[0.03] text-white/48">
              Multi-User Chatbot Platform
            </span>
          </ScrollReveal>

          <ScrollReveal delay={1}>
            <h1 className="font-display mt-5 max-w-2xl text-5xl font-semibold leading-[1.06] tracking-tight text-white/84 sm:text-6xl sm:leading-[1.04] md:text-7xl md:leading-[1.02]">
              Build private project agents with files, prompts, and chat.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={2}>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/40 sm:text-lg">
              A minimal multi-user workspace for registration, projects,
              collaborator roles, OpenAI file uploads, and Responses API
              conversations.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={3}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="accent-btn group flex items-center gap-2.5 px-6 py-3.5 text-sm"
              >
                Create account
                <span className="btn-icon-nest">
                  <ArrowUp size={14} weight="bold" />
                </span>
              </Link>
              <Link
                href="/login"
                className="glass-button rounded-full px-6 py-3.5 text-sm font-medium text-white/70"
              >
                Open dashboard
              </Link>
            </div>
          </ScrollReveal>
        </div>

        {/* Right: orb (visual anchor) */}
        <div className="relative z-10 flex shrink-0 justify-center md:justify-end">
          <ScrollReveal delay={2}>
            <div className="hidden md:block">
              <AssistantOrb size="lg" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Features (Double-Bezel shell, asymmetric Bento inside) ── */}
      <section className="relative mx-auto max-w-[1440px] px-4 pb-8 sm:px-6">
        <div className="bezel-shell">
          <div className="bezel-shell-inner relative overflow-hidden p-5 sm:p-6">
            <div className="ambient-glow-top" />

            <div className="relative z-10 grid grid-cols-1 gap-3 md:grid-cols-3">
              {features.map((item, index) => {
                const Icon = item.icon;
                return (
                  <ScrollReveal
                    key={item.title}
                    delay={((index + 1)) as 1 | 2 | 3 | 4 | 5}
                  >
                    <div className="panel flex h-full flex-col rounded-2xl p-6 sm:p-7">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-accent">
                        <Icon size={20} weight="regular" />
                      </span>
                      <p className="mt-5 text-sm font-semibold text-white/80 tracking-tight">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/38">
                        {item.text}
                      </p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
