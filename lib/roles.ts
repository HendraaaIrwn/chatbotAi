export const projectRoles = ["owner", "editor", "viewer"] as const;

export type ProjectRole = (typeof projectRoles)[number];

export function isProjectRole(role: string): role is ProjectRole {
  return projectRoles.includes(role as ProjectRole);
}

export function canEditProject(role: string) {
  return role === "owner" || role === "editor";
}

export function canReadProject(role: string) {
  return isProjectRole(role);
}

export function canManageMembers(role: string) {
  return role === "owner";
}

export function canUploadFiles(role: string) {
  return role === "owner" || role === "editor";
}

export function roleHasPermission(
  role: string,
  permission: "read" | "edit" | "manage_members" | "upload_files",
) {
  if (permission === "read") {
    return canReadProject(role);
  }

  if (permission === "edit") {
    return canEditProject(role);
  }

  if (permission === "manage_members") {
    return canManageMembers(role);
  }

  return canUploadFiles(role);
}
