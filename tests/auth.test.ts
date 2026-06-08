import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct-horse-battery");

    expect(hash).not.toBe("correct-horse-battery");
    await expect(verifyPassword("correct-horse-battery", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("creates and verifies session tokens", async () => {
    const token = await createSessionToken("user_123");

    await expect(verifySessionToken(token)).resolves.toBe("user_123");
  });

  it("rejects invalid session tokens", async () => {
    await expect(verifySessionToken("not-a-token")).rejects.toThrow();
  });
});
