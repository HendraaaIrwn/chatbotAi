import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireProjectPermission } from "@/lib/projects";

type PromptRouteContext = {
  params: Promise<{ projectId: string }>;
};

const promptSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

export async function GET(_request: Request, { params }: PromptRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "read");

    const prompt = await prisma.prompt.findUnique({
      where: { projectId },
      select: { id: true, content: true, updatedAt: true },
    });

    return jsonOk({ prompt });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: PromptRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "edit");
    const body = promptSchema.parse(await request.json());

    const prompt = await prisma.prompt.upsert({
      where: { projectId },
      create: {
        projectId,
        content: body.content,
      },
      update: {
        content: body.content,
      },
      select: { id: true, content: true, updatedAt: true },
    });

    return jsonOk({ prompt });
  } catch (error) {
    return handleRouteError(error);
  }
}
