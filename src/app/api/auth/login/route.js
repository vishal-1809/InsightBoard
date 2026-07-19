// POST /api/auth/login
// Single admin login — credentials are validated against .env values.
// On success a JWT is issued (httpOnly cookie + returned in the body).

import { NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, safeEqual, apiKeyValid } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  // Login is now protected by the same x-api-key as the integration endpoints.
  // This prevents anonymous password guessing from the open internet.
  if (!apiKeyValid(req)) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing API key. Send your key in the `x-api-key` header." },
      { status: 401 }
    );
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  const expectedUser = (process.env.ADMIN_USERNAME || "").trim();
  const expectedPass = process.env.ADMIN_PASSWORD || "";

  // Soften brute-force attempts with a small constant delay.
  await new Promise((r) => setTimeout(r, 350));

  if (!expectedUser || !expectedPass || !safeEqual(username, expectedUser) || !safeEqual(password, expectedPass)) {
    return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
  }

  const token = await signSession(expectedUser);

  const res = NextResponse.json({
    ok: true,
    token, // also usable as `Authorization: Bearer <token>` from non-browser clients
    user: { username: expectedUser, role: "admin" },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
