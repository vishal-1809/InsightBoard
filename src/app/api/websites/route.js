// GET /api/websites — one row per website with counts (JWT required).

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listWebsites, getStoreInfo } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const [websites, store] = await Promise.all([listWebsites(), getStoreInfo()]);
  const total = websites.reduce((sum, w) => sum + w.count, 0);

  return NextResponse.json({ ok: true, total, websites, store });
}
