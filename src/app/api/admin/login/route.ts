import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "@/lib/auth/adminSession";

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers so this branch doesn't
    // take a visibly different code path/timing for wrong-length input.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: "Admin passcode is not configured" }, { status: 500 });
  }

  let passcode: unknown;
  try {
    const body = await request.json();
    passcode = body?.passcode;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof passcode !== "string" || !safeEquals(passcode, expected)) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const { token, maxAge } = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}
