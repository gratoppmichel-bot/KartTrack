import { formatLapTime } from "@/lib/laps";

export function LapChart({ times }: { times: number[] }) {
  if (times.length < 2) return null;
  const w = 320;
  const h = 140;
  const pad = 24;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (times.length - 1);
  const y = (t: number) => pad + ((t - min) / range) * (h - pad * 2);
  const points = times.map((t, i) => `${x(i)},${y(t)}`).join(" ");
  const bestIdx = times.indexOf(min);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Rundenzeiten im Verlauf"
      className="w-full"
    >
      <polyline points={points} fill="none" stroke="#f43f5e" strokeWidth="2" />
      {times.map((t, i) => (
        <circle key={i} cx={x(i)} cy={y(t)} r={i === bestIdx ? 5 : 3} fill={i === bestIdx ? "#34d399" : "#f43f5e"} />
      ))}
      <text x={pad} y={12} fontSize="10" fill="#a3a3a3">
        schnellste: {formatLapTime(min)}
      </text>
      <text x={w - pad} y={h - 6} fontSize="10" fill="#a3a3a3" textAnchor="end">
        Runde 1–{times.length}
      </text>
    </svg>
  );
}
