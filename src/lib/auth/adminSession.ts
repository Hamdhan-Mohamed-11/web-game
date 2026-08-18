import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h — covers a full event night

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: ADMIN_COOKIE_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(): Promise<{ token: string; maxAge: number }> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  return { token, maxAge: SESSION_TTL_SECONDS };
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
