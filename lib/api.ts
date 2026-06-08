import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { OpenAIConfigError } from "@/lib/openai";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "server_error";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError("unauthorized", "Please log in to continue.", 401);
  }

  if (error instanceof ForbiddenError) {
    return jsonError("forbidden", error.message, 403);
  }

  if (error instanceof NotFoundError) {
    return jsonError("not_found", error.message, 404);
  }

  if (error instanceof OpenAIConfigError) {
    return jsonError("server_error", error.message, 500);
  }

  if (error instanceof ZodError) {
    return jsonError("bad_request", "Invalid request body.", 400, error.flatten());
  }

  console.error(error);
  return jsonError("server_error", "Something went wrong.", 500);
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "The requested resource was not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── Client-side API client with Bearer token support ──

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw error.error || { message: "Request failed" };
  }

  return res.json();
}
