import { describe, expect, it } from "vitest";
import {
  fileIdListSchema,
  maxUploadBytes,
  validateProjectUpload,
} from "@/lib/files";

function makeFile(name: string, type: string, size = 12) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("file and chat validation", () => {
  it("accepts supported document uploads", () => {
    const file = makeFile("brief.pdf", "application/pdf");

    expect(validateProjectUpload(file)).toBeNull();
  });

  it("rejects unsupported file extensions", () => {
    const file = makeFile("image.png", "image/png");

    expect(validateProjectUpload(file)).toContain("Only PDF");
  });

  it("rejects oversized uploads", () => {
    const file = makeFile("large.txt", "text/plain", maxUploadBytes + 1);

    expect(validateProjectUpload(file)).toContain("10 MB");
  });

  it("limits selected files per chat request", () => {
    const ids = Array.from({ length: 11 }, (_, index) => `cm0${index}abcde`);

    expect(fileIdListSchema.safeParse(ids).success).toBe(false);
  });
});
