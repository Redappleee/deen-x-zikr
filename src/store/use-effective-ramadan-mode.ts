"use client";

import { useEffect, useMemo, useState } from "react";
import { isRamadanNow } from "@/lib/ramadan";
import { useAppStore } from "@/store/use-app-store";

export function useEffectiveRamadanMode(): { ramadanMode: boolean; auto: boolean } {
  const auto = useAppStore((state) => state.ramadanModeAuto);
  const manualMode = useAppStore((state) => state.ramadanMode);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick(Date.now());
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const autoMode = useMemo(() => isRamadanNow(new Date(tick)), [tick]);

  return {
    ramadanMode: auto ? autoMode : manualMode,
    auto
  };
}
