// ─────────────────────────────────────────────────────────────────────
// CommentDesk auth helpers
//  • Admin session  → JWT (jose, HS256), stored in an httpOnly cookie
//                     and also returned to the client for Bearer usage.
//  • Public POST    → protected by the API_SEC_KEY sent as `x-api-key`.
// ─────────────────────────────────────────────────────────────────────

import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const SESSION_COOKIE = "cd_session";
const ISSUER = "commentdesk";
const encoder = new TextEncoder();

function jwtKey() {
  const secret = process.env.JWT_SECRET || "commentdesk-dev-secret";
  return encoder.encode(secret);
}

/** Create a signed JWT for the single admin user (expires in 7 days). */
export async function signSession(username) {
  return new SignJWT({ sub: username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime("7d")
    .sign(jwtKey());
}

/** Resolve the logged-in admin from the httpOnly cookie or Bearer header. */
export async function getAuthUser(req) {
  let token = req.cookies?.get(SESSION_COOKIE)?.value;
  if (!token) {
    const header = req.headers.get("authorization") || "";
    if (header.toLowerCase().startsWith("bearer ")) token = header.slice(7).trim();
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtKey(), { issuer: ISSUER });
    if (!payload?.sub) return null;
    return { username: payload.sub, role: payload.role || "admin" };
  } catch {
    return null;
  }
}

export function unauthorized(message = "Authentication required. Please log in.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

/**
 * Guard for protected routes (GET / DELETE).
 * Returns { user, error } — when `error` is set you must return it.
 */
export async function requireAuth(req) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, error: unauthorized() };
  return { user, error: null };
}

/** Constant-time check of the API key sent by your other websites. */
export function apiKeyValid(req) {
  const provided = (req.headers.get("x-api-key") || "").trim();
  const expected = (process.env.API_SEC_KEY || "").trim();
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Constant-time string comparison (used for admin credentials). */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
