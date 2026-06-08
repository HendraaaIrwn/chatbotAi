export const projectRoles = ["owner", "editor", "viewer"] as const;

export type ProjectRole = (typeof projectRoles)[number];

export function isProjectRole(role: string): role is ProjectRole {
  return projectRoles.includes(role as ProjectRole);
}

export function canEditProject(role: string) {
  return role === "owner" || role === "editor";
}

export function canManageMembers(role: string) {
  return role === "owner";
}

export function canUploadFiles(role: string) {
  return role === "owner" || role === "editor";
}
