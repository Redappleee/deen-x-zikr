import { cn } from "@/lib/utils";

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }): React.JSX.Element {
  return (
    <div
      className={cn(
        "theme-surface rounded-3xl border border-white/60 bg-surface/90 p-5 shadow-card backdrop-blur dark:border-emerald-900/40 dark:bg-dark-800/80",
        className
      )}
    >
      {children}
    </div>
  );
}
