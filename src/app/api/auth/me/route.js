// GET /api/auth/me — returns the logged-in admin + integration info.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStoreInfo } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const store = await getStoreInfo();

  return NextResponse.json({
    ok: true,
    user,
    store,
    integration: {
      endpoint: "/api/comments",
      method: "POST",
      headerName: "x-api-key",
      // Never expose the actual API key to the frontend.
      apiKeyPlaceholder: "YOUR_API_SEC_KEY",
    },
  });
}
