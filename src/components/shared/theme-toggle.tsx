"use client";

import { MoonStar, Sun } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";

export function ThemeToggle(): React.JSX.Element {
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);

  return (
    <button
      aria-label="Toggle theme"
      className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-surface px-3 py-2 text-sm text-emerald-900 transition hover:shadow-aura dark:border-emerald-900/60 dark:bg-dark-800 dark:text-emerald-50"
      onClick={() => setDarkMode(!darkMode)}
      type="button"
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      <span>{darkMode ? "Light" : "Dark"}</span>
    </button>
  );
}
