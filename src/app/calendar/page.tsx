"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MoonStar, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { daysUntilHijriDate, getHijriParts, isRamadanNow } from "@/lib/ramadan";
import { getHijriDate } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HIJRI_MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qadah",
  "Dhu al-Hijjah"
] as const;

const ISLAMIC_EVENTS = [
  { title: "Islamic New Year", month: 1, day: 1, description: "The beginning of a new Hijri year." },
  { title: "Mawlid", month: 3, day: 12, description: "Traditionally marked in many communities as the Prophet's birth month remembrance." },
  { title: "Laylat al-Miraj", month: 7, day: 27, description: "A night many Muslims associate with Isra and Mi'raj remembrance." },
  { title: "Mid-Sha'ban", month: 8, day: 15, description: "A spiritually reflective night observed by many communities." },
  { title: "Ramadan Begins", month: 9, day: 1, description: "The month of fasting, Quran, and increased worship." },
  { title: "Laylat al-Qadr Window", month: 9, day: 27, description: "A high-reward night sought in the last ten nights of Ramadan." },
  { title: "Eid al-Fitr", month: 10, day: 1, description: "Celebration marking the completion of Ramadan." },
  { title: "Day of Arafah", month: 12, day: 9, description: "A day of dua and fasting for non-pilgrims." },
  { title: "Eid al-Adha", month: 12, day: 10, description: "Festival of sacrifice during the days of Hajj." }
] as const;

type CalendarCell = {
  date: Date;
  gregorianDay: number;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  isFriday: boolean;
  events: Array<(typeof ISLAMIC_EVENTS)[number]>;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function getEventMatches(hijriMonth: number, hijriDay: number): Array<(typeof ISLAMIC_EVENTS)[number]> {
  return ISLAMIC_EVENTS.filter((event) => event.month === hijriMonth && event.day === hijriDay);
}

function buildMonthCells(anchorMonth: Date, today: Date): CalendarCell[] {
  const monthStart = startOfMonth(anchorMonth);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const hijri = getHijriParts(date);

    return {
      date,
      gregorianDay: date.getDate(),
      hijriDay: hijri.day,
      hijriMonth: hijri.month,
      hijriYear: hijri.year,
      isToday: sameDay(date, today),
      isCurrentMonth: date.getMonth() === anchorMonth.getMonth(),
      isFriday: date.getDay() === 5,
      events: getEventMatches(hijri.month, hijri.day)
    };
  });
}

function getHijriMonthName(month: number): string {
  return HIJRI_MONTH_NAMES[month - 1] ?? `Month ${month}`;
}

function formatGregorianLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getDisplayedHijriRange(cells: CalendarCell[]): string {
  const uniqueMonths = Array.from(new Set(cells.filter((cell) => cell.isCurrentMonth).map((cell) => `${cell.hijriMonth}-${cell.hijriYear}`)));
  return uniqueMonths
    .map((value) => {
      const [month, year] = value.split("-").map(Number);
      return `${getHijriMonthName(month)} ${year}`;
    })
    .join(" / ");
}

function getNextIslamicEvent(now: Date): { title: string; inDays: number; description: string } {
  const next = ISLAMIC_EVENTS.map((event) => ({
    title: event.title,
    inDays: daysUntilHijriDate(event.month, event.day, now),
    description: event.description
  })).sort((a, b) => a.inDays - b.inDays)[0];

  return next;
}

