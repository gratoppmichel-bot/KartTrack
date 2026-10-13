/** Parses "1:02.345", "62.345" or "62,345" into milliseconds. Returns null if invalid. */
export function parseLapTime(input: string): number | null {
  const m = input.trim().replace(",", ".").match(/^(?:(\d+):)?(\d{1,3})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  const millis = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
  if (m[1] && seconds >= 60) return null;
  const total = (minutes * 60 + seconds) * 1000 + millis;
  return total >= 10_000 && total <= 600_000 ? total : null;
}

export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const s = String(seconds).padStart(2, "0");
  const msStr = String(millis).padStart(3, "0");
  return minutes > 0 ? `${minutes}:${s}.${msStr}` : `${seconds}.${msStr}`;
}

export function lapStats(times: number[]) {
  if (times.length === 0) return null;
  const best = Math.min(...times);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length;
  return { best, avg: Math.round(avg), consistency: Math.round(Math.sqrt(variance)) };
}
