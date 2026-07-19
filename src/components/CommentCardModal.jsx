"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Mail,
  Trash2,
  X,
} from "lucide-react";
import { fullDate, hueFromString, initials } from "@/lib/format";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

/**
 * Preview card shown when a comment row is clicked.
 * Displays the full message plus commenter details, with copy / visit / delete actions.
 */
export default function CommentCardModal({ comment, onClose, onDelete, deleting }) {
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hue = hueFromString(comment.email || comment.name);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !confirmOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, confirmOpen]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(comment.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 grid cursor-default place-items-center p-4"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div className="anim-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div
          className="anim-pop relative w-full max-w-lg cursor-auto overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e17] shadow-2xl shadow-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* accent strip */}
          <div
            className="h-1.5 w-full"
            style={{
              background: `linear-gradient(90deg, hsl(${hue} 75% 55%), hsl(${(hue + 60) % 360} 75% 45%))`,
            }}
          />

          <div className="p-6">
            {/* header: who */}
            <div className="flex items-start gap-4">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 text-base font-semibold text-white/95"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue} 70% 45% / .95), hsl(${(hue + 45) % 360} 70% 34% / .95))`,
                }}
              >
                {initials(comment.name)}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-bold tracking-tight">{comment.name}</h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <a
                    href={`mailto:${comment.email}`}
                    className="flex min-w-0 items-center gap-1.5 text-sm text-teal-300/90 transition hover:text-teal-200"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{comment.email}</span>
                  </a>
                  <button
                    onClick={copyEmail}
                    aria-label="Copy email"
                    className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 transition hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-teal-300" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* meta chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-200">
                <Globe2 className="h-3.5 w-3.5" />
                {comment.websiteName}
              </span>
              <a
                href={comment.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit site
              </a>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                {fullDate(comment.createdAt)}
              </span>
            </div>

            {/* the message */}
            <div className="mt-5 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-200">
                {comment.message}
              </p>
            </div>

            {/* footer */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="truncate font-mono text-[10px] text-slate-600">id: {comment.id}</p>
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation popup */}
      {confirmOpen && (
        <ConfirmDeleteModal
          comment={comment}
          loading={deleting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            onDelete();
            setConfirmOpen(false);
          }}
        />
      )}
    </>
  );
}
