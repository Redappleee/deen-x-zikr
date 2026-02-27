import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function getHijriDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function toTimeLabel(raw: string): string {
  const [time] = raw.split(" ");
  return time;
}

export function secondsBetween(now: Date, target: Date): number {
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

export function formatSeconds(total: number): string {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parsePrayerDateTime(date: string, time: string): Date {
  const normalizedTime = time.split(" ")[0];
  return new Date(`${date}T${normalizedTime}:00`);
}

export function getProgressPercent(start: Date, end: Date, now = new Date()): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  const elapsed = now.getTime() - start.getTime();
  const value = (elapsed / total) * 100;
  return Math.min(100, Math.max(0, value));
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateKeyFromOffset(baseDate: Date, offsetDays: number): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateKey(date);
}

export function parseTimeToday(raw: string, now = new Date()): Date {
  const [time] = raw.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
