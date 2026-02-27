"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getLocalDateKey } from "@/lib/utils";

export type IbadahTask = "fajrOnTime" | "readQuran" | "makeDua" | "charity";

export type IbadahDay = {
  fajrOnTime: boolean;
  readQuran: boolean;
  makeDua: boolean;
  charity: boolean;
};

export type ParaReadPosition = {
  verseKey: string;
  wordId: number;
};

function emptyIbadahDay(): IbadahDay {
  return {
    fajrOnTime: false,
    readQuran: false,
    makeDua: false,
    charity: false
  };
}

type AppState = {
  darkMode: boolean;
  ramadanMode: boolean;
  ramadanModeAuto: boolean;
  prayerMethod: number;
  preferredLocation?: {
    label: string;
    lat: number;
    lng: number;
    type?: string;
  };
  bookmarkedAyahs: string[];
  favoriteHadith: string[];
  lastReadSurah?: number;
  lastReadAyah?: number;
  zikrStreak: number;
  zikrCountToday: number;
  lastZikrDate?: string;
  dailyProgressDate?: string;
  prayersCompletedToday: number;
  quranGoalPagesDaily: number;
  quranPagesReadToday: number;
  quranGoalDate?: string;
  ibadahByDate: Record<string, IbadahDay>;
  paraReadProgress: Record<number, ParaReadPosition>;
  notificationsEnabled: boolean;
  setDarkMode: (value: boolean) => void;
  setRamadanMode: (value: boolean) => void;
  setRamadanModeAuto: (value: boolean) => void;
  setPrayerMethod: (value: number) => void;
  setPreferredLocation: (location: AppState["preferredLocation"]) => void;
  toggleBookmarkAyah: (id: string) => void;
  toggleFavoriteHadith: (id: string) => void;
  setLastReadSurah: (surah: number) => void;
  setLastReadAyah: (ayah: number) => void;
  incrementZikr: () => void;
  adjustZikrCount: (delta: number) => void;
  resetDailyZikr: () => void;
  adjustPrayersCompleted: (delta: number) => void;
  setQuranGoalPagesDaily: (value: number) => void;
  adjustQuranPagesRead: (delta: number) => void;
  ensureQuranProgressDate: () => void;
  ensureDailyProgressDate: () => void;
  setParaReadProgress: (paraId: number, position: ParaReadPosition) => void;
  toggleIbadahTask: (task: IbadahTask) => void;
  setNotificationsEnabled: (value: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      ramadanMode: false,
      ramadanModeAuto: true,
      prayerMethod: 3,
      preferredLocation: undefined,
      bookmarkedAyahs: [],
      favoriteHadith: [],
      lastReadSurah: 1,
      lastReadAyah: 1,
      zikrStreak: 0,
      zikrCountToday: 0,
      lastZikrDate: undefined,
      dailyProgressDate: undefined,
      prayersCompletedToday: 0,
      quranGoalPagesDaily: 4,
      quranPagesReadToday: 0,
      quranGoalDate: undefined,
      ibadahByDate: {},
      paraReadProgress: {},
      notificationsEnabled: false,
      setDarkMode: (value) => set({ darkMode: value }),
      setRamadanMode: (value) => set({ ramadanMode: value }),
      setRamadanModeAuto: (value) => set({ ramadanModeAuto: value }),
      setPrayerMethod: (value) => set({ prayerMethod: value }),
      setPreferredLocation: (location) => set({ preferredLocation: location }),
      toggleBookmarkAyah: (id) =>
        set((state) => ({
          bookmarkedAyahs: state.bookmarkedAyahs.includes(id)
            ? state.bookmarkedAyahs.filter((item) => item !== id)
            : [...state.bookmarkedAyahs, id]
        })),
      toggleFavoriteHadith: (id) =>
        set((state) => ({
          favoriteHadith: state.favoriteHadith.includes(id)
            ? state.favoriteHadith.filter((item) => item !== id)
            : [...state.favoriteHadith, id]
        })),
      setLastReadSurah: (surah) => set({ lastReadSurah: surah }),
      setLastReadAyah: (ayah) => set({ lastReadAyah: Math.max(1, Math.floor(ayah)) }),
      incrementZikr: () =>
        set((state) => {
          const today = getLocalDateKey();
          const previous = state.lastZikrDate;
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = getLocalDateKey(yesterdayDate);

          if (!previous) {
            return { zikrCountToday: 1, zikrStreak: 1, lastZikrDate: today };
          }

          if (previous === today) {
            return { zikrCountToday: state.zikrCountToday + 1 };
          }

          const streak = previous === yesterday ? state.zikrStreak + 1 : 1;
          return { zikrCountToday: 1, zikrStreak: streak, lastZikrDate: today };
        }),
      adjustZikrCount: (delta) =>
        set((state) => {
          const step = Math.floor(delta);
          if (step === 0) return {};

          const today = getLocalDateKey();
          const previous = state.lastZikrDate;
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = getLocalDateKey(yesterdayDate);

          if (step > 0) {
            if (!previous) {
              return { zikrCountToday: step, zikrStreak: 1, lastZikrDate: today };
            }

            if (previous === today) {
              return { zikrCountToday: Math.max(0, state.zikrCountToday + step), lastZikrDate: today };
            }

            const streak = previous === yesterday ? state.zikrStreak + 1 : 1;
            return { zikrCountToday: step, zikrStreak: streak, lastZikrDate: today };
          }

          if (previous !== today) {
            return {};
          }

          return {
            zikrCountToday: Math.max(0, state.zikrCountToday + step),
            lastZikrDate: today
          };
        }),
      resetDailyZikr: () => set({ zikrCountToday: 0 }),
      adjustPrayersCompleted: (delta) =>
        set((state) => {
          const today = getLocalDateKey();
          const current = state.dailyProgressDate === today ? state.prayersCompletedToday : 0;
          const next = Math.max(0, Math.min(5, current + Math.floor(delta)));
          return {
            dailyProgressDate: today,
            prayersCompletedToday: next
          };
        }),
      setQuranGoalPagesDaily: (value) =>
        set({
          quranGoalPagesDaily: Math.max(1, Math.floor(value))
        }),
      adjustQuranPagesRead: (delta) =>
        set((state) => {
          const today = getLocalDateKey();
          const current = state.quranGoalDate === today ? state.quranPagesReadToday : 0;
          const next = Math.max(0, current + Math.floor(delta));
          return {
            quranGoalDate: today,
            quranPagesReadToday: next
          };
        }),
      ensureQuranProgressDate: () =>
        set((state) => {
          const today = getLocalDateKey();
          if (state.quranGoalDate === today) {
            return {};
          }
          return {
            quranGoalDate: today,
            quranPagesReadToday: 0
          };
        }),
      ensureDailyProgressDate: () =>
        set((state) => {
          const today = getLocalDateKey();
          if (state.dailyProgressDate === today && state.quranGoalDate === today) {
            return {};
          }
          return {
            dailyProgressDate: today,
            prayersCompletedToday: 0,
            quranGoalDate: today,
            quranPagesReadToday: state.quranGoalDate === today ? state.quranPagesReadToday : 0
          };
        }),
      setParaReadProgress: (paraId, position) =>
        set((state) => ({
          paraReadProgress: {
            ...state.paraReadProgress,
            [paraId]: position
          }
        })),
      toggleIbadahTask: (task) =>
        set((state) => {
          const today = getLocalDateKey();
          const current = state.ibadahByDate[today] ?? emptyIbadahDay();
          const next = {
            ...current,
            [task]: !current[task]
          };

          return {
            ibadahByDate: {
              ...state.ibadahByDate,
              [today]: next
            }
          };
        }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value })
    }),
    {
      name: "deen-x-zikr-store"
    }
  )
);
