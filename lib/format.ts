import { monthName, text, weekdayLongName, weekdayShortName } from '@/lib/i18n';

export function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = next.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + diff);
  return next;
}

export function weekdayShort(date: Date) {
  return weekdayShortName(date.getDay());
}

export function weekdayLong(date: Date) {
  return weekdayLongName(date.getDay());
}

export function formatLongDay(date: Date) {
  return `${date.getDate()} ${monthName(date.getMonth())} ${date.getFullYear()}`;
}

export function dayTitle(date: Date) {
  return `${date.getDate()} ${monthName(date.getMonth())}`;
}

export function monthLabel(date: Date) {
  return `${monthName(date.getMonth())} ${date.getFullYear()}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function addMonths(date: Date, count: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + count, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), last));
  return target;
}

export function weekRangeLabel(start: Date) {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${monthName(start.getMonth())}`;
  }
  return `${start.getDate()} ${monthName(start.getMonth())} – ${end.getDate()} ${monthName(end.getMonth())}`;
}

export function formatClock(ms: number) {
  const totalCentiseconds = Math.max(0, Math.floor(ms / 10));
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

export function formatWhen(ms: number, now = new Date()) {
  const date = new Date(ms);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const key = dayKey(date);
  if (key === dayKey(now)) return text('time.todayAt', { time });
  if (key === dayKey(addDays(now, 1))) return text('time.tomorrowAt', { time });
  return `${date.getDate()} ${monthName(date.getMonth())} · ${time}`;
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return text('time.expired');
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return text('time.daysHours', { days, hours });
  if (hours > 0) return text('time.hoursMinutes', { hours, minutes: pad(minutes) });
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function defaultStart(day: string) {
  if (day !== dayKey(new Date())) return '09:00';
  const now = new Date();
  const hour = now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours();
  if (hour > 23) return '23:00';
  return `${pad(hour)}:00`;
}

export function addMinutesToTime(value: string, amount: number) {
  const total = (timeToMinutes(value) + amount + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function daysUntil(day: string, now = new Date()) {
  const target = parseDayKey(day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function daysLeftLabel(day: string, now = new Date()) {
  const days = daysUntil(day, now);
  if (days === 0) return text('common.today');
  if (days === 1) return text('common.tomorrow');
  if (days > 1) return text('time.daysLeft', { count: days });
  if (days === -1) return text('time.oneDayPassed');
  return text('time.daysPassed', { count: Math.abs(days) });
}

export function spanProgress(startMs: number, endDay: string, now = Date.now()) {
  const end = parseDayKey(endDay);
  end.setHours(23, 59, 59, 999);
  const total = end.getTime() - startMs;
  if (total <= 0) return now >= end.getTime() ? 1 : 0;
  return Math.min(1, Math.max(0, (now - startMs) / total));
}

export function formatStudy(ms: number) {
  if (ms > 0 && ms < 60000) return text('analysis.underMinute');
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return text('time.hoursMinutes', { hours, minutes });
  if (hours > 0) return text('time.hours', { hours });
  return text('time.minutes', { minutes });
}

export function formatBreak(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return text('time.hoursMinutes', { hours, minutes: pad(minutes) });
  if (minutes > 0) return text('time.minutesSeconds', { minutes, seconds: pad(seconds) });
  return text('time.seconds', { seconds });
}

export function trimToMinute(date: Date) {
  const next = new Date(date.getTime());
  next.setSeconds(0, 0);
  return next;
}
