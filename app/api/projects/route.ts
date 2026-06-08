import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        role: true,
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return jsonOk({
      projects: memberships.map((membership) => ({
        ...membership.project,
        role: membership.role,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = createProjectSchema.parse(await request.json());

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
        prompt: {
          create: {
            content: "You are a helpful project assistant.",
          },
        },
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

    return jsonOk({ project: { ...project, role: "owner" } }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
