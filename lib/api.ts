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
