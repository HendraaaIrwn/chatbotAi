import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError, jsonOk, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fileIdListSchema } from "@/lib/files";
import {
  getOpenAIClient,
  getOpenAIErrorMessage,
  getOpenAIModel,
  isOpenAIRequestError,
} from "@/lib/openai";
import { requireProjectPermission } from "@/lib/projects";

type ChatRouteContext = {
  params: Promise<{ projectId: string }>;
};

type InputContent =
  | { type: "input_file"; file_id: string }
  | { type: "input_text"; text: string };

const chatSchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().trim().min(1).max(4000),
  fileIds: fileIdListSchema.default([]),
});

function buildConversationInput(
  history: Array<{ role: string; content: string }>,
  message: string,
  files: Array<{ openaiFileId: string }>,
) {
  const transcript = history
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
    .join("\n");
  const text = transcript
    ? `Conversation so far:\n${transcript}\n\nLatest user message:\n${message}`
    : message;
  const content: InputContent[] = files.map((file) => ({
    type: "input_file",
    file_id: file.openaiFileId,
  }));

  content.push({ type: "input_text", text });

  return [
    {
      role: "user" as const,
      content,
    },
  ];
}

export async function POST(request: Request, { params }: ChatRouteContext) {
  try {
    const user = await requireCurrentUser();
    const { projectId } = await params;
    await requireProjectPermission(projectId, user.id, "read");
    const body = chatSchema.parse(await request.json());
    const selectedFileIds = [...new Set(body.fileIds)];

    const [prompt, selectedFiles] = await Promise.all([
      prisma.prompt.findUnique({
        where: { projectId },
        select: { content: true },
      }),
      selectedFileIds.length
        ? prisma.projectFile.findMany({
            where: { projectId, id: { in: selectedFileIds } },
            select: { id: true, openaiFileId: true },
          })
        : Promise.resolve([]),
    ]);

    if (selectedFiles.length !== selectedFileIds.length) {
      return jsonError(
        "bad_request",
        "One or more selected files do not belong to this project.",
        400,
      );
    }

    const conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            projectId,
            userId: user.id,
          },
          select: { id: true, title: true },
        })
      : await prisma.conversation.create({
          data: {
            projectId,
            userId: user.id,
            title: body.message.slice(0, 80),
          },
          select: { id: true, title: true },
        });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    const history = (
      await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { role: true, content: true },
      })
    ).reverse();

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        role: "user",
        content: body.message,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      instructions: prompt?.content || "You are a helpful project assistant.",
      input: buildConversationInput(history, body.message, selectedFiles),
    });
    const assistantText =
      response.output_text?.trim() || "I could not generate a response.";

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText,
        responseId: response.id,
      },
      select: {
        id: true,
        role: true,
        content: true,
        responseId: true,
        createdAt: true,
      },
    });

    return jsonOk({
      conversation,
      messages: [userMessage, assistantMessage],
      responseId: response.id,
    });
  } catch (error) {
    if (isOpenAIRequestError(error)) {
      return jsonError("server_error", getOpenAIErrorMessage(error), 502);
    }

    return handleRouteError(error);
  }
}
