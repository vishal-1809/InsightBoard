"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe2,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
} from "lucide-react";

const GRANULARITIES = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d, n) {
  return addDays(d, n * 7);
}
function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function fmtShort(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function nextStart(s, g) {
  if (g === "day") return addDays(s, 1);
  if (g === "week") return addWeeks(s, 1);
  if (g === "month") return addMonths(s, 1);
  return new Date(s.getFullYear() + 1, 0, 1);
}
function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function buildBuckets(comments, g, from, to) {
  const now = new Date();
  const winEnd = to ? endOfDay(to) : endOfDay(now);
  let winStart;

  if (from) winStart = startOfDay(from);
  else if (g === "day") winStart = startOfDay(addDays(now, -29));
  else if (g === "week") winStart = startOfWeek(addWeeks(now, -11));
  else if (g === "month") winStart = startOfMonth(addMonths(now, -11));
  else {
    const years = comments.map((c) => new Date(c.createdAt).getFullYear());
    const minYear = years.length ? Math.min(...years) : now.getFullYear();
    winStart = new Date(Math.min(minYear, now.getFullYear()), 0, 1);
  }

  if (g === "day" && winStart < addDays(winEnd, -91)) winStart = addDays(winEnd, -91);
  if (g === "week" && winStart < addWeeks(winEnd, -25)) winStart = addWeeks(winEnd, -25);
  if (g === "month" && winStart < addMonths(winEnd, -23)) winStart = addMonths(winEnd, -23);

  const starts = [];
  let cursor =
    g === "day"
      ? startOfDay(winStart)
      : g === "week"
        ? startOfWeek(winStart)
        : g === "month"
          ? startOfMonth(winStart)
          : new Date(winStart.getFullYear(), 0, 1);

  let guard = 0;
  while (cursor <= winEnd && guard < 130) {
    starts.push(new Date(cursor));
    cursor = nextStart(cursor, g);
    guard++;
  }
  if (!starts.length) return [];

  const buckets = starts.map((s) => ({ start: s, end: nextStart(s, g), count: 0 }));
  const lo = buckets[0].start.getTime();
  const hi = buckets[buckets.length - 1].end.getTime();

  for (const c of comments) {
    const t = new Date(c.createdAt).getTime();
    if (t < lo || t >= hi) continue;
    for (const b of buckets) {
      if (t >= b.start.getTime() && t < b.end.getTime()) {
        b.count++;
        break;
      }
    }
  }

  return buckets.map((b) => {
    if (g === "day") {
      return {
        ...b,
        label: fmtShort(b.start),
        sub: b.start.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
    }
    if (g === "week") {
      return {
        ...b,
        label: fmtShort(b.start),
        sub: `${fmtShort(b.start)} – ${fmtShort(addDays(b.end, -1))}`,
      };
    }
    if (g === "month") {
      const m = b.start.toLocaleDateString(undefined, { month: "short" });
      const label = b.start.getMonth() === 0 ? `${m} '${String(b.start.getFullYear()).slice(2)}` : m;
      return {
        ...b,
        label,
        sub: b.start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      };
    }
    return { ...b, label: String(b.start.getFullYear()), sub: `Year ${b.start.getFullYear()}` };
  });
}

function SliderToggle({ value, onChange, left, right, tint }) {
  const leftActive = value === left.value;
  return (
    <div className="relative flex rounded-full border border-white/10 bg-white/[0.04] p-1">
      <div
        className={`absolute bottom-1 top-1 rounded-full transition-all duration-300 ${tint}`}
        style={{ left: leftActive ? 4 : "50%", right: leftActive ? "50%" : 4 }}
      />
      {[left, right].map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 flex min-w-[110px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === opt.value ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {opt.icon ? <opt.icon className="h-3.5 w-3.5" /> : null}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TimeControls({ granularity, setGranularity, tint }) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {GRANULARITIES.map((gr) => (
        <button
          key={gr.key}
          onClick={() => setGranularity(gr.key)}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            granularity === gr.key ? tint : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          {gr.label}
        </button>
      ))}
    </div>
  );
}

function VerticalBars({ buckets, tint, hover, setHover, noun }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const labelStep = Math.max(1, Math.ceil(buckets.length / 7));
  const tooltipLeft =
    hover != null && buckets.length
      ? Math.min(88, Math.max(12, ((hover + 0.5) / buckets.length) * 100))
      : 50;

  return (
    <>
      <div className="relative mt-4 h-48 sm:h-56" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-x-0 bottom-0 top-8">
          {[1, 0.75, 0.5, 0.25, 0].map((s) => (
            <div
              key={s}
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ bottom: `${s * 100}%`, transform: "translateY(50%)" }}
            >
              <span className="w-7 shrink-0 text-right font-mono text-[9px] tabular-nums text-slate-600">
                {Math.round(max * s)}
              </span>
              <div className={`h-px flex-1 ${s === 0 ? "bg-white/15" : "bg-white/[0.05]"}`} />
            </div>
          ))}

          <div className="absolute bottom-0 left-9 right-0 top-0 flex items-end gap-[3px]">
            {buckets.map((b, i) => {
              const pct = (b.count / max) * 100;
              const active = hover === i;
              return (
                <div
                  key={i}
                  className="relative flex h-full flex-1 cursor-pointer items-end"
                  onMouseEnter={() => setHover(i)}
                >
                  <div
                    className={`anim-bar w-full rounded-t-[3px] ${b.count ? "" : "bg-white/[0.07]"}`}
                    style={{
                      height: b.count ? `${Math.max(pct, 2.5)}%` : "3px",
                      background: b.count ? tint(active) : undefined,
                      opacity: hover == null || active ? 1 : 0.4,
                      boxShadow: active ? "0 0 20px rgba(255,255,255,.18)" : undefined,
                      animationDelay: `${Math.min(i * 12, 480)}ms`,
                      transformOrigin: "bottom",
                      transition: "opacity .15s ease, box-shadow .15s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {hover != null && buckets[hover] && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-[#151a2a] px-3 py-1.5 shadow-xl shadow-black/50"
            style={{ left: `${tooltipLeft}%` }}
          >
            <p className="whitespace-nowrap text-[10px] text-slate-400">{buckets[hover].sub}</p>
            <p className="whitespace-nowrap text-xs font-semibold text-slate-100">
              {buckets[hover].count} {buckets[hover].count === 1 ? noun : `${noun}s`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-[3px] pl-9">
        {buckets.map((b, i) => (
          <span
            key={i}
            className={`flex-1 truncate text-center font-mono text-[9px] ${
              i % labelStep === 0 ? "text-slate-500" : "text-transparent"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </>
  );
}

function HorizontalBars({ items, color, emptyLabel }) {
  const max = Math.max(1, ...items.map((i) => i.value), 1);
  if (!items.length) return <div className="py-8 text-center text-xs text-slate-600">{emptyLabel}</div>;
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => {
        const pct = (it.value / max) * 100;
        return (
          <div key={it.key} className="group">
            <div className="flex items-baseline justify-between gap-3 pb-1">
              <p className="min-w-0 truncate text-xs font-medium text-slate-300">{it.label}</p>
              <p className="shrink-0 font-mono text-xs tabular-nums text-slate-400">{fmt(it.value)}</p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={`h-full rounded-full ${color}`}
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  animation: `bar-grow 0.6s cubic-bezier(0.22,0.8,0.3,1) ${Math.min(i * 40, 400)}ms both`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LikesRanked({ items }) {
  const max = Math.max(1, ...items.flatMap((it) => [it.likes, it.dislikes]), 1);
  if (!items.length) return <div className="py-8 text-center text-xs text-slate-600">No like / dislike data yet</div>;
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-xs font-medium text-slate-300">{it.label}</p>
            <p className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
              <span className="text-emerald-300">{fmt(it.likes)}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span className="text-rose-300">{fmt(it.dislikes)}</span>
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{
                  width: `${Math.max((it.likes / max) * 100, 0.4)}%`,
                  animation: `bar-grow 0.5s cubic-bezier(0.22,0.8,0.3,1) ${Math.min(i * 40, 400)}ms both`,
                  transformOrigin: "left",
                }}
              />
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                style={{
                  width: `${Math.max((it.dislikes / max) * 100, 0.4)}%`,
                  animation: `bar-grow 0.5s cubic-bezier(0.22,0.8,0.3,1) ${Math.min(i * 40 + 80, 480)}ms both`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function buildSyntheticSeries(websites, comments, granularity, from, to, kind) {
  const base = buildBuckets(comments, granularity, from, to).map((b) => ({ ...b, count: 0 }));
  if (!base.length) return [];

  const countsByUrl = new Map();
  for (const c of comments) {
    countsByUrl.set(c.websiteUrl, (countsByUrl.get(c.websiteUrl) || 0) + 1);
  }

  for (const site of websites || []) {
    const siteCommentCount = countsByUrl.get(site.websiteUrl) || 0;
    const totalMetric =
      kind === "views"
        ? Number(site.views) || 0
        : kind === "likes"
          ? Number(site.likes) || 0
          : Number(site.dislikes) || 0;

    if (totalMetric <= 0) continue;

    const siteComments = comments.filter((c) => c.websiteUrl === site.websiteUrl);

    if (siteCommentCount > 0 && siteComments.length > 0) {
      const temp = buildBuckets(siteComments, granularity, from, to);
      const sum = temp.reduce((a, b) => a + b.count, 0) || 1;
      temp.forEach((b, i) => {
        base[i].count += (b.count / sum) * totalMetric;
      });
    } else {
      const idx = base.length - 1;
      base[idx].count += totalMetric;
    }
  }

  return base.map((b) => ({ ...b, count: Math.round(b.count) }));
}

export default function ActivityGraph({
  comments,
  websites,
  selected,
  websiteName,
  dateLabel,
  from,
  to,
  onClose,
}) {
  const [viewsMode, setViewsMode] = useState("ranked");
  const [likesMode, setLikesMode] = useState("ranked");
  const [viewsGranularity, setViewsGranularity] = useState("day");
  const [likesGranularity, setLikesGranularity] = useState("day");
  const [commentsGranularity, setCommentsGranularity] = useState("day");
  const [commentsHover, setCommentsHover] = useState(null);
  const [viewsHover, setViewsHover] = useState(null);
  const [likesHover, setLikesHover] = useState(null);
  const [viewSlide, setViewSlide] = useState(0);
  const [likeSlide, setLikeSlide] = useState(0);

  const isSingle = selected !== "all";
  const scopedSites = useMemo(() => {
    if (!websites) return [];
    return isSingle ? websites.filter((w) => w.websiteUrl === selected) : websites;
  }, [websites, isSingle, selected]);

  const commentsBuckets = useMemo(
    () => buildBuckets(comments, commentsGranularity, from, to),
    [comments, commentsGranularity, from, to]
  );
  const viewsBuckets = useMemo(
    () => buildSyntheticSeries(scopedSites, comments, viewsGranularity, from, to, "views"),
    [scopedSites, comments, viewsGranularity, from, to]
  );
  const likesBuckets = useMemo(
    () => buildSyntheticSeries(scopedSites, comments, likesGranularity, from, to, "likes"),
    [scopedSites, comments, likesGranularity, from, to]
  );
  const dislikesBuckets = useMemo(
    () => buildSyntheticSeries(scopedSites, comments, likesGranularity, from, to, "dislikes"),
    [scopedSites, comments, likesGranularity, from, to]
  );

  const commentsTotal = commentsBuckets.reduce((a, b) => a + b.count, 0);
  const viewsTotal = scopedSites.reduce((a, w) => a + (Number(w.views) || 0), 0);
  const likesTotal = scopedSites.reduce((a, w) => a + (Number(w.likes) || 0), 0);
  const dislikesTotal = scopedSites.reduce((a, w) => a + (Number(w.dislikes) || 0), 0);

  const rankedViews = useMemo(
    () =>
      scopedSites
        .map((w) => ({ key: w.websiteUrl, label: w.websiteName, value: Number(w.views) || 0 }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value),
    [scopedSites]
  );

  const rankedLikes = useMemo(
    () =>
      scopedSites
        .map((w) => ({
          key: w.websiteUrl,
          label: w.websiteName,
          likes: Number(w.likes) || 0,
          dislikes: Number(w.dislikes) || 0,
        }))
        .filter((r) => r.likes > 0 || r.dislikes > 0)
        .sort((a, b) => b.likes + b.dislikes - (a.likes + a.dislikes)),
    [scopedSites]
  );

  const peak = commentsBuckets.reduce((best, b) => (b.count > (best?.count ?? -1) ? b : best), null);
  const avg = commentsBuckets.length ? (commentsTotal / commentsBuckets.length).toFixed(1) : "0";

  const viewTimeTotal = viewsBuckets.reduce((a, b) => a + b.count, 0);
  const likesTimeTotal = likesBuckets.reduce((a, b) => a + b.count, 0);
  const dislikesTimeTotal = dislikesBuckets.reduce((a, b) => a + b.count, 0);

  const canPrevView = viewSlide > 0;
  const canNextView = viewSlide < 1;
  const canPrevLike = likeSlide > 0;
  const canNextLike = likeSlide < 1;

  return (
    <section className="glass anim-fade-up overflow-hidden rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-400/15 text-amber-300">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold tracking-tight sm:text-lg">Activity overview</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Globe2 className="h-3 w-3 text-teal-300/80" />
                <span className="max-w-44 truncate font-medium text-slate-400">{websiteName}</span>
              </span>
              {dateLabel && (
                <span className="flex items-center gap-1 text-amber-300/80">
                  <CalendarRange className="h-3 w-3" />
                  {dateLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close graph"
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/15 text-sky-300">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-sm font-bold tracking-tight">Page view count graph</p>
                <p className="text-[10px] text-slate-500">{isSingle ? websiteName : `Across ${scopedSites.length} websites`}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setViewSlide(0);
                  setViewsMode("ranked");
                }}
                disabled={!canPrevView}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <SliderToggle
                value={viewsMode}
                onChange={(v) => {
                  setViewsMode(v);
                  setViewSlide(v === "ranked" ? 0 : 1);
                }}
                left={{ value: "ranked", label: "Site bars", icon: Eye }}
                right={{ value: "time", label: "Time graph", icon: BarChart3 }}
                tint="bg-sky-500/20"
              />
              <button
                onClick={() => {
                  setViewSlide(1);
                  setViewsMode("time");
                }}
                disabled={!canNextView}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold tracking-tight text-sky-300">{fmt(viewsTotal)}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">total views</p>
            </div>
            {viewsMode === "time" && (
              <TimeControls
                granularity={viewsGranularity}
                setGranularity={setViewsGranularity}
                tint="border-sky-300/25 bg-sky-400/15 text-sky-200"
              />
            )}
          </div>

          {viewsMode === "ranked" ? (
            <div className="mt-4">
              {isSingle ? (
                <div className="overflow-hidden rounded-xl border border-sky-300/10 bg-gradient-to-br from-sky-400/[0.08] to-transparent p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{websiteName}</p>
                  <p className="mt-1 font-display text-4xl font-bold tracking-tight text-sky-200 sm:text-5xl">{fmt(viewsTotal)}</p>
                  <p className="mt-1 text-xs text-slate-500">total page views recorded</p>
                </div>
              ) : (
                <HorizontalBars
                  items={rankedViews}
                  color="bg-gradient-to-r from-sky-500 to-cyan-300"
                  emptyLabel="No view data yet"
                />
              )}
            </div>
          ) : (
            <VerticalBars
              buckets={viewsBuckets}
              hover={viewsHover}
              setHover={setViewsHover}
              noun="view"
              tint={(active) =>
                active
                  ? "linear-gradient(to top, #38bdf8, #67e8f9 55%, #d5f5ff)"
                  : "linear-gradient(to top, #0369a1, #38bdf8 55%, #67e8f9)"
              }
            />
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
                <ThumbsUp className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-sm font-bold tracking-tight">Like / dislike graph</p>
                <p className="text-[10px] text-slate-500">{isSingle ? websiteName : `Across ${scopedSites.length} websites`}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setLikeSlide(0);
                  setLikesMode("ranked");
                }}
                disabled={!canPrevLike}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <SliderToggle
                value={likesMode}
                onChange={(v) => {
                  setLikesMode(v);
                  setLikeSlide(v === "ranked" ? 0 : 1);
                }}
                left={{ value: "ranked", label: "Site bars", icon: ThumbsUp }}
                right={{ value: "time", label: "Time graph", icon: BarChart3 }}
                tint="bg-emerald-500/20"
              />
              <button
                onClick={() => {
                  setLikeSlide(1);
                  setLikesMode("time");
                }}
                disabled={!canNextLike}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="flex items-center gap-1 font-display text-xl font-bold tracking-tight text-emerald-300">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {fmt(likesTotal)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">likes</p>
              </div>
              <div>
                <p className="flex items-center gap-1 font-display text-xl font-bold tracking-tight text-rose-300">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {fmt(dislikesTotal)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">dislikes</p>
              </div>
            </div>
            {likesMode === "time" && (
              <TimeControls
                granularity={likesGranularity}
                setGranularity={setLikesGranularity}
                tint="border-emerald-300/25 bg-emerald-400/15 text-emerald-200"
              />
            )}
          </div>

          {likesMode === "ranked" ? (
            <div className="mt-4">
              {isSingle ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.08] to-transparent p-5">
                    <div className="flex items-center gap-2 text-emerald-300/80">
                      <ThumbsUp className="h-4 w-4" />
                      <p className="text-[11px] font-medium uppercase tracking-wider">Likes</p>
                    </div>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight text-emerald-200 sm:text-4xl">{fmt(likesTotal)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-300/15 bg-gradient-to-br from-rose-400/[0.08] to-transparent p-5">
                    <div className="flex items-center gap-2 text-rose-300/80">
                      <ThumbsDown className="h-4 w-4" />
                      <p className="text-[11px] font-medium uppercase tracking-wider">Dislikes</p>
                    </div>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight text-rose-200 sm:text-4xl">{fmt(dislikesTotal)}</p>
                  </div>
                </div>
              ) : (
                <LikesRanked items={rankedLikes} />
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">Likes over time</p>
                <VerticalBars
                  buckets={likesBuckets}
                  hover={likesHover}
                  setHover={setLikesHover}
                  noun="like"
                  tint={(active) =>
                    active
                      ? "linear-gradient(to top, #34d399, #6ee7b7 55%, #d1fae5)"
                      : "linear-gradient(to top, #047857, #34d399 55%, #6ee7b7)"
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300/80">Dislikes over time</p>
                <VerticalBars
                  buckets={dislikesBuckets}
                  hover={likesHover}
                  setHover={setLikesHover}
                  noun="dislike"
                  tint={(active) =>
                    active
                      ? "linear-gradient(to top, #fb7185, #fda4af 55%, #ffe4e6)"
                      : "linear-gradient(to top, #be123c, #fb7185 55%, #fda4af)"
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
                <span>
                  <b className="font-display text-sm font-bold text-emerald-300">{fmt(likesTimeTotal)}</b> likes in view
                </span>
                <span>
                  <b className="font-display text-sm font-bold text-rose-300">{fmt(dislikesTimeTotal)}</b> dislikes in view
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400/15 text-amber-300">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-sm font-bold tracking-tight">Comment graph</p>
                <p className="text-[10px] text-slate-500">{isSingle ? websiteName : "Across all websites"}{dateLabel ? ` · ${dateLabel}` : ""}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TimeControls
                granularity={commentsGranularity}
                setGranularity={setCommentsGranularity}
                tint="border-amber-300/25 bg-amber-400/15 text-amber-200"
              />
            </div>
          </div>

          <VerticalBars
            buckets={commentsBuckets}
            hover={commentsHover}
            setHover={setCommentsHover}
            noun="comment"
            tint={(active) =>
              active
                ? "linear-gradient(to top, #f59e0b, #fbbf24 55%, #fde68a)"
                : "linear-gradient(to top, #b45309, #f59e0b 55%, #fbbf24)"
            }
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-slate-400">
            <span>
              <b className="font-display text-sm font-bold text-slate-100">{fmt(commentsTotal)}</b> comments in view
            </span>
            {peak && peak.count > 0 && (
              <span>
                Peak: <b className="font-medium text-amber-300">{peak.sub}</b>{" "}
                <span className="text-slate-500">({peak.count})</span>
              </span>
            )}
            <span>
              Avg <b className="font-medium text-slate-200">{avg}</b> / {commentsGranularity}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
