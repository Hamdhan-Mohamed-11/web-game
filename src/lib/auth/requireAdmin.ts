import "server-only";

import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "./adminSession";

/**
 * Checks the admin session cookie on a plain Request (route handlers under
 * /api are not covered by middleware.ts, which only matches page routes).
 * Returns a 401 response to short-circuit with, or null if the caller is an
 * authenticated admin.
 */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));
  const token = match?.slice(ADMIN_COOKIE_NAME.length + 1);

  const isAuthed = await verifyAdminSessionToken(token);
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
