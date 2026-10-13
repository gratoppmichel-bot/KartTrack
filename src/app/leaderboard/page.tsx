import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function TrackList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS only returns my sessions plus those of accepted friends
  const { data: sessions } = await supabase
    .from("sessions")
    .select("track_id, user_id, tracks(name, location, is_custom)")
    .limit(1000);

  const byTrack = new Map<string, { name: string; location: string | null; custom: boolean; drivers: Set<string> }>();
  for (const s of sessions ?? []) {
    const t = s.tracks as unknown as { name: string; location: string | null; is_custom: boolean } | null;
    if (!t) continue;
    const entry = byTrack.get(s.track_id) ?? { name: t.name, location: t.location, custom: t.is_custom, drivers: new Set() };
    entry.drivers.add(s.user_id);
    byTrack.set(s.track_id, entry);
  }

  if (byTrack.size === 0) {
    return <p className="text-sm text-neutral-500">Sobald du oder deine Freunde Sessions eintragen, erscheinen hier die Bahnen.</p>;
  }
  const tracks = [...byTrack.entries()].sort((a, b) => b[1].drivers.size - a[1].drivers.size);
  return (
    <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
      {tracks.map(([id, t]) => (
        <li key={id}>
          <Link href={`/leaderboard/${id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900">
            <span>
              <span className="block font-semibold">
                {t.custom && <span className="text-rose-400">★ </span>}
                {t.name}
              </span>
              {t.location && <span className="text-xs text-neutral-400">{t.location}</span>}
            </span>
            <span className="text-xs text-neutral-400">{t.drivers.size} {t.drivers.size === 1 ? "Fahrer" : "Fahrer"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function LeaderboardIndex() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-2xl font-black">Rangliste</h1>
      <p className="mb-4 text-sm text-neutral-400">Wähle eine Bahn und miss dich mit deinen Freunden. ★ = eigene Bahn.</p>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-900" />}>
        <TrackList />
      </Suspense>
    </main>
  );
}
