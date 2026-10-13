import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/lib/laps";

async function Board({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: track } = await supabase
    .from("tracks")
    .select("name, location, is_custom")
    .eq("id", trackId)
    .maybeSingle();
  if (!track) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("user_id, profiles(username), laps(time_ms)")
    .eq("track_id", trackId);

  const drivers = new Map<string, { name: string; times: number[]; sessions: number }>();
  for (const s of sessions ?? []) {
    const p = s.profiles as unknown as { username: string } | null;
    const d = drivers.get(s.user_id) ?? { name: p?.username ?? "Unbekannt", times: [], sessions: 0 };
    d.sessions += 1;
    d.times.push(...(s.laps ?? []).map((l) => l.time_ms));
    drivers.set(s.user_id, d);
  }

  const ranking = [...drivers.entries()]
    .filter(([, d]) => d.times.length > 0)
    .map(([id, d]) => ({
      id,
      name: d.name,
      best: Math.min(...d.times),
      avg: Math.round(d.times.reduce((a, b) => a + b, 0) / d.times.length),
      laps: d.times.length,
      sessions: d.sessions,
    }))
    .sort((a, b) => a.best - b.best);
  const leader = ranking[0]?.best ?? 0;

  return (
    <>
      <h1 className="mb-1 mt-3 text-2xl font-black">
        {track.is_custom && <span className="text-rose-400">★ </span>}
        {track.name}
      </h1>
      <p className="mb-5 text-sm text-neutral-400">
        {track.location ? `${track.location} · ` : ""}
        {track.is_custom ? "Eigene Bahn – nur für dich und deine Freunde" : "Öffentliche Bahn"}
      </p>

      {ranking.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch keine Rundenzeiten auf dieser Bahn.</p>
      ) : (
        <ol className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {ranking.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.id === user.id ? "bg-rose-950/40" : ""}`}>
              <span className="w-6 text-center text-lg font-black text-neutral-500">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {r.name}
                  {r.id === user.id && " (du)"}
                </span>
                <span className="text-xs text-neutral-400">
                  Ø {formatLapTime(r.avg)} · {r.laps} Runden · {r.sessions} {r.sessions === 1 ? "Session" : "Sessions"}
                </span>
              </span>
              <span className="text-right font-mono">
                <span className={`block font-bold ${i === 0 ? "text-emerald-400" : ""}`}>{formatLapTime(r.best)}</span>
                {i > 0 && <span className="text-xs text-neutral-400">+{((r.best - leader) / 1000).toFixed(3)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      <Link href="/sessions/new" className="mt-6 inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold hover:bg-rose-500">
        + Session auf dieser Bahn eintragen
      </Link>
    </>
  );
}

export default function TrackBoardPage({ params }: { params: Promise<{ trackId: string }> }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/leaderboard" className="text-sm text-neutral-400 underline">← Alle Bahnen</Link>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <Board params={params} />
      </Suspense>
    </main>
  );
}
