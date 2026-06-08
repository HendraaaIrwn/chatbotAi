import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { validateProjectUpload } from "@/lib/files";
import {
  getOpenAIClient,
  getOpenAIErrorMessage,
  isOpenAIRequestError,
} from "@/lib/openai";
import { requireProjectPermission } from "@/lib/projects";

type FilesRouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: FilesRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "read");

    const files = await prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        bytes: true,
        openaiFileId: true,
        createdAt: true,
        uploadedBy: { select: { id: true, email: true, name: true } },
      },
    });

    return jsonOk({ files });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: FilesRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "upload_files");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("bad_request", "Upload a file using the `file` field.", 400);
    }

    const validationError = validateProjectUpload(file);

    if (validationError) {
      return jsonError("bad_request", validationError, 400);
    }

    const openai = getOpenAIClient();
    const uploaded = await openai.files.create({
      file,
      purpose: "user_data",
    });

    const projectFile = await prisma.projectFile.create({
      data: {
        projectId,
        uploadedById: user.id,
        openaiFileId: uploaded.id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes: file.size,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        bytes: true,
        openaiFileId: true,
        createdAt: true,
      },
    });

    return jsonOk({ file: projectFile }, { status: 201 });
  } catch (error) {
    if (isOpenAIRequestError(error)) {
      return jsonError("server_error", getOpenAIErrorMessage(error), 502);
    }

    return handleRouteError(error);
  }
}
