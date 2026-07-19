"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";

/* ── syntax highlighter ──────────────────────────────────────────── */

/**
 * Tiny client-side syntax highlighter.  Splits source code into tokens
 * and wraps each one in a coloured <span>.  Supports JS / cURL.
 */
function highlight(code, lang = "js") {
  // Ordered rules — first match wins per character position.
  const rules = [
    // comments   → grey
    { re: /(\/\/[^\n]*)/g, cls: "text-slate-500 italic" },
    // template-literal   → green (backtick strings)
    { re: /(`[^`]*`)/g, cls: "text-emerald-300" },
    // double-quoted strings → green
    { re: /("(?:[^"\\]|\\.)*")/g, cls: "text-emerald-300" },
    // single-quoted strings → green
    { re: /('(?:[^'\\]|\\.)*')/g, cls: "text-emerald-300" },
    // JS keywords → purple
    {
      re: /\b(await|async|const|let|var|function|return|if|else|new|try|catch|throw|import|from|export|default|class|extends|true|false|null|undefined)\b/g,
      cls: "text-violet-400 font-medium",
    },
    // methods / built-ins → sky
    {
      re: /\b(fetch|console|window|document|JSON|localStorage|Headers|Response|Request|Promise|setTimeout|setInterval|Math|Date|Error)\b/g,
      cls: "text-sky-300",
    },
    // method calls → yellow
    { re: /\b(\w+)(?=\s*\()/g, cls: "text-amber-300" },
    // numbers → orange
    { re: /\b(\d[\d_.]*)\b/g, cls: "text-orange-300" },
    // object keys (before colon) → cyan
    { re: /(?<=[\n{,]\s*)(\w[\w-]*)(?=\s*:)/g, cls: "text-cyan-300" },
    // HTTP verbs → bold teal
    { re: /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g, cls: "text-teal-300 font-bold" },
    // URLs → underline teal
    { re: /(https?:\/\/[^\s"'`]+)/g, cls: "text-teal-200 underline decoration-teal-400/30" },
    // curl flags → purple
    { re: /(\s-[A-Za-z]+)/g, cls: "text-violet-400" },
    // arrow => → pink
    { re: /(=>)/g, cls: "text-pink-400" },
    // braces / brackets → slate-bright
    { re: /([{}[\]()])/g, cls: "text-slate-300" },
    // punctuation
    { re: /([;,])/g, cls: "text-slate-500" },
  ];

  // Build a flat array of { start, end, cls } from all rules.
  const spans = [];
  for (const { re, cls } of rules) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(code)) !== null) {
      const idx = m.index + (m[0].length - m[1].length); // group 1 offset
      spans.push({ start: idx, end: idx + m[1].length, cls });
    }
  }

  // Sort by start, then earlier wins (greedy first-match).
  spans.sort((a, b) => a.start - b.start || a.end - b.end);

  // Merge — skip overlapping spans.
  const merged = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue; // overlaps a prior span
    merged.push(s);
    cursor = s.end;
  }

  // Build React elements.
  const parts = [];
  let pos = 0;
  for (const { start, end, cls } of merged) {
    if (start > pos) parts.push(code.slice(pos, start));
    parts.push(
      <span key={start} className={cls}>
        {code.slice(start, end)}
      </span>
    );
    pos = end;
  }
  if (pos < code.length) parts.push(code.slice(pos));
  return parts;
}

/* ── code block ──────────────────────────────────────────────────── */

