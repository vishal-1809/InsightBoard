// ─────────────────────────────────────────────────────────────────────
//  /api/likes  — like / dislike counters per website
//
//  POST  → increment a like or dislike (api-key protected, public)
//  GET   → list like/dislike counters   (api-key protected, public)
//
//  NOTE: These endpoints are secured ONLY by the `x-api-key` header.
//        They do NOT require a JWT and do NOT require the admin to be
//        logged in — so any of your websites can read/write engagement
//        with the shared API key.
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { recordLike, listLikes } from "@/lib/store";
import { apiKeyValid } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

function keyError() {
  return NextResponse.json(
    { ok: false, error: "Invalid or missing API key. Send your key in the `x-api-key` header." },
    { status: 401, headers: corsHeaders() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET — api-key only, no login required
export async function GET(req) {
  if (!apiKeyValid(req)) return keyError();

  const { searchParams } = new URL(req.url);
  const website = searchParams.get("website");
  const rows = await listLikes({ websiteUrl: website });

  return NextResponse.json(
    { ok: true, count: rows.length, likes: rows },
    { headers: corsHeaders() }
  );
}

// POST — api-key only, no login required
// Body: { websiteUrl, websiteName?, type: "like"|"dislike", amount? }
export async function POST(req) {
  if (!apiKeyValid(req)) return keyError();

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

  const websiteUrl = String(body.websiteUrl ?? body.website_url ?? "").trim().slice(0, 500);
  const websiteName = String(body.websiteName ?? body.website_name ?? "").trim().slice(0, 120);
  const type = String(body.type ?? "like").trim().toLowerCase() === "dislike" ? "dislike" : "like";

  const errors = {};
  if (!websiteUrl) errors.websiteUrl = "websiteUrl is required";
  else {
    try {
      new URL(websiteUrl);
    } catch {
      errors.websiteUrl = "websiteUrl must be a valid URL (include https://)";
    }
  }
  if (type !== "like" && type !== "dislike") errors.type = 'type must be "like" or "dislike"';
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", fields: errors },
      { status: 422, headers: corsHeaders() }
    );
  }

  const result = await recordLike({
    websiteUrl,
    websiteName,
    type,
    amount: Number(body.amount) || 1,
  });

  return NextResponse.json(
    {
      ok: true,
      message: `${type === "dislike" ? "Dislike" : "Like"} recorded`,
      type,
      ...result,
    },
    { status: 201, headers: corsHeaders() }
  );
}
