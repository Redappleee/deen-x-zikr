"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoonStar, X } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useEffectiveRamadanMode } from "@/store/use-effective-ramadan-mode";

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { ramadanMode, auto } = useEffectiveRamadanMode();
  const wasRamadan = useRef(ramadanMode);
  const [playMoonAnimation, setPlayMoonAnimation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!wasRamadan.current && ramadanMode) {
      setPlayMoonAnimation(true);
      const id = window.setTimeout(() => setPlayMoonAnimation(false), 900);
      wasRamadan.current = ramadanMode;
      return () => window.clearTimeout(id);
    }

    wasRamadan.current = ramadanMode;
    return undefined;
  }, [ramadanMode]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-emerald-100/60 bg-[var(--app-header)] backdrop-blur dark:border-emerald-900/40",
        ramadanMode ? "shadow-[0_0_32px_var(--ramadan-glow)]" : ""
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="text-lg font-semibold tracking-wide text-emerald-900 dark:text-emerald-50" href="/">
              Deen X Zikr
            </Link>
            {ramadanMode ? (
              <span className="hidden items-center gap-1 rounded-full border border-gold-300/70 bg-gold-200/30 px-2 py-0.5 text-[11px] font-medium text-gold-700 dark:border-gold-700/60 dark:bg-gold-700/20 dark:text-gold-200 lg:inline-flex">
                <motion.span
                  animate={playMoonAnimation ? { rotate: [0, 18, -10, 0], scale: [1, 1.25, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <MoonStar className="h-3 w-3" />
                </motion.span>
                {auto ? "Ramadan (Auto)" : "Ramadan"}
              </span>
            ) : null}
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                className={cn(
                  "rounded-full px-3 py-2 text-sm transition",
                  pathname === link.href
                    ? "bg-emerald-500 text-white"
                    : "text-emerald-900 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-dark-700"
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {status === "authenticated" ? (
              <>
                <Link className="hidden items-center gap-2 rounded-full border border-emerald-100 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200 lg:inline-flex" href="/dashboard">
                  {session.user?.image ? (
                    <Image
                      alt={session.user.name || "User"}
                      className="h-5 w-5 rounded-full object-cover"
                      height={20}
                      src={session.user.image}
                      width={20}
                    />
                  ) : (
                    <MoonStar className="h-3.5 w-3.5" />
                  )}
                  {session.user?.name?.split(" ")[0] || "Dashboard"}
                </Link>
                <button
                  className="hidden rounded-full border border-emerald-100 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200 lg:inline-flex"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  type="button"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                className="hidden rounded-full border border-emerald-100 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200 lg:inline-flex"
                onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
                type="button"
              >
                Log in
              </button>
            )}
            <button
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200 lg:hidden"
              onClick={() => setMobileMenuOpen((value) => !value)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-100/80 bg-white/70 p-2 backdrop-blur dark:border-emerald-900/40 dark:bg-dark-800/70 lg:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                className={cn(
                  "rounded-xl px-3 py-2 text-center text-xs transition",
                  pathname === link.href
                    ? "bg-emerald-500 text-white"
                    : "text-emerald-900 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-dark-700"
                )}
                href={link.href}
                key={`mobile-${link.href}`}
              >
                {link.label}
              </Link>
            ))}
            {status === "authenticated" ? (
              <button
                className="col-span-2 rounded-xl border border-emerald-100 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200"
                onClick={() => signOut({ callbackUrl: "/" })}
                type="button"
              >
                Log out
              </button>
            ) : (
              <button
                className="col-span-2 rounded-xl border border-emerald-100 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:text-emerald-200"
                onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
                type="button"
              >
                Log in
              </button>
            )}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
