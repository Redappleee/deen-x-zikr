export function getHijriMonth(date = new Date()): number {
  return getHijriParts(date).month;
}

export function getHijriParts(date = new Date()): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).formatToParts(date);

  const day = Number.parseInt(parts.find((part) => part.type === "day")?.value ?? "", 10) || 0;
  const month = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10) || 0;
  const year = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10) || 0;

  return { day, month, year };
}

export function daysUntilHijriDate(targetMonth: number, targetDay: number, date = new Date()): number {
  const { day, month } = getHijriParts(date);
  if (!day || !month) return 0;

  const current = (month - 1) * 30 + day;
  const target = (targetMonth - 1) * 30 + targetDay;

  if (target >= current) {
    return target - current;
  }

  return 360 - current + target;
}

export function isRamadanNow(date = new Date()): boolean {
  return getHijriMonth(date) === 9;
}
