"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Code2,
  Database,
  Globe2,
  HardDrive,
  Inbox,
  Eye,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  LogOut,
  Menu,
  MessageSquareText,
  MessagesSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  endOfDay,
  fullDate,
  hueFromString,
  initials,
  lastNDayCounts,
  startOfDay,
  timeAgo,
} from "@/lib/format";
import CommentCardModal from "@/components/CommentCardModal";
import ApiDocsModal from "@/components/ApiDocsModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import DateRangeFilter from "@/components/DateRangeFilter";
import ActivityGraph from "@/components/ActivityGraph";

/* ── small presentational pieces ─────────────────────────────────── */

function Avatar({ name, email }) {
  const hue = hueFromString(email || name);
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-semibold text-white/95"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 45% / .95), hsl(${(hue + 45) % 360} 70% 34% / .95))`,
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="glass anim-fade-up rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

/** Tiny animated 14-day pulse line shown inside the graph toggle box. */
function Sparkline({ data }) {
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 26;
  const pts = data.map(
    (v, i) => `${(i / (data.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`,
  );
  const last = pts[pts.length - 1].split(",");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        className="anim-draw"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="#fde68a" />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="glass flex animate-pulse items-center gap-4 rounded-2xl p-4"
        >
          <div className="h-10 w-10 rounded-full bg-white/[0.07]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-white/[0.07]" />
            <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── dashboard ───────────────────────────────────────────────────── */

export default function Dashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [origin, setOrigin] = useState("");

  const [websites, setWebsites] = useState([]);
  const [comments, setComments] = useState([]);
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const [siteQuery, setSiteQuery] = useState("");

  // date-range filter (shared by list + graph)
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
    label: "All time",
  });
  const [graphOpen, setGraphOpen] = useState(false);

  // engagement (likes / dislikes / views) — read via the api-key endpoints
  const [engagement, setEngagement] = useState({
    byUrl: new Map(),
    totalLikes: 0,
    totalDislikes: 0,
    totalViews: 0,
  });

  const [activeComment, setActiveComment] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, kind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const loadWebsites = useCallback(async () => {
    try {
      const res = await fetch("/api/websites");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.ok) {
        setWebsites(data.websites);
        setStoreInfo(data.store);
      }
    } catch {
      /* keep old data */
    }
  }, []);

  const loadComments = useCallback(
    async (site, { silent } = {}) => {
      if (!silent) setLoadingList(true);
      try {
        const params = new URLSearchParams();
        if (site && site !== "all") params.set("website", site);
        const res = await fetch(`/api/comments?${params.toString()}`);
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (data.ok) setComments(data.comments);
      } catch {
        pushToast("Failed to load comments", "error");
      } finally {
        setLoadingList(false);
      }
    },
    [router, pushToast],
  );

  const loadEngagement = useCallback(async (key) => {
    if (!key) return;
    try {
      const opts = { headers: { "x-api-key": key } };
      const [lRes, vRes] = await Promise.all([
        fetch("/api/likes", opts),
        fetch("/api/views", opts),
      ]);
      const lData = await lRes.json();
      const vData = await vRes.json();

      const byUrl = new Map();
      let totalLikes = 0;
      let totalDislikes = 0;
      for (const l of lData.likes || []) {
        byUrl.set(l.websiteUrl, {
          likes: l.likes || 0,
          dislikes: l.dislikes || 0,
          views: 0,
        });
        totalLikes += l.likes || 0;
        totalDislikes += l.dislikes || 0;
      }
      let totalViews = 0;
      for (const v of vData.views || []) {
        const e = byUrl.get(v.websiteUrl) || { likes: 0, dislikes: 0 };
        e.views = v.count || 0;
        byUrl.set(v.websiteUrl, e);
        totalViews += v.count || 0;
      }
      setEngagement({ byUrl, totalLikes, totalDislikes, totalViews });
    } catch {
      /* engagement optional — ignore failures */
    }
  }, []);

  /* bootstrap: verify session, then load everything */
  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setStoreInfo(data.store);
        setApiKey(data.integration?.apiKey || "");
        await Promise.all([
          loadWebsites(),
          loadComments("all"),
          loadEngagement(data.integration?.apiKey),
        ]);
        setReady(true);
      } catch {
        router.replace("/login");
      }
    })();
  }, [router, loadWebsites, loadComments]);

  function selectWebsite(url) {
    setSelected(url);
    setActiveComment(null);
    setSidebarOpen(false);
    setQuery("");
    loadComments(url);
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([
      loadWebsites(),
      loadComments(selected, { silent: true }),
    ]);
    setRefreshing(false);
    pushToast("Inbox refreshed", "success");
  }

  async function executeDelete(comment) {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast(data.error || "Delete failed", "error");
        return;
      }
      setComments((cs) => cs.filter((c) => c.id !== comment.id));
      setActiveComment((c) => (c?.id === comment.id ? null : c));
      pushToast("Comment deleted", "success");
      loadWebsites();
    } catch {
      pushToast("Delete failed", "error");
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
    }
  }

  function requestDelete(comment) {
    setConfirmTarget(comment);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  /* ── derived data ─────────────────────────────────────────────── */

  // Website scope (from API) → date-range scope → text search scope
  const graphComments = useMemo(() => {
    let list = comments;
    if (dateRange.from) {
      const from = startOfDay(dateRange.from).getTime();
      list = list.filter((c) => new Date(c.createdAt).getTime() >= from);
    }
    if (dateRange.to) {
      const to = endOfDay(dateRange.to).getTime();
      list = list.filter((c) => new Date(c.createdAt).getTime() <= to);
    }
    return list;
  }, [comments, dateRange]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return graphComments;
    return graphComments.filter((c) =>
      [c.name, c.email, c.message, c.websiteName, c.websiteUrl]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [graphComments, q]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400e3;
    return {
      total: comments.length,
      thisWeek: comments.filter(
        (c) => new Date(c.createdAt).getTime() >= weekAgo,
      ).length,
      people: new Set(comments.map((c) => c.email.toLowerCase())).size,
    };
  }, [comments]);

  const spark = useMemo(() => lastNDayCounts(comments, 14), [comments]);

  const totalAll = useMemo(
    () => websites.reduce((a, w) => a + w.count, 0),
    [websites],
  );
  const selectedSite =
    selected === "all" ? null : websites.find((w) => w.websiteUrl === selected);
  const dateActive = dateRange.from || dateRange.to;

  // engagement for the currently selected scope (all sites vs. one site)
  // Derived directly from the merged `websites` rows (which now include likes/dislikes/views)
  const eng = useMemo(() => {
    if (selected === "all") {
      let views = 0;
      let likes = 0;
      let dislikes = 0;
      for (const w of websites) {
        views += Number(w.views) || 0;
        likes += Number(w.likes) || 0;
        dislikes += Number(w.dislikes) || 0;
      }
      return { views, likes, dislikes };
    }
    const row = websites.find((w) => w.websiteUrl === selected);
    return {
      views: row ? Number(row.views) || 0 : 0,
      likes: row ? Number(row.likes) || 0 : 0,
      dislikes: row ? Number(row.dislikes) || 0 : 0,
    };
  }, [websites, selected]);

  const fmt = (n) => Number(n || 0).toLocaleString();

  const sq = siteQuery.trim().toLowerCase();
  const filteredWebsites = useMemo(() => {
    if (!sq) return websites;
    return websites.filter(
      (w) =>
        (w.websiteName || "").toLowerCase().includes(sq) ||
        (w.websiteUrl || "").toLowerCase().includes(sq) ||
        (w.lastCommenter || "").toLowerCase().includes(sq),
    );
  }, [websites, sq]);

  /* loading gate */
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-teal-300" />
          <p className="text-sm">Checking your session…</p>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      {/* brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-[#04222b] shadow-lg shadow-teal-500/20">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold leading-none tracking-tight">
            CommentDesk
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Unified comment inbox
          </p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
          className="ml-auto grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* all comments */}
        <button
          onClick={() => selectWebsite("all")}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
            selected === "all"
              ? "border-teal-300/30 bg-teal-400/10 text-teal-100"
              : "border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"
          }`}
        >
          <Inbox className="h-4 w-4 shrink-0 opacity-80" />
          <span className="flex-1 text-left">All comments</span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] tabular-nums">
            {totalAll}
          </span>
        </button>

        {/* ── "My websites" heading + search ────────────────────── */}
        <div className="mt-4 flex items-center justify-between px-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            My websites
          </p>
          {websites.length > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] tabular-nums text-slate-500">
              {websites.length}
            </span>
          )}
        </div>

        {/* website search filter */}
        {websites.length > 0 && (
          <div className="relative mb-2 px-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <input
              value={siteQuery}
              onChange={(e) => setSiteQuery(e.target.value)}
              placeholder="Filter websites…"
              className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] py-2 pl-9 pr-8 text-xs outline-none transition placeholder:text-slate-600 focus:border-teal-300/30 focus:bg-white/[0.05] focus:ring-1 focus:ring-teal-400/15"
            />
            {siteQuery && (
              <button
                onClick={() => setSiteQuery("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {websites.length === 0 ? (
          <p className="px-3 text-xs leading-relaxed text-slate-600">
            No websites yet. Comments posted via the API will appear here
            grouped by site.
          </p>
        ) : filteredWebsites.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-600">
            No websites matching &ldquo;{siteQuery.trim()}&rdquo;
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredWebsites.map((w) => {
              const hue = hueFromString(w.websiteUrl);
              const isActive = selected === w.websiteUrl;
              return (
                <li key={w.websiteUrl}>
                  <button
                    onClick={() => selectWebsite(w.websiteUrl)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-teal-300/30 bg-teal-400/10"
                        : "border-transparent hover:border-white/5 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white/90"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue} 65% 42% / .9), hsl(${(hue + 40) % 360} 65% 32% / .9))`,
                      }}
                    >
                      {w.websiteName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isActive ? "text-teal-100" : "text-slate-200"
                        }`}
                      >
                        {w.websiteName}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {w.lastCommenter
                          ? `Last: ${w.lastCommenter} · ${timeAgo(w.lastCommentAt)}`
                          : "No comments yet"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${
                        isActive
                          ? "border-teal-300/30 bg-teal-400/15 text-teal-100"
                          : "border-white/10 bg-black/30 text-slate-400"
                      }`}
                    >
                      {w.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* footer */}
      <div className="space-y-3 border-t border-white/5 p-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {storeInfo?.mode === "mongodb" ? (
            <Database className="h-3.5 w-3.5 text-teal-400/80" />
          ) : (
            <HardDrive className="h-3.5 w-3.5 text-amber-400/80" />
          )}
          <span>
            {storeInfo ? `Storage: ${storeInfo.label}` : "Storage: …"}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-xs font-bold text-[#04222b]">
            {initials(user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">
              {user?.username}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              <ShieldCheck className="h-3 w-3 text-teal-400/70" /> Administrator
            </p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* mobile backdrop */}
      {sidebarOpen && (
        <div
          className="anim-fade-in fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40  h-screen w-72 border-r border-white/5 bg-[#090b12]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-[#090b12] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* main column */}
      <main className="min-w-0 flex h-screen flex-1 min-h-0 flex-col overflow-hidden">
        {/* header */}
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-[#06070c]/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.07] lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {selectedSite ? "Website" : "Inbox"}
            </p>
            <h1 className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
              {selectedSite ? selectedSite.websiteName : "All comments"}
            </h1>
          </div>

          {selectedSite && (
            <a
              href={selectedSite.websiteUrl}
              target="_blank"
              rel="noreferrer"
              title="Open website"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-white"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, message…"
                className="w-52 rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-600 focus:w-64 focus:border-teal-300/40 focus:ring-2 focus:ring-teal-400/15 lg:w-60"
              />
            </div>

            <button
              onClick={refresh}
              disabled={refreshing}
              title="Refresh"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={() => setDocsOpen(true)}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-teal-300/30 bg-teal-400/10 px-3 text-xs font-medium text-teal-100 transition hover:bg-teal-400/20"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Integrate API</span>
              <span className="sm:hidden">API</span>
            </button>

            <button
              onClick={logout}
              title="Log out"
              className="hidden h-9 w-9 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 sm:grid"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
            {/* mobile search */}
            <div className="relative sm:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, message…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-teal-300/40"
              />
            </div>

            {/* stats — 4 boxes, last one toggles the activity graph */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={MessagesSquare}
                label={selectedSite ? "Comments on site" : "Total comments"}
                value={stats.total}
                tint="bg-teal-400/10 text-teal-300"
              />
              <StatCard
                icon={CalendarClock}
                label="This week"
                value={stats.thisWeek}
                tint="bg-cyan-400/10 text-cyan-300"
              />
              <StatCard
                icon={Users}
                label="People"
                value={stats.people}
                tint="bg-violet-400/10 text-violet-300"
              />

              <button
                onClick={() => setGraphOpen((o) => !o)}
                title={
                  graphOpen
                    ? "Hide the activity graph"
                    : "View the activity graph"
                }
                className={`glass anim-fade-up group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 sm:p-5 ${
                  graphOpen
                    ? "border-amber-300/35 shadow-lg shadow-amber-500/10"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400">
                    Activity graph
                  </p>
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                      graphOpen
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-amber-400/10 text-amber-300 group-hover:bg-amber-400/20"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p
                    className={`font-display text-lg font-bold tracking-tight sm:text-xl ${
                      graphOpen ? "text-amber-300" : "text-slate-100"
                    }`}
                  >
                    {graphOpen ? "Hide graph" : "View graph"}
                  </p>
                  <div className="w-20 shrink-0 sm:w-24">
                    <Sparkline data={spark} />
                  </div>
                </div>
              </button>
            </div>

            {/* engagement summary — views / likes / dislikes (contextual to the scope) */}
            <div className="glass anim-fade-up flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-5 py-3.5 sm:gap-x-7">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <BarChart3 className="h-3.5 w-3.5 text-amber-300/80" />
                Engagement
                {selectedSite ? (
                  <span className="max-w-40 truncate normal-case tracking-normal text-slate-400">
                    · {selectedSite.websiteName}
                  </span>
                ) : (
                  <span className="normal-case tracking-normal text-slate-400">
                    · all sites
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1.5 text-sm">
                <Eye className="h-4 w-4 text-sky-300" />
                <b className="font-display font-bold text-slate-100">
                  {fmt(eng.views)}
                </b>
                <span className="text-slate-500">views</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <ThumbsUp className="h-4 w-4 text-emerald-300" />
                <b className="font-display font-bold text-slate-100">
                  {fmt(eng.likes)}
                </b>
                <span className="text-slate-500">likes</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <ThumbsDown className="h-4 w-4 text-rose-300" />
                <b className="font-display font-bold text-slate-100">
                  {fmt(eng.dislikes)}
                </b>
                <span className="text-slate-500">dislikes</span>
              </span>
            </div>

            {/* activity graph — follows website filter + date range */}
            {graphOpen && (
              <ActivityGraph
                comments={graphComments}
                websites={websites}
                selected={selected}
                websiteName={
                  selectedSite ? selectedSite.websiteName : "All websites"
                }
                dateLabel={dateActive ? dateRange.label : null}
                from={dateRange.from}
                to={dateRange.to}
                onClose={() => setGraphOpen(false)}
              />
            )}

            {/* list header: count ─ date filter ─ hint */}
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="min-w-0 text-xs font-medium text-slate-500">
                {loadingList
                  ? "Loading…"
                  : `${filtered.length} ${filtered.length === 1 ? "message" : "messages"}${
                      q ? ` matching "${query.trim()}"` : ""
                    }`}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <p className="hidden text-[11px] text-slate-600 lg:block">
                  Click a message to preview it in a card
                </p>
              </div>
            </div>

            {/* comments */}
            {loadingList ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              websites.length === 0 && selected === "all" && !dateActive ? (
                <div className="glass anim-fade-up flex flex-col items-center rounded-3xl px-6 py-16 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-400/20 to-cyan-400/10 text-teal-300">
                    <Inbox className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 font-display text-lg font-bold tracking-tight">
                    Waiting for your first comment
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                    Connect any of your websites to the secure POST endpoint and
                    every message your visitors send will land right here —
                    grouped by website, with the sender&apos;s name, email and
                    time.
                  </p>
                  <button
                    onClick={() => setDocsOpen(true)}
                    className="mt-6 flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-[#04222b] shadow-lg shadow-teal-500/25 transition hover:brightness-110"
                  >
                    <Code2 className="h-4 w-4" />
                    View integration guide
                  </button>
                </div>
              ) : (
                <div className="glass anim-fade-up flex flex-col items-center rounded-3xl px-6 py-14 text-center">
                  <Inbox className="h-8 w-8 text-slate-600" />
                  <p className="mt-4 text-sm font-medium text-slate-300">
                    No comments found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {q
                      ? "Try a different search term."
                      : dateActive
                        ? "No comments in this date range — widen it above."
                        : "Comments posted via the API will appear here."}
                  </p>
                </div>
              )
            ) : (
              <ul className="space-y-2.5">
                {filtered.map((c, i) => (
                  <li
                    key={c.id}
                    className="anim-fade-up"
                    style={{ animationDelay: `${Math.min(i * 40, 360)}ms` }}
                  >
                    <div
                      onClick={() => setActiveComment(c)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setActiveComment(c);
                      }}
                      className="group glass flex w-full cursor-pointer items-start gap-4 rounded-2xl p-4 text-left transition hover:border-teal-300/20 hover:bg-teal-400/[0.04]"
                    >
                      <Avatar name={c.name} email={c.email} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {c.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {c.email}
                          </p>
                          {selected === "all" && (
                            <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                              <Globe2 className="h-3 w-3 text-teal-400/70" />
                              {c.websiteName}
                            </span>
                          )}
                          <span
                            className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-500"
                            title={fullDate(c.createdAt)}
                          >
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                          {c.message}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-2 self-center">
                        <ChevronRight className="h-4 w-4 text-slate-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-teal-300 group-hover:opacity-100" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(c);
                          }}
                          aria-label="Delete comment"
                          title="Delete"
                          className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* comment preview card */}
      {activeComment && (
        <CommentCardModal
          comment={activeComment}
          deleting={deleting}
          onClose={() => setActiveComment(null)}
          onDelete={() => executeDelete(activeComment)}
        />
      )}

      {/* integration guide */}
      {docsOpen && (
        <ApiDocsModal origin={origin} onClose={() => setDocsOpen(false)} />
      )}

      {/* inline delete confirmation (from row trash icon) */}
      {confirmTarget && (
        <ConfirmDeleteModal
          comment={confirmTarget}
          loading={deleting}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => executeDelete(confirmTarget)}
        />
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-pop pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/40 backdrop-blur ${
              t.kind === "error"
                ? "border-red-400/25 bg-red-500/15 text-red-200"
                : "border-teal-300/25 bg-teal-400/15 text-teal-100"
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0 opacity-80" />
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
