"use client";

import { useMemo } from "react";
import { CalendarDays, MoonStar } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { daysUntilHijriDate, getHijriParts } from "@/lib/ramadan";
import { getHijriDate } from "@/lib/utils";

type CalendarDay = {
  date: Date;
  gregorianDay: number;
  hijriDay: number;
  hijriMonth: number;
  isToday: boolean;
};

function buildMonthDays(now: Date): CalendarDay[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }).map((_, index) => {
    const date = new Date(year, month, index + 1);
    const hijri = getHijriParts(date);

    return {
      date,
      gregorianDay: index + 1,
      hijriDay: hijri.day,
      hijriMonth: hijri.month,
      isToday: date.toDateString() === now.toDateString()
    };
  });
}

export default function IslamicCalendarPage(): React.JSX.Element {
  const now = useMemo(() => new Date(), []);
  const monthDays = useMemo(() => buildMonthDays(now), [now]);

  const events = useMemo(() => {
    const ramadan = daysUntilHijriDate(9, 1, now);
    const eidFitr = daysUntilHijriDate(10, 1, now);
    const eidAdha = daysUntilHijriDate(12, 10, now);

    return [
      { title: "Ramadan", inDays: ramadan },
      { title: "Eid al-Fitr", inDays: eidFitr },
      { title: "Eid al-Adha", inDays: eidAdha }
    ];
  }, [now]);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Islamic Calendar"
        subtitle="Track Hijri and Gregorian dates side by side with upcoming Islamic events."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            <CalendarDays className="h-4 w-4" />
            {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Today: {now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} • {getHijriDate(now)}</p>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: new Date(now.getFullYear(), now.getMonth(), 1).getDay() }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {monthDays.map((day) => (
              <div
                className={`rounded-2xl border p-2 text-center ${day.isToday ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/30" : "border-emerald-100/80 bg-white/70 dark:border-emerald-900/40 dark:bg-dark-800/60"}`}
                key={day.gregorianDay}
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{day.gregorianDay}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">H {day.hijriDay}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-600">
            <MoonStar className="h-4 w-4" />
            Upcoming Events
          </p>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div className="rounded-2xl border border-gold-300/50 bg-gold-100/20 p-3 dark:border-gold-700/40 dark:bg-gold-900/10" key={event.title}>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{event.inDays === 0 ? "Today" : `In ${event.inDays} days`}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
