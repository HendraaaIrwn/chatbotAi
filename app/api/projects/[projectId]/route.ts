import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/projects";

type ProjectRouteContext = {
  params: Promise<{ projectId: string }>;
};

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export async function GET(_request: Request, { params }: ProjectRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    const access = await requireProjectPermission(projectId, user.id, "read");

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        prompt: { select: { id: true, content: true, updatedAt: true } },
        files: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            bytes: true,
            openaiFileId: true,
            createdAt: true,
          },
        },
        members: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    return jsonOk({ project: { ...project, role: access.role } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: ProjectRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "edit");
    const body = updateProjectSchema.parse(await request.json());

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name,
        description: body.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonOk({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: ProjectRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "manage_members");
    await prisma.project.delete({ where: { id: projectId } });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
