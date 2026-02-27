"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { MoonStar } from "lucide-react";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/shared/glass-card";

const BG_VIDEO_URL = "https://cdn.coverr.co/videos/coverr-crescent-moon-over-desert-1579/1080p.mp4";
const AUTH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        reject(new Error(`${label} timed out`));
      }, timeoutMs);
    })
  ]);
}

function AuthPageContent(): React.JSX.Element {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") || "/dashboard", [searchParams]);

  const [signingUp, setSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (signingUp) {
        const signupRes = await withTimeout(
          fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
          }),
          AUTH_TIMEOUT_MS,
          "Signup"
        );

        if (!signupRes.ok) {
          const data = (await signupRes.json()) as { error?: string };
          throw new Error(data.error ?? "Signup failed");
        }
      }

      const response = await withTimeout(
        signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl
        }),
        AUTH_TIMEOUT_MS,
        "Sign in"
      );

      if (response?.error) {
        if (response.error === "CredentialsSignin") {
          throw new Error("Invalid credentials or database not reachable.");
        }
        throw new Error(response.error);
      }

      window.location.href = response?.url || callbackUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100/70 shadow-card dark:border-emerald-900/40">
        <video autoPlay className="absolute inset-0 h-full w-full object-cover" loop muted playsInline>
          <source src={BG_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-emerald-900/50 to-black/60" />
        <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-between p-6 text-slate-100">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold-300/60 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold-100">
            <MoonStar className="h-3.5 w-3.5 text-gold-200" />
            Deen X Zikr
          </div>

          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">A Calm Space For Your Iman</h1>
            <p className="mt-3 max-w-lg text-sm text-slate-200">
              Sign in to keep bookmarks, wishlist, and spiritual progress linked to your account.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
            <Image alt="Deen X Zikr Moon Logo" className="h-10 w-10 rounded-full bg-white/80 p-1" height={40} src="/icons/icon.svg" width={40} />
            <p className="text-xs text-slate-100">Continue with Google or email credentials.</p>
          </div>
        </div>
      </section>

      <GlassCard className="p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Account Access</p>

        {status === "authenticated" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Signed in as <span className="font-medium text-slate-800 dark:text-slate-100">{session.user?.name || session.user?.email}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white" href={callbackUrl || "/dashboard"}>
                Continue
              </Link>
              <button
                className="rounded-full border border-emerald-200 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-200"
                onClick={() => signOut({ callbackUrl: "/" })}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                googleEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "cursor-not-allowed border border-emerald-200 text-slate-500 dark:border-emerald-900/40 dark:text-slate-400"
              }`}
              disabled={!googleEnabled}
              onClick={() => signIn("google", { callbackUrl })}
              type="button"
            >
              <Image alt="Moon mark" className="h-5 w-5 rounded-full bg-white p-0.5" height={20} src="/icons/icon.svg" width={20} />
              Continue with Google
            </button>
            {!googleEnabled ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Google sign-in is unavailable. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.
              </p>
            ) : null}

            <div className="my-4 h-px bg-emerald-100 dark:bg-emerald-900/40" />

            <form className="space-y-3" onSubmit={handleSubmit}>
              {signingUp ? (
                <input
                  className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  required
                  type="text"
                  value={name}
                />
              ) : null}
              <input
                autoComplete="email"
                className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
              <input
                autoComplete={signingUp ? "new-password" : "current-password"}
                className="w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none dark:border-emerald-900/50 dark:bg-dark-700"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                type="password"
                value={password}
              />
              <div className="flex flex-wrap gap-2">
                <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white" disabled={loading} type="submit">
                  {loading ? "Please wait..." : signingUp ? "Create Account" : "Sign In"}
                </button>
                <button
                  className="rounded-full border border-emerald-100 px-4 py-2 text-sm dark:border-emerald-900/50"
                  onClick={() => setSigningUp((value) => !value)}
                  type="button"
                >
                  {signingUp ? "I already have an account" : "Create new account"}
                </button>
                {process.env.NEXT_PUBLIC_ENABLE_EMAIL_MAGIC_LINK === "true" ? (
                  <button
                    className="rounded-full border border-gold-300 px-4 py-2 text-xs text-gold-700 dark:border-gold-600/30 dark:text-gold-200"
                    onClick={() => signIn("nodemailer", { email, callbackUrl })}
                    type="button"
                  >
                    Email me a magic link
                  </button>
                ) : null}
              </div>
            </form>
          </>
        )}

        {message ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
      </GlassCard>
    </div>
  );
}

export default function AuthPage(): React.JSX.Element {
  return (
    <Suspense fallback={<GlassCard className="p-6">Loading authentication...</GlassCard>}>
      <AuthPageContent />
    </Suspense>
  );
}
