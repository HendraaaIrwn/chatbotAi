import { notFound, redirect } from "next/navigation";
import {
  ProjectWorkspaceClient,
  type WorkspaceProject,
} from "@/components/project-workspace-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectAccess } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { projectId } = await params;
  const access = await getProjectAccess(projectId, user.id);

  if (!access) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const workspaceProject: WorkspaceProject = {
    ...project,
    role: access.role,
  };

  return <ProjectWorkspaceClient initialProject={workspaceProject} />;
}
