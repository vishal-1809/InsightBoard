"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  LogIn,
  MessageSquareText,
  ShieldCheck,
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Login API is protected by the shared x-api-key as well.
          // The key is intentionally not shown anywhere in the UI.
          "x-api-key": "YOUR_API_SEC_KEY",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Login failed. Please try again.");
        setShakeKey((k) => k + 1);
        return;
      }
      router.replace("/");
    } catch {
      setError("Network error — please try again.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div className="grid-bg absolute inset-0" />
      <div className="anim-float-slow absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-teal-500/[0.14] blur-3xl" />
      <div className="anim-float-slower absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-violet-500/[0.12] blur-3xl" />
      <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-cyan-400/[0.08] blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* brand */}
        <div className="anim-fade-up mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-[#04222b] shadow-lg shadow-teal-500/20">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold tracking-tight">CommentDesk</p>
            <p className="text-xs text-slate-500">Unified comment inbox</p>
          </div>
        </div>

        {/* card */}
        <div
          className="glass anim-pop w-full max-w-sm rounded-3xl p-7 shadow-2xl shadow-black/40"
          style={{ animationDelay: "80ms" }}
        >
          <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to review comments from all your websites.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Username</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="admin"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-teal-300/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Password</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-600 focus:border-teal-300/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-teal-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 transition hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div
                key={shakeKey}
                className="anim-shake flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 py-2.5 text-sm font-semibold text-[#04222b] shadow-lg shadow-teal-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-600">
            Single admin account — credentials are configured via{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-slate-400">ADMIN_USERNAME</code>{" "}
            and{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-slate-400">ADMIN_PASSWORD</code>{" "}
            in the .env file.
          </p>
        </div>

        {/* feature hints */}
        <div
          className="anim-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500"
          style={{ animationDelay: "160ms" }}
        >
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5 text-teal-400/70" /> All your sites in one inbox
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400/70" /> API-key secured ingestion
          </span>
          <span className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-teal-400/70" /> JWT protected dashboard
          </span>
        </div>
      </div>
    </div>
  );
}
