"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { hueFromString, initials } from "@/lib/format";

/**
 * Delete‑confirmation dialog.
 * Shows the commenter details so the admin knows exactly which comment
 * they're about to permanently remove.
 */
export default function ConfirmDeleteModal({ comment, loading, onConfirm, onCancel }) {
  const hue = hueFromString(comment.email || comment.name);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] grid cursor-default place-items-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="anim-fade-in absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        className="anim-pop relative w-full max-w-md cursor-auto overflow-hidden rounded-3xl border border-white/10 bg-[#0d1019] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* red accent strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-500" />

        <div className="p-6">
          {/* icon + title */}
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-400/25 bg-red-500/15 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold tracking-tight text-white">
                Delete this comment?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                This action is <span className="font-medium text-red-300">permanent</span> and
                cannot be undone.
              </p>
            </div>
            <button
              onClick={onCancel}
              aria-label="Cancel"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* the comment being deleted */}
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-semibold text-white/95"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 70% 45% / .95), hsl(${(hue + 45) % 360} 70% 34% / .95))`,
              }}
            >
              {initials(comment.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-200">{comment.name}</p>
              <p className="truncate text-xs text-slate-500">{comment.email}</p>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
                {comment.message}
              </p>
            </div>
          </div>

          {/* actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {loading ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
