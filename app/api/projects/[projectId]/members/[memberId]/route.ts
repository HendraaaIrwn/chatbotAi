import { z } from "zod";
import {
  ForbiddenError,
  handleRouteError,
  jsonOk,
  NotFoundError,
} from "@/lib/api";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/projects";

type MemberRouteContext = {
  params: Promise<{ projectId: string; memberId: string }>;
};

const updateMemberSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

async function getMutableMember(projectId: string, memberId: string) {
  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
    select: {
      id: true,
      role: true,
      userId: true,
      project: { select: { ownerId: true } },
    },
  });

  if (!member) {
    throw new NotFoundError("Project member not found.");
  }

  if (member.userId === member.project.ownerId || member.role === "owner") {
    throw new ForbiddenError("The project owner cannot be changed here.");
  }

  return member;
}

export async function PATCH(request: Request, { params }: MemberRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId, memberId } = await params;
    await requireProjectPermission(projectId, user.id, "manage_members");
    await getMutableMember(projectId, memberId);
    const body = updateMemberSchema.parse(await request.json());

    const member = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: body.role },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return jsonOk({ member });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: MemberRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId, memberId } = await params;
    await requireProjectPermission(projectId, user.id, "manage_members");
    await getMutableMember(projectId, memberId);
    await prisma.projectMember.delete({ where: { id: memberId } });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
