import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api";
import { sessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);

  return jsonOk({ ok: true });
}
