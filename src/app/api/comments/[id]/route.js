// ─────────────────────────────────────────────────────────────────────
//  GET    /api/comments/:id    → fetch one comment (JWT required)
//  DELETE /api/comments/:id    → delete one comment (JWT required)
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { deleteComment, getCommentById } from "@/lib/store";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req, ctx) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await ctx.params;
  const comment = await getCommentById(id);
  if (!comment) {
    return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, comment });
}

export async function DELETE(req, ctx) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const { id } = await ctx.params;
  const deleted = await deleteComment(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: id });
}
