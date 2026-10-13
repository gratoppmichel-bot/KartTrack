import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime } from "@/lib/laps";

type Row = { user_id: string; track_id: string; tracks: unknown; laps: { time_ms: number }[] | null };

async function Comparison({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: friend } = await supabase.from("profiles").select("id, username").eq("id", friendId).maybeSingle();
  if (!friend) notFound();

  const { data } = await supabase
    .from("sessions")
    .select("user_id, track_id, tracks(name, is_custom), laps(time_ms)")
    .in("user_id", [user.id, friendId]);
  const rows = (data ?? []) as Row[];

  // Friend sessions are only visible via RLS if the friendship is accepted
  if (friendId !== user.id && !rows.some((r) => r.user_id === friendId)) {
    const { data: f } = await supabase
      .from("friendships")
      .select("status")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
      )
      .eq("status", "accepted")
      .maybeSingle();
    if (!f) notFound();
  }

  const tracks = new Map<string, { name: string; custom: boolean; mine: number[]; theirs: number[] }>();
  for (const r of rows) {
    const t = r.tracks as { name: string; is_custom: boolean } | null;
    if (!t) continue;
    const e = tracks.get(r.track_id) ?? { name: t.name, custom: t.is_custom, mine: [], theirs: [] };
    (r.user_id === user.id ? e.mine : e.theirs).push(...(r.laps ?? []).map((l) => l.time_ms));
    tracks.set(r.track_id, e);
  }
  const shared = [...tracks.entries()].filter(([, t]) => t.mine.length && t.theirs.length);

  let wins = 0;
  let losses = 0;
  const lines = shared.map(([id, t]) => {
    const mine = Math.min(...t.mine);
    const theirs = Math.min(...t.theirs);
    if (mine < theirs) wins++;
    else if (theirs < mine) losses++;
    return { id, ...t, myBest: mine, theirBest: theirs, diff: mine - theirs };
  });

  return (
    <>
      <h1 className="mb-1 mt-3 text-2xl font-black">Du vs. {friend.username}</h1>
      <p className="mb-5 text-sm text-neutral-400">
        {shared.length === 0
          ? "Ihr habt noch keine gemeinsame Bahn gefahren."
          : `${wins} Bahnen vorne · ${losses} Bahnen hinten · ${shared.length - wins - losses} gleichauf`}
      </p>

      <ul className="flex flex-col gap-3">
        {lines.map((l) => (
          <li key={l.id}>
            <Link href={`/leaderboard/${l.id}`} className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700">
              <p className="font-semibold">
                {l.custom && <span className="text-rose-400">★ </span>}
                {l.name}
              </p>
              <div className="mt-2 grid grid-cols-3 items-center text-center font-mono text-sm">
                <span className={l.diff < 0 ? "font-bold text-emerald-400" : ""}>{formatLapTime(l.myBest)}</span>
                <span className="text-xs text-neutral-400">
                  {l.diff === 0 ? "gleich" : `${l.diff < 0 ? "−" : "+"}${(Math.abs(l.diff) / 1000).toFixed(3)} s`}
                </span>
                <span className={l.diff > 0 ? "font-bold text-emerald-400" : ""}>{formatLapTime(l.theirBest)}</span>
              </div>
              <div className="mt-1 grid grid-cols-3 text-center text-xs text-neutral-500">
                <span>Du</span>
                <span />
                <span>{friend.username}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ComparePage({ params }: { params: Promise<{ friendId: string }> }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/friends" className="text-sm text-neutral-400 underline">← Freunde</Link>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <Comparison params={params} />
      </Suspense>
    </main>
  );
}