function CodeBlock({ title, code, lang = "js", method, badge }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  const methodColors = {
    POST: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    GET: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    DELETE: "border-red-400/30 bg-red-400/10 text-red-300",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d16]">
      {/* title bar — looks like an editor tab bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0e1120] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          {method && (
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                methodColors[method] || "border-white/20 bg-white/5 text-slate-300"
              }`}
            >
              {method}
            </span>
          )}
          <p className="text-[11px] font-medium text-slate-400">{title}</p>
          {badge && (
            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
              {badge}
            </span>
          )}
        </div>
        <button
          onClick={copy}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-300" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* code with line numbers */}
      <div className="overflow-x-auto">
        <pre className="p-0 text-[12.5px] leading-[1.7]">
          <code className="flex">
            {/* line numbers gutter */}
            <span className="sticky left-0 select-none border-r border-white/[0.05] bg-[#0a0d16] py-4 pl-4 pr-3 text-right font-mono text-[11px] text-slate-600">
              {code.split("\n").map((_, i) => (
                <span key={i} className="block">
                  {i + 1}
                </span>
              ))}
            </span>
            {/* highlighted code */}
            <span className="flex-1 whitespace-pre py-4 pl-4 pr-6 font-mono text-slate-300">
              {highlight(code, lang)}
            </span>
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ── collapsible section ─────────────────────────────────────────── */

function Section({ title, icon: Icon, method, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const methodColors = {
    POST: "text-emerald-300",
    GET: "text-sky-300",
    DELETE: "text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03]"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        {method && (
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              methodColors[method] || "text-slate-300"
            }`}
          >
            {method}
          </span>
        )}
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 text-sm font-medium text-slate-200">{title}</span>
      </button>
      {open && <div className="space-y-4 border-t border-white/[0.05] px-5 py-5">{children}</div>}
    </div>
  );
}

/* ── main modal ──────────────────────────────────────────────────── */

export default function ApiDocsModal({ apiKey, origin, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const masked = `YOUR_API${"•".repeat(10)}`;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // ── snippets ────────────────────────────────────────────────────

  const postJsSnippet = `// Post a new comment from your website's contact / comment form
const response = await fetch("${origin}/api/comments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_SEC_KEY"
  },
  body: JSON.stringify({
    name: "Jane Cooper",
    email: "jane@example.com",
    message: "Loved your latest blog post!",
    websiteUrl: window.location.href,
    websiteName: document.title
  })
});

const data = await response.json();
console.log(data);
// { ok: true, message: "Comment received", comment: { id, name, email, ... } }`;

  const postCurlSnippet = `curl -X POST "${origin}/api/comments" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || "YOUR_API_SEC_KEY"}" \\
  -d '{
    "name": "Jane Cooper",
    "email": "jane@example.com",
    "message": "Loved your latest post!",
    "websiteUrl": "https://your-site.com/blog/post-1"
  }'`;

  const loginSnippet = `// Authenticate and receive a JWT token
const response = await fetch("${origin}/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_SEC_KEY"
  },
  body: JSON.stringify({
    username: "your_admin_username",
    password: "your_admin_password"
  })
});

const data = await response.json();
const token = data.token;
// Store this token — use it for GET / DELETE requests below
console.log(data);
// { ok: true, token: "eyJhbG...", user: { username: "admin", role: "admin" } }`;

  const getCommentsSnippet = `// Fetch all comments (requires JWT)
const response = await fetch("${origin}/api/comments", {
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  }
});

const data = await response.json();
console.log(data.comments);
// [{ id, name, email, message, websiteUrl, websiteName, createdAt }, ...]

// Filter by website
const filtered = await fetch("${origin}/api/comments?website=https://your-site.com", {
  headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
});

// Search by keyword
const searched = await fetch("${origin}/api/comments?q=hello", {
  headers: { "Authorization": "Bearer YOUR_JWT_TOKEN" }
});`;

  const getSingleSnippet = `// Fetch a single comment by ID (requires JWT)
const commentId = "abc123";
const response = await fetch("${origin}/api/comments/" + commentId, {
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  }
});

const data = await response.json();
console.log(data.comment);
// { id, name, email, message, websiteUrl, websiteName, createdAt }`;

  const deleteSnippet = `// Delete a comment by ID (requires JWT)
const commentId = "abc123";
const response = await fetch("${origin}/api/comments/" + commentId, {
  method: "DELETE",
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  }
});

const data = await response.json();
console.log(data);
// { ok: true, deleted: "abc123" }`;

  const getWebsitesSnippet = `// List all websites with comment counts (requires JWT)
const response = await fetch("${origin}/api/websites", {
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  }
});

const data = await response.json();
console.log(data.websites);
// [{ websiteUrl, websiteName, count, lastCommentAt, lastCommenter }, ...]
console.log(data.total);
// 42`;

  const getCurlSnippet = `curl -X GET "${origin}/api/comments" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by website
curl -X GET "${origin}/api/comments?website=https://your-site.com" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`;

  const deleteCurlSnippet = `curl -X DELETE "${origin}/api/comments/COMMENT_ID" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`;

  // ── Engagement: likes/dislikes + views (api-key only, no login) ──
  const KEY = apiKey || "YOUR_API_SEC_KEY";

  const likePostSnippet = `// When a visitor taps the like / dislike button on your website
await fetch("${origin}/api/likes", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${KEY}"
  },
  body: JSON.stringify({
    websiteUrl: window.location.href,
    type: "like"          // or "dislike"
    websiteName: document.title
    // amount: 1          // optional, defaults to 1
  })
});

// Response -> { ok: true, type: "like", likes: 185, dislikes: 6 }`;

  const likeGetSnippet = `// Read like / dislike counts (no login needed -- just the API key)
const response = await fetch("${origin}/api/likes", {
  headers: { "x-api-key": "${KEY}" }
});

const data = await response.json();
console.log(data.likes);
// [{ websiteUrl, websiteName, likes, dislikes }, ...]

// Counts for a single website
const one = await fetch("${origin}/api/likes?website=https://your-site.com", {
  headers: { "x-api-key": "${KEY}" }
});`;

  const viewPostSnippet = `// Fire this once per page view (e.g. on page load)
await fetch("${origin}/api/views", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${KEY}"
  },
  body: JSON.stringify({
    websiteUrl: window.location.href
    websiteName: document.title
  })
});

// Response -> { ok: true, message: "View recorded", count: 5231 }`;

  const viewGetSnippet = `// Read view counts (no login needed -- just the API key)
const response = await fetch("${origin}/api/views", {
  headers: { "x-api-key": "${KEY}" }
});

const data = await response.json();
console.log(data.views);
// [{ websiteUrl, websiteName, count, lastViewedAt }, ...]

// Views for a single website
const one = await fetch("${origin}/api/views?website=https://your-site.com", {
  headers: { "x-api-key": "${KEY}" }
});`;

  return (
    <div
      className="fixed inset-0 z-50 grid cursor-default place-items-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="anim-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="anim-pop relative flex max-h-[90vh] w-full max-w-3xl cursor-auto flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e17] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.07] p-6 pb-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <Send className="h-5 w-5 text-teal-300" />
              API Integration Guide
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Complete reference for all endpoints — drop these snippets into any project.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          {/* ── API key card ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <KeyRound className="h-4 w-4 text-teal-300" />
                API key placeholder — send your real key as the{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-teal-200">
                  x-api-key
                </code>{" "}
                header
              </p>
              <button
                onClick={() => setRevealed((r) => !r)}
                aria-label={revealed ? "Hide key" : "Reveal key"}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-400 transition hover:text-white"
              >
                {revealed ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 break-all rounded-lg bg-black/40 px-3 py-2 font-mono text-[12px] text-teal-200">
              {revealed ? "YOUR_API_SEC_KEY" : masked}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400/70" />
              POST is secured by <b className="text-slate-400">x-api-key</b>. GET & DELETE
              require a <b className="text-slate-400">JWT token</b> (obtained via login).
            </p>
          </div>

          {/* ── Endpoint sections ────────────────────────────────── */}

          {/* 1) LOGIN */}
          <Section title="Login — get JWT token" icon={Lock} method="POST" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Authenticate with the admin credentials configured in your{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-300">
                .env
              </code>{" "}
              file. Returns a JWT valid for 7 days — use it as{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                Authorization: Bearer &lt;token&gt;
              </code>
              .
            </p>
            <CodeBlock
              title="/api/auth/login"
              method="POST"
              badge="No API key needed"
              code={loginSnippet}
            />
          </Section>

          {/* 2) POST comment */}
          <Section
            title="Post a comment — from your websites"
            icon={Send}
            method="POST"
            defaultOpen={true}
          >
            <p className="text-xs leading-relaxed text-slate-400">
              Your other websites call this endpoint to submit comments/messages. Secured by the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                x-api-key
              </code>{" "}
              header. The server stamps{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-300">
                createdAt
              </code>{" "}
              automatically.
            </p>
            <CodeBlock
              title="/api/comments — JavaScript"
              method="POST"
              badge="x-api-key"
              code={postJsSnippet}
            />
            <CodeBlock
              title="/api/comments — cURL"
              method="POST"
              lang="bash"
              code={postCurlSnippet}
            />

            {/* field reference table */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="border-b border-white/[0.06] bg-[#0e1120] px-4 py-2.5">
                <p className="text-[11px] font-medium text-slate-400">📋 Request body fields</p>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Required</th>
                    <th className="px-4 py-2.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[
                    ["name", "yes", "Max 100 chars"],
                    ["email", "yes", "Validated format"],
                    ["message", "yes", 'Also accepts "comment". Max 2000 chars'],
                    ["websiteUrl", "yes", "Groups comments per website"],
                    ["websiteName", "no", "Defaults to URL hostname"],
                    ["createdAt", "auto", "Set by server — current time"],
                  ].map(([f, r, n]) => (
                    <tr key={f} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-4 py-2 font-mono text-cyan-200/90">{f}</td>
                      <td className="px-4 py-2">
                        {r === "yes" ? (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                            required
                          </span>
                        ) : r === "no" ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-slate-400">
                            optional
                          </span>
                        ) : (
                          <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-violet-300">
                            automatic
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 3) GET comments */}
          <Section title="List comments" icon={Send} method="GET" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Fetch all comments or filter by website URL or keyword. Requires a valid JWT in the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                Authorization
              </code>{" "}
              header.
            </p>
            <CodeBlock
              title="/api/comments — JavaScript"
              method="GET"
              badge="JWT required"
              code={getCommentsSnippet}
            />
            <CodeBlock
              title="/api/comments — cURL"
              method="GET"
              lang="bash"
              code={getCurlSnippet}
            />
          </Section>

          {/* 4) GET single comment */}
          <Section title="Get single comment" icon={Send} method="GET" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Fetch a specific comment by its ID. Requires JWT authentication.
            </p>
            <CodeBlock
              title="/api/comments/:id — JavaScript"
              method="GET"
              badge="JWT required"
              code={getSingleSnippet}
            />
          </Section>

          {/* 5) DELETE comment */}
          <Section title="Delete a comment" icon={Trash2} method="DELETE" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Permanently remove a comment by its ID. Requires JWT authentication. This action
              cannot be undone.
            </p>
            <CodeBlock
              title="/api/comments/:id — JavaScript"
              method="DELETE"
              badge="JWT required"
              code={deleteSnippet}
            />
            <CodeBlock
              title="/api/comments/:id — cURL"
              method="DELETE"
              lang="bash"
              code={deleteCurlSnippet}
            />
          </Section>

          {/* 6) GET websites */}
          <Section title="List websites" icon={Send} method="GET" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Get a summary of all websites that have received comments, including counts and
              latest activity. Requires JWT authentication.
            </p>
            <CodeBlock
              title="/api/websites — JavaScript"
              method="GET"
              badge="JWT required"
              code={getWebsitesSnippet}
            />
          </Section>

          {/* divider + group label for engagement endpoints */}
          <div className="!mt-7 flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Engagement · api-key only, no login
            </span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {/* POST LIKES */}
          <Section
            title="Record like / dislike"
            icon={ThumbsUp}
            method="POST"
            defaultOpen={false}
          >
            <p className="text-xs leading-relaxed text-slate-400">
              Call this when a visitor taps the like / dislike button on your website. Secured by
              the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                x-api-key
              </code>{" "}
              header — no JWT, no login required.
            </p>
            <CodeBlock
              title="/api/likes — JavaScript"
              method="POST"
              badge="x-api-key"
              code={likePostSnippet}
            />
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="border-b border-white/[0.06] bg-[#0e1120] px-4 py-2.5">
                <p className="text-[11px] font-medium text-slate-400">📋 POST body fields</p>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Required</th>
                    <th className="px-4 py-2.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[
                    ["websiteUrl", "yes", "Page the like came from"],
                    ["type", "yes", '"like" or "dislike" (defaults to like)'],
                    ["websiteName", "no", "Defaults to URL hostname"],
                    ["amount", "no", "Increment size (default 1)"],
                  ].map(([f, r, n]) => (
                    <tr key={f} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-4 py-2 font-mono text-cyan-200/90">{f}</td>
                      <td className="px-4 py-2">
                        {r === "yes" ? (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                            required
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-slate-400">
                            optional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* GET LIKES */}
          <Section
            title="Read like / dislike counts"
            icon={ThumbsUp}
            method="GET"
            defaultOpen={false}
          >
            <p className="text-xs leading-relaxed text-slate-400">
              Fetch per-website like / dislike counters. Secured by the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                x-api-key
              </code>{" "}
              header — no JWT, no login required. Use{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-300">
                ?website=
              </code>{" "}
              to filter to a single site.
            </p>
            <CodeBlock
              title="/api/likes — JavaScript"
              method="GET"
              badge="x-api-key"
              code={likeGetSnippet}
            />
          </Section>

          {/* POST VIEWS */}
          <Section title="Record a page view" icon={Eye} method="POST" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Fire this once per page load to count views. Secured by the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                x-api-key
              </code>{" "}
              header — no JWT, no login required.
            </p>
            <CodeBlock
              title="/api/views — JavaScript"
              method="POST"
              badge="x-api-key"
              code={viewPostSnippet}
            />
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="border-b border-white/[0.06] bg-[#0e1120] px-4 py-2.5">
                <p className="text-[11px] font-medium text-slate-400">📋 POST body fields</p>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400">
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Required</th>
                    <th className="px-4 py-2.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {[
                    ["websiteUrl", "yes", "Page being viewed"],
                    ["websiteName", "no", "Defaults to URL hostname"],
                    ["amount", "no", "Increment size (default 1)"],
                  ].map(([f, r, n]) => (
                    <tr key={f} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-4 py-2 font-mono text-cyan-200/90">{f}</td>
                      <td className="px-4 py-2">
                        {r === "yes" ? (
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
                            required
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-slate-400">
                            optional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* GET VIEWS */}
          <Section title="Read page view counts" icon={Eye} method="GET" defaultOpen={false}>
            <p className="text-xs leading-relaxed text-slate-400">
              Fetch per-website page view counters. Secured by the{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-teal-200">
                x-api-key
              </code>{" "}
              header — no JWT, no login required. Use{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-slate-300">
                ?website=
              </code>{" "}
              to filter to a single site.
            </p>
            <CodeBlock
              title="/api/views — JavaScript"
              method="GET"
              badge="x-api-key"
              code={viewGetSnippet}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
