import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/projects";

type MembersRouteContext = {
  params: Promise<{ projectId: string }>;
};

const memberSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["editor", "viewer"]),
});

export async function GET(_request: Request, { params }: MembersRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "read");

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return jsonOk({ members });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: MembersRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "manage_members");
    const body = memberSchema.parse(await request.json());
    const collaborator = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      select: { id: true },
    });

    if (!collaborator) {
      throw new NotFoundError("No registered user found for that email.");
    }

    if (collaborator.id === user.id) {
      return jsonError("bad_request", "You are already the project owner.", 400);
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: collaborator.id,
        role: body.role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return jsonOk({ member }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("conflict", "This user is already a project member.", 409);
    }

    return handleRouteError(error);
  }
}
