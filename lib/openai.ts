import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY is not configured. Add it to .env.local before using chat or uploads.",
    );
  }

  cachedClient ??= new OpenAI({ apiKey });
  return cachedClient;
}

export function getOpenAIErrorMessage(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "OpenAI request failed.";
}

export function isOpenAIRequestError(error: unknown) {
  return error instanceof OpenAI.APIError;
}

export class OpenAIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIConfigError";
  }
}
