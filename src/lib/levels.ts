/** Level n needs 50 * (n-1)^2 lifetime XP: 0, 50, 200, 450, 800, ... */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const floor = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { level, floor, next, progress: (xp - floor) / (next - floor) };
}
