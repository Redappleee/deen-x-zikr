"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/use-app-store";
import { useEffectiveRamadanMode } from "@/store/use-effective-ramadan-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const darkMode = useAppStore((state) => state.darkMode);
  const { ramadanMode } = useEffectiveRamadanMode();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("ramadan", ramadanMode);
  }, [ramadanMode]);

  return <>{children}</>;
}
