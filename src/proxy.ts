import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth/adminSession";

// Next.js 16 renamed the middleware.ts convention to proxy.ts (export named
// `proxy`, not `middleware`) — see node_modules/next/dist/docs/.../proxy.md.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthed = await verifyAdminSessionToken(token);

  if (!isAuthed) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/qr", "/games/:game/admin", "/panel"],
};
