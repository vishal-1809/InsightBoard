"use client";

import { useEffect, useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";
import { addDays, startOfDay, startOfMonth } from "@/lib/format";

const PRESETS = [
  { label: "All time", get: () => ({ from: null, to: null }) },
  {
    label: "Today",
    get: () => {
      const t = startOfDay(new Date());
      return { from: t, to: t };
    },
  },
  {
    label: "Yesterday",
    get: () => {
      const y = addDays(startOfDay(new Date()), -1);
      return { from: y, to: y };
    },
  },
  {
    label: "Last 7 days",
    get: () => ({ from: addDays(startOfDay(new Date()), -6), to: startOfDay(new Date()) }),
  },
  {
    label: "Last 30 days",
    get: () => ({ from: addDays(startOfDay(new Date()), -29), to: startOfDay(new Date()) }),
  },
  {
    label: "Last 90 days",
    get: () => ({ from: addDays(startOfDay(new Date()), -89), to: startOfDay(new Date()) }),
  },
  {
    label: "This month",
    get: () => ({ from: startOfMonth(new Date()), to: startOfDay(new Date()) }),
  },
];

function toInputStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtRangeLabel(from, to) {
  const nowYear = new Date().getFullYear();
  const f = (d) =>
    d.toLocaleDateString(
      undefined,
      d.getFullYear() !== nowYear
        ? { month: "short", day: "numeric", year: "numeric" }
        : { month: "short", day: "numeric" }
    );
  if (from && to) {
    return from.getTime() === to.getTime() ? f(from) : `${f(from)} – ${f(to)}`;
  }
  if (from) return `Since ${f(from)}`;
  return `Until ${f(to)}`;
}

/**
 * Date-range filter for the comment list & activity graph.
 * Quick presets + custom from/to pickers.
 */
export default function DateRangeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [fromStr, setFromStr] = useState("");
  const [toStr, setToStr] = useState("");

  useEffect(() => {
    if (open) {
      setFromStr(value.from ? toInputStr(value.from) : "");
      setToStr(value.to ? toInputStr(value.to) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pick(preset) {
    const range = preset.get();
    onChange({ ...range, label: preset.label });
    setOpen(false);
  }

  function applyCustom() {
    if (!fromStr && !toStr) return;
    let from = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
    let to = toStr ? new Date(`${toStr}T00:00:00`) : null;
    if (from && to && from > to) [from, to] = [to, from];
    onChange({ from, to, label: fmtRangeLabel(from, to) });
    setOpen(false);
  }

  const active = value.label !== "All time";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Filter by date range"
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
          active
            ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
        }`}
      >
        <CalendarRange className={`h-3.5 w-3.5 ${active ? "text-amber-300" : "text-slate-500"}`} />
        <span className="hidden whitespace-nowrap sm:inline">{value.label}</span>
        <span className="sm:hidden">Dates</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />

          <div className="anim-pop absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0d1019] p-3 shadow-2xl shadow-black/60">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Quick ranges
            </p>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => pick(p)}
                  className={`cursor-pointer rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                    value.label === p.label
                      ? "border border-amber-300/25 bg-amber-400/15 text-amber-200"
                      : "border border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="my-3 h-px bg-white/[0.06]" />

            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              Custom range
            </p>
            <div className="grid grid-cols-2 gap-2 px-1">
              <label className="block">
                <span className="mb-1 block text-[10px] text-slate-500">From</span>
                <input
                  type="date"
                  value={fromStr}
                  max={toStr || undefined}
                  onChange={(e) => setFromStr(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-slate-200 outline-none transition [color-scheme:dark] focus:border-amber-300/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-slate-500">To</span>
                <input
                  type="date"
                  value={toStr}
                  min={fromStr || undefined}
                  onChange={(e) => setToStr(e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-slate-200 outline-none transition [color-scheme:dark] focus:border-amber-300/40"
                />
              </label>
            </div>

            <button
              onClick={applyCustom}
              disabled={!fromStr && !toStr}
              className="mt-3 w-full cursor-pointer rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 py-2 text-xs font-semibold text-[#231203] shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            >
              Apply range
            </button>
          </div>
        </>
      )}
    </div>
  );
}
