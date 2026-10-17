let pendingDay: string | null = null;

export function rememberDay(day: string) {
  pendingDay = day;
}

export function takePendingDay() {
  const day = pendingDay;
  pendingDay = null;
  return day;
}
