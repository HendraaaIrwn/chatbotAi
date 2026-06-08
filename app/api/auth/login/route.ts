import { cookies } from "next/headers";
import { z } from "zod";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError("unauthorized", "Invalid email or password.", 401);
    }

    const token = await createSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, sessionCookieOptions);

    return jsonOk({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
