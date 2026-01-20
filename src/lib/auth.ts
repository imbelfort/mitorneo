import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthSession, AuthUser } from "@/types/auth";

const COOKIE_NAME = "mt_auth";
const TOKEN_TTL = "7d";
const TOKEN_ISSUER = "mitorneo";
const TOKEN_AUDIENCE = "mitorneo";

const getJwtSecret = () => {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET (o NEXTAUTH_SECRET) es requerido.");
  }
  return new TextEncoder().encode(secret);
};

const parseCookieHeader = (header: string) => {
  const entries = header.split(";").map((part) => part.trim());
  const output: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry) continue;
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    output[key] = decodeURIComponent(value);
  }
  return output;
};

export type { AuthSession, AuthUser };

export async function createAuthToken(user: AuthUser) {
  return new SignJWT({
    email: user.email,
    name: user.name ?? null,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }
    return {
      id: payload.sub,
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null,
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

export async function getAuthUserFromRequest(
  request: Request
): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const parsed = parseCookieHeader(cookieHeader);
  const token = parsed[COOKIE_NAME];
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

export async function getServerSession(): Promise<AuthSession | null> {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }
  return { user };
}

export async function requireApiAuth(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return user;
}

export const setAuthCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
};
