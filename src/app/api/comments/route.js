// ─────────────────────────────────────────────────────────────────────
//  GET  /api/comments          → list comments (JWT required)
//  POST /api/comments          → create comment from your other websites
//                                (protected by the x-api-key header)
//  OPTIONS                     → CORS pre-flight for cross-site POSTs
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { insertComment, listComments, deriveWebsiteName } from "@/lib/store";
import { requireAuth, apiKeyValid } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": (process.env.CORS_ORIGIN || "*").trim(),
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET — admin only (JWT via cookie or Authorization: Bearer)
export async function GET(req) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const website = searchParams.get("website");
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  let comments = await listComments({ websiteUrl: website });

  if (q) {
    comments = comments.filter((c) =>
      [c.name, c.email, c.message, c.websiteName, c.websiteUrl]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return NextResponse.json({ ok: true, count: comments.length, comments });
}

// POST — public, but secured with the API key.
// Body: { name, email, message (or comment), websiteUrl, websiteName? }
// The createdAt timestamp is always set by the server (current time).
export async function POST(req) {
  if (!apiKeyValid(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid or missing API key. Send your key in the `x-api-key` header.",
      },
      { status: 401, headers: corsHeaders() }
    );
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Expected a JSON request body." },
      { status: 400, headers: corsHeaders() }
    );
  }

  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? body.comment ?? "").trim().slice(0, 2000);
  const websiteUrl = String(body.websiteUrl ?? body.website_url ?? "").trim().slice(0, 500);
  const websiteName = String(body.websiteName ?? body.website_name ?? "").trim().slice(0, 120);

  const errors = {};
  if (!name) errors.name = "name is required";
  if (!email) errors.email = "email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "email is invalid";
  if (!message) errors.message = "message is required";
  if (!websiteUrl) errors.websiteUrl = "websiteUrl is required";
  else {
    try {
      new URL(websiteUrl);
    } catch {
      errors.websiteUrl = "websiteUrl must be a valid URL (include https://)";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", fields: errors },
      { status: 422, headers: corsHeaders() }
    );
  }

  const comment = await insertComment({
    name,
    email,
    message,
    websiteUrl,
    websiteName: websiteName || deriveWebsiteName(websiteUrl),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json(
    { ok: true, message: "Comment received", comment },
    { status: 201, headers: corsHeaders() }
  );
}
