import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  createSessionToken,
  hashPassword,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    const token = await createSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, sessionCookieOptions);

    return jsonOk({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("conflict", "A user with this email already exists.", 409);
    }

    return handleRouteError(error);
  }
}