export default function IslamicCalendarPage(): React.JSX.Element {
  const today = useMemo(() => new Date(), []);
  const [displayedMonth, setDisplayedMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);

  const monthCells = useMemo(() => buildMonthCells(displayedMonth, today), [displayedMonth, today]);
  const selectedCell = useMemo(
    () => monthCells.find((cell) => sameDay(cell.date, selectedDate)) ?? buildMonthCells(selectedDate, today).find((cell) => sameDay(cell.date, selectedDate)),
    [monthCells, selectedDate, today]
  );

  const nextEvent = useMemo(() => getNextIslamicEvent(today), [today]);
  const displayedHijriRange = useMemo(() => getDisplayedHijriRange(monthCells), [monthCells]);

  const monthStats = useMemo(() => {
    const inMonth = monthCells.filter((cell) => cell.isCurrentMonth);
    const fridayCount = inMonth.filter((cell) => cell.isFriday).length;
    const eventCount = inMonth.filter((cell) => cell.events.length > 0).length;
    const ramadanDays = inMonth.filter((cell) => cell.hijriMonth === 9).length;

    return { fridayCount, eventCount, ramadanDays };
  }, [monthCells]);

  const selectedHijri = selectedCell
    ? `${selectedCell.hijriDay} ${getHijriMonthName(selectedCell.hijriMonth)} ${selectedCell.hijriYear} AH`
    : getHijriDate(selectedDate);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Islamic Calendar"
        subtitle="A fuller Hijri calendar with month navigation, day details, Islamic event markers, and spiritual context."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Today</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{getHijriDate(today)}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatGregorianLong(today)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Displayed Month</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{getMonthLabel(displayedMonth)}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayedHijriRange}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next Islamic Event</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{nextEvent.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{nextEvent.inDays === 0 ? "Today" : `In ${nextEvent.inDays} days`}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Month Signals</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-100">
            {monthStats.fridayCount} Jumuah • {monthStats.eventCount} Events
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{monthStats.ramadanDays > 0 ? `${monthStats.ramadanDays} Ramadan day(s) in view` : "No Ramadan dates in this visible month"}</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                <CalendarDays className="h-4 w-4" />
                Calendar Navigator
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{getMonthLabel(displayedMonth)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{displayedHijriRange}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-emerald-100 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200"
                onClick={() => setDisplayedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                className="rounded-full border border-gold-300 px-4 py-2 text-sm text-gold-700 dark:border-gold-700/40 dark:text-gold-200"
                onClick={() => {
                  setDisplayedMonth(startOfMonth(today));
                  setSelectedDate(today);
                }}
                type="button"
              >
                Today
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-emerald-100 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200"
                onClick={() => setDisplayedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                type="button"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthCells.map((cell) => {
              const isSelected = sameDay(cell.date, selectedDate);
              return (
                <button
                  className={`min-h-[86px] rounded-2xl border p-2 text-left transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 shadow-[0_12px_28px_rgba(15,157,88,0.12)] dark:border-emerald-400 dark:bg-emerald-900/30"
                      : cell.isCurrentMonth
                        ? "border-emerald-100/80 bg-white/70 dark:border-emerald-900/40 dark:bg-dark-800/60"
                        : "border-transparent bg-slate-50/50 opacity-55 dark:bg-dark-900/20"
                  }`}
                  key={cell.date.toISOString()}
                  onClick={() => setSelectedDate(cell.date)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${cell.isToday ? "text-emerald-700 dark:text-emerald-200" : "text-slate-800 dark:text-slate-100"}`}>
                      {cell.gregorianDay}
                    </span>
                    {cell.isFriday ? <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-gold-700 dark:bg-gold-700/20 dark:text-gold-200">Fri</span> : null}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">H {cell.hijriDay}</p>
                  {cell.events.length ? (
                    <div className="mt-2 space-y-1">
                      {cell.events.slice(0, 2).map((event) => (
                        <p className="rounded-full bg-gold-100 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-gold-700 dark:bg-gold-700/20 dark:text-gold-200" key={event.title}>
                          {event.title}
                        </p>
                      ))}
                    </div>
                  ) : cell.isToday ? (
                    <p className="mt-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Today
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-600">
              <MoonStar className="h-4 w-4" />
              Selected Day
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatGregorianLong(selectedDate)}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedHijri}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Hijri Month</p>
                <p className="mt-2 text-lg font-semibold text-emerald-800 dark:text-emerald-100">
                  {selectedCell ? getHijriMonthName(selectedCell.hijriMonth) : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-900/40">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Spiritual Note</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {selectedCell?.isFriday
                    ? "Jumuah: a blessed day for salawat, dua, and Surah Al-Kahf."
                    : selectedCell?.events.length
                      ? selectedCell.events[0].description
                      : isRamadanNow(selectedDate)
                        ? "A Ramadan day. Focus on fasting, Quran, and sincerity."
                        : "A regular day to organize worship, reminders, and reflection."}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selectedCell?.events.length ? (
                selectedCell.events.map((event) => (
                  <div className="rounded-2xl border border-gold-300/50 bg-gold-100/20 p-3 dark:border-gold-700/40 dark:bg-gold-900/10" key={event.title}>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-100 p-3 text-sm text-slate-600 dark:border-emerald-900/40 dark:text-slate-300">
                  No major Islamic event is tagged for this date, but it remains a good day to schedule worship, reading, and reflection.
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Hijri Months
            </p>
            <div className="mt-4 grid gap-2">
              {HIJRI_MONTH_NAMES.map((monthName, index) => {
                const monthNumber = index + 1;
                const active = selectedCell?.hijriMonth === monthNumber;
                return (
                  <div
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                      active
                        ? "border-emerald-400 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100"
                        : "border-emerald-100 text-slate-600 dark:border-emerald-900/40 dark:text-slate-300"
                    }`}
                    key={monthName}
                  >
                    <span>{monthName}</span>
                    <span>{monthNumber}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-600">
          <MoonStar className="h-4 w-4" />
          Islamic Event Timeline
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {ISLAMIC_EVENTS.map((event) => {
            const inDays = daysUntilHijriDate(event.month, event.day, today);
            return (
              <div className="rounded-2xl border border-gold-300/50 bg-gold-100/20 p-4 dark:border-gold-700/40 dark:bg-gold-900/10" key={event.title}>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gold-700 dark:text-gold-200">
                  {getHijriMonthName(event.month)} {event.day}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{event.description}</p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{inDays === 0 ? "Today" : `In ${inDays} days`}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
