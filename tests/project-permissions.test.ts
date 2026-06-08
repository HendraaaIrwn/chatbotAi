import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/lib/roles";

describe("project permissions", () => {
  it("allows owners to do everything", () => {
    expect(roleHasPermission("owner", "read")).toBe(true);
    expect(roleHasPermission("owner", "edit")).toBe(true);
    expect(roleHasPermission("owner", "upload_files")).toBe(true);
    expect(roleHasPermission("owner", "manage_members")).toBe(true);
  });

  it("allows editors to edit and upload but not manage members", () => {
    expect(roleHasPermission("editor", "read")).toBe(true);
    expect(roleHasPermission("editor", "edit")).toBe(true);
    expect(roleHasPermission("editor", "upload_files")).toBe(true);
    expect(roleHasPermission("editor", "manage_members")).toBe(false);
  });

  it("allows viewers to read only", () => {
    expect(roleHasPermission("viewer", "read")).toBe(true);
    expect(roleHasPermission("viewer", "edit")).toBe(false);
    expect(roleHasPermission("viewer", "upload_files")).toBe(false);
    expect(roleHasPermission("viewer", "manage_members")).toBe(false);
  });

  it("denies unknown roles", () => {
    expect(roleHasPermission("guest", "read")).toBe(false);
    expect(roleHasPermission("guest", "edit")).toBe(false);
  });
});
