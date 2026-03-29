"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";

const FEATURE_PILLS = [
  { label: "Salah", className: "left-2 top-16 md:-left-6 md:top-14", delay: 0.55 },
  { label: "Quran", className: "right-4 top-10 md:-right-8 md:top-8", delay: 0.7 },
  { label: "Qibla", className: "left-8 bottom-16 md:-left-10 md:bottom-20", delay: 0.82 },
  { label: "Hadith", className: "right-3 bottom-20 md:-right-10 md:bottom-24", delay: 0.94 },
  { label: "Zikr", className: "left-1/2 top-full -translate-x-1/2 -translate-y-10 md:-translate-y-12", delay: 1.06 }
] as const;

const STAR_COUNT = 22;
const WELCOME_SEEN_KEY = "deen-x-zikr-welcome-seen";

export function WelcomeIntro(): React.JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18, mass: 0.8 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18, mass: 0.8 });
  const auraX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-140, 140]), { stiffness: 90, damping: 20 });
  const auraY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-120, 120]), { stiffness: 90, damping: 20 });
  const cursorGlow = useMotionTemplate`radial-gradient(circle at ${useTransform(pointerX, [-0.5, 0.5], ["20%", "80%"])} ${useTransform(pointerY, [-0.5, 0.5], ["20%", "80%"])}, rgba(212,175,106,0.18), transparent 28%)`;

  useEffect(() => {
    setMounted(true);
    const alreadySeen = window.sessionStorage.getItem(WELCOME_SEEN_KEY) === "1";
    if (alreadySeen) {
      setVisible(false);
      return;
    }

    window.sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, prefersReducedMotion ? 3000 : 5200);

    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;
    pointerX.set(normalizedX);
    pointerY.set(normalizedY);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const introDuration = useMemo(() => (prefersReducedMotion ? 0.75 : 1.35), [prefersReducedMotion]);
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, index) => ({
        id: index,
        left: 6 + ((index * 17) % 88),
        top: 8 + ((index * 11) % 44),
        size: index % 5 === 0 ? 4 : index % 3 === 0 ? 3 : 2,
        delay: index * 0.12,
        duration: 2.6 + (index % 5) * 0.45
      })),
    []
  );

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] overflow-hidden bg-[linear-gradient(180deg,rgba(248,244,236,0.99),rgba(238,247,241,0.985))] dark:bg-[linear-gradient(180deg,rgba(11,18,15,0.995),rgba(7,14,11,0.992))]"
          exit={{ opacity: 0, transition: { duration: prefersReducedMotion ? 0.6 : 1.25, ease: "easeOut" } }}
          initial={{ opacity: 0 }}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          style={{ perspective: 1800 }}
        >
          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.42, scale: 1 } : { opacity: [0.3, 0.55, 0.36], scale: [0.92, 1.05, 1] }}
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: cursorGlow }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.24 } : { opacity: [0.16, 0.34, 0.2], scale: [0.94, 1.12, 1] }}
            className="pointer-events-none absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-500/12"
            transition={{ duration: 3.4, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          />
          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.16 } : { opacity: [0.1, 0.22, 0.12], x: [-18, 18, -12], y: [0, 8, -4] }}
            className="pointer-events-none absolute right-16 top-24 h-52 w-52 rounded-full bg-gold-300/40 blur-3xl dark:bg-gold-500/12"
            transition={{ duration: 5.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          />

          <div className="pointer-events-none absolute inset-0">
            {stars.map((star) => (
              <motion.span
                animate={
                  prefersReducedMotion
                    ? { opacity: 0.5, scale: 1 }
                    : { opacity: [0.15, 0.95, 0.25], scale: [0.9, 1.25, 1], y: [0, -4, 0] }
                }
                className="absolute rounded-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.35)] dark:bg-gold-100/90 dark:shadow-[0_0_14px_rgba(255,231,176,0.3)]"
                initial={{ opacity: 0 }}
                key={star.id}
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`
                }}
                transition={{
                  delay: star.delay,
                  duration: star.duration,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.05]">
            <div className="absolute inset-0 bg-islamic-pattern [background-size:24px_24px]" />
          </div>

          <motion.div
            animate={
              prefersReducedMotion
                ? { opacity: 0.72, x: "62vw", y: 0 }
                : { opacity: [0, 0.95, 0.92, 0], x: ["-18vw", "12vw", "58vw", "112vw"], y: [12, -12, 8, 2], rotate: [-8, -2, 5, 8] }
            }
            className="pointer-events-none absolute top-10 z-[1] h-20 w-20"
            initial={{ opacity: 0, x: "-18vw", y: 12 }}
            transition={{ duration: prefersReducedMotion ? 1.2 : 4.2, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full bg-gold-300/90 shadow-[0_0_40px_rgba(212,175,106,0.45)] dark:bg-gold-300/85" />
            <div className="absolute left-6 top-1 h-16 w-16 rounded-full bg-[rgba(248,244,236,0.98)] dark:bg-[rgba(7,14,11,0.98)]" />
            <motion.div
              animate={prefersReducedMotion ? { opacity: 0.24 } : { opacity: [0.08, 0.28, 0.12], scale: [0.9, 1.2, 1] }}
              className="absolute -inset-3 rounded-full bg-gold-300/20 blur-2xl"
              transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
            />
          </motion.div>

          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.45 } : { opacity: [0.2, 0.5, 0.28], y: [14, 0, 4] }}
            className="pointer-events-none absolute left-1/2 top-16 h-24 w-24 -translate-x-1/2 rounded-full border border-gold-300/50"
            initial={{ opacity: 0, y: 18 }}
            style={{ boxShadow: "0 0 80px rgba(212,175,106,0.14)" }}
            transition={{ duration: 2.3, ease: "easeOut" }}
          >
            <motion.div
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
              className="absolute inset-[-14px] rounded-full border border-emerald-400/20"
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: -360 }}
              className="absolute inset-[-28px] rounded-full border border-gold-400/15"
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.85 } : { y: [16, -6, 0], opacity: [0, 1, 1] }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_center,rgba(15,157,88,0.12),transparent_58%)]"
            transition={{ duration: 2.1, ease: "easeOut" }}
          />

          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.42 } : { opacity: [0, 0.56, 0.4], y: [32, 0, 0] }}
            className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
            initial={{ opacity: 0, y: 32 }}
            transition={{ delay: 0.4, duration: 1.8, ease: "easeOut" }}
          >
            <svg
              aria-hidden="true"
              className="h-48 w-full text-emerald-950/10 dark:text-emerald-100/8 md:h-64"
              preserveAspectRatio="none"
              viewBox="0 0 1440 320"
            >
              <path
                d="M0 320V248H96V222H132V248H174V170H226L254 118L282 170H328V248H370V208H410V248H530V194H584V132H630V194H692V248H794V216H832V248H926V182H970L998 126L1024 182H1084V248H1168V214H1212V248H1288V174H1344L1372 118L1400 174H1440V320Z"
                fill="currentColor"
              />
              <path
                d="M254 118C254 101 267 88 284 88C301 88 314 101 314 118C314 135 301 148 284 148C267 148 254 135 254 118ZM996 126C996 109 1009 96 1026 96C1043 96 1056 109 1056 126C1056 143 1043 156 1026 156C1009 156 996 143 996 126ZM1368 118C1368 101 1381 88 1398 88C1415 88 1428 101 1428 118C1428 135 1415 148 1398 148C1381 148 1368 135 1368 118Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>

          <motion.div
            animate={prefersReducedMotion ? { opacity: 0.2 } : { opacity: [0, 0.32, 0.18], y: [50, 16, 22] }}
            className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden blur-[2px]"
            initial={{ opacity: 0, y: 50 }}
            transition={{ delay: 0.62, duration: 2.2, ease: "easeOut" }}
          >
            <svg
              aria-hidden="true"
              className="h-40 w-full text-gold-800/10 dark:text-gold-200/8 md:h-52"
              preserveAspectRatio="none"
              viewBox="0 0 1440 260"
            >
              <path
                d="M0 260V216H132V190H166V216H206V152H248L270 110L294 152H336V216H378V180H410V216H588V164H630V120H668V164H720V216H864V192H900V216H1014V170H1056L1078 126L1100 170H1150V216H1238V184H1280V216H1360V150H1400V260Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>

          <div className="relative flex min-h-screen items-center justify-center px-6 py-10 text-center">
            <motion.div
              animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: [0, 1, 1], scale: [0.88, 1.03, 1] }}
              className="relative w-full max-w-3xl"
              initial={{ opacity: 0, scale: 0.94 }}
              style={{ rotateX: prefersReducedMotion ? 0 : rotateX, rotateY: prefersReducedMotion ? 0 : rotateY, transformStyle: "preserve-3d" }}
              transition={{ duration: introDuration, ease: "easeOut" }}
            >
              <motion.div
                animate={prefersReducedMotion ? { opacity: 0.8 } : { opacity: [0.3, 0.9, 0.55], scale: [0.98, 1.02, 1] }}
                className="absolute inset-10 rounded-[2.8rem] bg-gradient-to-br from-emerald-300/20 via-transparent to-gold-200/20 blur-3xl dark:from-emerald-500/10 dark:to-gold-500/10"
                style={{ x: auraX, y: auraY, transform: "translateZ(-40px)" }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
              />

              <motion.div
                animate={prefersReducedMotion ? { opacity: 1 } : { y: [24, 0, 0], opacity: [0, 1, 1] }}
                className="relative overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/58 px-8 py-12 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_30px_100px_rgba(0,0,0,0.48)] md:px-12 md:py-14"
                initial={{ opacity: 0, y: 24 }}
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,106,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.15),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(212,175,106,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_72%)]" />
                <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30" />
                <motion.div
                  animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.18, 0.38, 0.22], scale: [0.94, 1.06, 1] }}
                  className="absolute right-10 top-8 h-24 w-24 rounded-full bg-gold-200/35 blur-2xl dark:bg-gold-500/10"
                  style={{ transform: "translateZ(18px)" }}
                  transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
                />

                <motion.div
                  animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { y: [16, 0, -2], opacity: [0, 1, 1] }}
                  className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/60 bg-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_60px_rgba(0,0,0,0.38)]"
                  initial={{ opacity: 0, y: 18 }}
                  style={{ transform: "translateZ(90px)" }}
                  transition={{ delay: 0.18, duration: 1.1, ease: "easeOut" }}
                >
                  <motion.div
                    animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
                    className="absolute inset-[-10px] rounded-full border border-emerald-400/25"
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    animate={prefersReducedMotion ? { rotate: 0 } : { rotate: -360 }}
                    className="absolute inset-[-22px] rounded-full border border-gold-400/20"
                    transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                  />
                  <Image alt="Deen X Zikr" className="relative h-16 w-16 rounded-full" height={64} src="/icons/icon.svg" width={64} />
                </motion.div>

                {FEATURE_PILLS.map((pill) => (
                  <motion.div
                    animate={prefersReducedMotion ? { opacity: 0.85, y: 0 } : { opacity: [0, 1, 0.92], y: [18, 0, -4] }}
                    className={`absolute ${pill.className} rounded-full border border-white/55 bg-white/68 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-emerald-800 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:text-emerald-100 dark:shadow-[0_18px_40px_rgba(0,0,0,0.36)]`}
                    initial={{ opacity: 0, y: 18 }}
                    key={pill.label}
                    style={{ transform: "translateZ(70px)" }}
                    transition={{ delay: pill.delay, duration: 0.95, ease: "easeOut" }}
                  >
                    {pill.label}
                  </motion.div>
                ))}

                <motion.p
                  animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1], y: [16, 0, 0] }}
                  className="relative mt-8 text-xs uppercase tracking-[0.5em] text-emerald-700 dark:text-emerald-300"
                  initial={{ opacity: 0, y: 16 }}
                  style={{ transform: "translateZ(62px)" }}
                  transition={{ delay: 0.32, duration: 0.95, ease: "easeOut" }}
                >
                  Assalamu Alaikum
                </motion.p>

                <motion.h1
                  animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1], y: [24, 0, -3] }}
                  className="relative mt-4 text-4xl font-semibold tracking-[0.08em] text-emerald-950 dark:text-emerald-50 md:text-6xl"
                  initial={{ opacity: 0, y: 24 }}
                  style={{ transform: "translateZ(110px)" }}
                  transition={{ delay: 0.46, duration: 1.05, ease: "easeOut" }}
                >
                  Deen X Zikr
                </motion.h1>

                <motion.p
                  animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1], y: [18, 0, -2] }}
                  className="relative mx-auto mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base"
                  initial={{ opacity: 0, y: 18 }}
                  style={{ transform: "translateZ(84px)" }}
                  transition={{ delay: 0.64, duration: 1.05, ease: "easeOut" }}
                >
                  A calm digital sanctuary for salah, Quran, qibla, hadith, and zikr, now opening with depth, light, and presence.
                </motion.p>

                <motion.div
                  animate={prefersReducedMotion ? { opacity: 0.75, scaleX: 1 } : { scaleX: [0.25, 1], opacity: [0, 1, 0.82] }}
                  className="relative mx-auto mt-8 h-px w-48 bg-gradient-to-r from-transparent via-gold-500/90 to-transparent"
                  initial={{ opacity: 0, scaleX: 0.25 }}
                  style={{ transform: "translateZ(64px)" }}
                  transition={{ delay: 0.82, duration: 1.2, ease: "easeOut" }}
                />

                <motion.div
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0, 1, 1], y: [18, 0, 0] }}
                  className="relative mt-8 grid gap-3 md:grid-cols-3"
                  initial={{ opacity: 0, y: 18 }}
                  style={{ transform: "translateZ(56px)" }}
                  transition={{ delay: 0.96, duration: 1.05, ease: "easeOut" }}
                >
                  <div className="rounded-2xl border border-emerald-100/80 bg-white/58 px-4 py-3 text-left dark:border-emerald-900/40 dark:bg-dark-900/30">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Prayer Rhythm</p>
                    <p className="mt-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">Live salah guidance and calm next-prayer focus.</p>
                  </div>
                  <div className="rounded-2xl border border-gold-200/70 bg-white/58 px-4 py-3 text-left dark:border-gold-700/30 dark:bg-dark-900/30">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Daily Presence</p>
                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">Quran, hadith, and dhikr in one focused spiritual flow.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100/80 bg-white/58 px-4 py-3 text-left dark:border-emerald-900/40 dark:bg-dark-900/30">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Immersive Opening</p>
                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">3D motion, mosque depth, and light that follows your cursor.</p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
