"use client";

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
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          {isRegister ? "Create account" : "Log in"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isRegister
            ? "Create a workspace for your chatbot projects."
            : "Use your email and password to continue."}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {isRegister ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Name</span>
            <input
              name="name"
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-amber-300"
              placeholder="Your name"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-200">Email</span>
          <input
            required
            type="email"
            name="email"
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-amber-300"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">Password</span>
          <input
            required
            type="password"
            name="password"
            minLength={8}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-amber-300"
            placeholder="At least 8 characters"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Please wait..." : isRegister ? "Register" : "Log in"}
      </button>

      <p className="mt-4 text-center text-sm text-slate-400">
        {isRegister ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-amber-300 hover:text-amber-200"
        >
          {isRegister ? "Log in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
