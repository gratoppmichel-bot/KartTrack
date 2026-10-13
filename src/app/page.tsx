import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatLapTime } from "@/lib/laps";
import { levelInfo } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function UserCard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, xp, rewards(name)")
    .eq("id", user.id)
    .single();

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-neutral-400">Willkommen,</p>
      <p className="text-2xl font-bold">{profile?.username ?? user.email}</p>
      {(profile?.rewards as unknown as { name: string } | null)?.name && (
        <p className="text-sm text-rose-400">{(profile?.rewards as unknown as { name: string }).name}</p>
      )}
      <Link href="/rewards" className="mt-2 block text-sm text-neutral-400 hover:text-neutral-200">
        Level {levelInfo(profile?.xp ?? 0).level} · {profile?.xp ?? 0} XP →
      </Link>
    </section>
  );
}

async function SessionList() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_date, tracks(name), laps(time_ms)")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (!sessions?.length) {
    return <p className="mt-4 text-sm text-neutral-500">Noch keine Sessions – trag deine erste ein!</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
      {sessions.map((s) => {
        const times = (s.laps ?? []).map((l) => l.time_ms);
        const track = s.tracks as unknown as { name: string } | null;
        return (
          <li key={s.id}>
            <Link href={`/sessions/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900">
              <span>
                <span className="block font-semibold">{track?.name}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(s.session_date).toLocaleDateString("de-DE")} · {times.length} Runden
                </span>
              </span>
              {times.length > 0 && <span className="font-mono text-emerald-400">{formatLapTime(Math.min(...times))}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black">
          Kart<span className="text-rose-500">Track</span>
        </h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-400 underline">Abmelden</button>
        </form>
      </header>
      <Suspense
        fallback={<div className="mt-8 h-28 animate-pulse rounded-xl bg-neutral-900" />}
      >
        <UserCard />
      </Suspense>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Meine Sessions</h2>
        <Link href="/sessions/new" className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold hover:bg-rose-500">
          + Neue Session
        </Link>
      </div>
      <Suspense fallback={<div className="mt-4 h-32 animate-pulse rounded-xl bg-neutral-900" />}>
        <SessionList />
      </Suspense>
    </main>
  );
}
