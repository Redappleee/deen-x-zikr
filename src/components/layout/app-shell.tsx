import { Header } from "@/components/layout/header";
import { RamadanExperience } from "@/components/layout/ramadan-experience";
import { RamadanTimingBanner } from "@/components/layout/ramadan-timing-banner";

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-islamic-pattern [background-size:22px_22px] opacity-40 dark:opacity-20" />
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 animate-float rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/30" />
      <div className="pointer-events-none absolute -right-24 top-44 h-80 w-80 animate-float rounded-full bg-gold-200/30 blur-3xl [animation-delay:1.5s] dark:bg-gold-600/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_center,var(--ramadan-glow),transparent_70%)]" />
      <Header />
      <RamadanTimingBanner />
      <RamadanExperience />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
