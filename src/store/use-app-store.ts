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

export const TRACKED_PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type TrackedPrayerName = (typeof TRACKED_PRAYER_NAMES)[number];
export type PrayerCompletionDay = Record<TrackedPrayerName, boolean>;
export type NotificationPrayerPrefs = Record<TrackedPrayerName, boolean>;

function emptyIbadahDay(): IbadahDay {
  return {
    fajrOnTime: false,
    readQuran: false,
    makeDua: false,
    charity: false
  };
}

function normalizeIbadahDay(day?: Partial<IbadahDay> | null): IbadahDay {
  return {
    fajrOnTime: Boolean(day?.fajrOnTime),
    readQuran: Boolean(day?.readQuran),
    makeDua: Boolean(day?.makeDua),
    charity: Boolean(day?.charity)
  };
}

function emptyPrayerCompletionDay(): PrayerCompletionDay {
  return {
    Fajr: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false
  };
}

function buildPrayerCompletionDay(count = 0): PrayerCompletionDay {
  const safeCount = Math.max(0, Math.min(TRACKED_PRAYER_NAMES.length, Math.floor(count)));
  return TRACKED_PRAYER_NAMES.reduce((acc, prayer, index) => {
    acc[prayer] = index < safeCount;
    return acc;
  }, emptyPrayerCompletionDay());
}

function countCompletedPrayers(day: PrayerCompletionDay): number {
  return TRACKED_PRAYER_NAMES.filter((prayer) => day[prayer]).length;
}

function defaultNotificationPrayerPrefs(): NotificationPrayerPrefs {
  return {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true
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
  prayerCompletionByDate: Record<string, PrayerCompletionDay>;
  quranGoalPagesDaily: number;
  quranPagesReadToday: number;
  quranGoalDate?: string;
  onboardingCompleted: boolean;
  notificationLeadMinutes: number;
  notificationPrayerPrefs: NotificationPrayerPrefs;
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
  setPrayerCompleted: (prayer: TrackedPrayerName, completed: boolean) => void;
  togglePrayerCompleted: (prayer: TrackedPrayerName) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setNotificationLeadMinutes: (value: number) => void;
  setNotificationPrayerEnabled: (prayer: TrackedPrayerName, enabled: boolean) => void;
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
      prayerCompletionByDate: {},
      quranGoalPagesDaily: 4,
      quranPagesReadToday: 0,
      quranGoalDate: undefined,
      onboardingCompleted: false,
      notificationLeadMinutes: 10,
      notificationPrayerPrefs: defaultNotificationPrayerPrefs(),
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
          const currentCount = state.dailyProgressDate === today ? state.prayersCompletedToday : 0;
          const currentDay = state.prayerCompletionByDate[today] ?? buildPrayerCompletionDay(currentCount);
          const step = Math.floor(delta);

          if (step === 0) {
            return {
              dailyProgressDate: today,
              prayersCompletedToday: currentCount,
              prayerCompletionByDate: {
                ...state.prayerCompletionByDate,
                [today]: currentDay
              }
            };
          }

          const nextDay = { ...currentDay };
          if (step > 0) {
            const nextPrayer = TRACKED_PRAYER_NAMES.find((prayer) => !nextDay[prayer]);
            if (nextPrayer) nextDay[nextPrayer] = true;
          } else {
            const previousPrayer = [...TRACKED_PRAYER_NAMES].reverse().find((prayer) => nextDay[prayer]);
            if (previousPrayer) nextDay[previousPrayer] = false;
          }

          const next = countCompletedPrayers(nextDay);
          return {
            dailyProgressDate: today,
            prayersCompletedToday: next,
            prayerCompletionByDate: {
              ...state.prayerCompletionByDate,
              [today]: nextDay
            }
          };
        }),
      setPrayerCompleted: (prayer, completed) =>
        set((state) => {
          const today = getLocalDateKey();
          const currentDay = state.prayerCompletionByDate[today] ?? buildPrayerCompletionDay(state.dailyProgressDate === today ? state.prayersCompletedToday : 0);
          const nextDay = {
            ...currentDay,
            [prayer]: completed
          };

          return {
            dailyProgressDate: today,
            prayersCompletedToday: countCompletedPrayers(nextDay),
            prayerCompletionByDate: {
              ...state.prayerCompletionByDate,
              [today]: nextDay
            }
          };
        }),
      togglePrayerCompleted: (prayer) =>
        set((state) => {
          const today = getLocalDateKey();
          const currentDay = state.prayerCompletionByDate[today] ?? buildPrayerCompletionDay(state.dailyProgressDate === today ? state.prayersCompletedToday : 0);
          const nextDay = {
            ...currentDay,
            [prayer]: !currentDay[prayer]
          };

          return {
            dailyProgressDate: today,
            prayersCompletedToday: countCompletedPrayers(nextDay),
            prayerCompletionByDate: {
              ...state.prayerCompletionByDate,
              [today]: nextDay
            }
          };
        }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
      setNotificationLeadMinutes: (value) =>
        set({
          notificationLeadMinutes: Math.max(0, Math.min(60, Math.floor(value)))
        }),
      setNotificationPrayerEnabled: (prayer, enabled) =>
        set((state) => ({
          notificationPrayerPrefs: {
            ...state.notificationPrayerPrefs,
            [prayer]: enabled
          }
        })),
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
          const todaysPrayerDay =
            state.prayerCompletionByDate[today] ?? buildPrayerCompletionDay(state.dailyProgressDate === today ? state.prayersCompletedToday : 0);

          if (state.dailyProgressDate === today && state.quranGoalDate === today) {
            return {
              prayerCompletionByDate:
                state.prayerCompletionByDate[today] && countCompletedPrayers(state.prayerCompletionByDate[today]) === state.prayersCompletedToday
                  ? state.prayerCompletionByDate
                  : {
                      ...state.prayerCompletionByDate,
                      [today]: todaysPrayerDay
                    }
            };
          }

          const nextPrayerCompletionByDate = {
            ...state.prayerCompletionByDate,
            [today]: emptyPrayerCompletionDay()
          };

          return {
            dailyProgressDate: today,
            prayersCompletedToday: 0,
            prayerCompletionByDate: nextPrayerCompletionByDate,
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
          const current = normalizeIbadahDay(state.ibadahByDate[today] ?? emptyIbadahDay());
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
