import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/api";
import { type ProjectRole, roleHasPermission } from "@/lib/roles";

export type ProjectPermission =
  | "read"
  | "edit"
  | "manage_members"
  | "upload_files";

export type ProjectAccess = {
  projectId: string;
  role: ProjectRole;
};

export async function getProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === userId) {
    return { projectId: project.id, role: "owner" };
  }

  const role = project.members[0]?.role;

  if (role === "owner" || role === "editor" || role === "viewer") {
    return { projectId: project.id, role };
  }

  return null;
}

export async function requireProjectPermission(
  projectId: string,
  userId: string,
  permission: ProjectPermission,
) {
  const projectExists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!projectExists) {
    throw new NotFoundError("Project not found.");
  }

  const access = await getProjectAccess(projectId, userId);

  if (!access || !roleHasPermission(access.role, permission)) {
    throw new ForbiddenError();
  }

  return access;
}
