import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatLapTime, lapStats } from "@/lib/laps";
import { LapChart } from "@/components/lap-chart";

async function deleteSession(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", String(formData.get("id")));
  redirect("/");
}

async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ach?: string }>;
}) {
  const { id } = await params;
  const { ach } = await searchParams;
  const newAch = Number(ach) || 0;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, session_date, kart_type, weather, notes, tracks(name, location), laps(lap_nr, time_ms)")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const laps = [...(session.laps ?? [])].sort((a, b) => a.lap_nr - b.lap_nr);
  const times = laps.map((l) => l.time_ms);
  const stats = lapStats(times);
  const track = session.tracks as unknown as { name: string; location: string | null } | null;

  return (
    <>
      {newAch > 0 && (
        <Link href="/rewards" className="mt-4 block rounded-xl border border-emerald-700 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-300">
          🏆 {newAch === 1 ? "Neues Achievement freigeschaltet!" : `${newAch} neue Achievements freigeschaltet!`} Ansehen →
        </Link>
      )}
      <h1 className="mb-1 mt-3 text-2xl font-black">{track?.name}</h1>
      <p className="text-sm text-neutral-400">
        {new Date(session.session_date).toLocaleDateString("de-DE")}
        {[session.kart_type, session.weather].filter(Boolean).map((s) => ` · ${s}`)}
      </p>

      {stats && (
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            ["Bestzeit", formatLapTime(stats.best)],
            ["Ø Zeit", formatLapTime(stats.avg)],
            ["Konstanz ±", `${(stats.consistency / 1000).toFixed(3)} s`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <p className="text-xs text-neutral-400">{label}</p>
              <p className="font-mono text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
        <LapChart times={times} />
      </div>

      <ol className="mt-5 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
        {laps.map((l) => (
          <li key={l.lap_nr} className="flex justify-between px-4 py-2 font-mono">
            <span className="text-neutral-400">Runde {l.lap_nr}</span>
            <span className={stats && l.time_ms === stats.best ? "font-bold text-emerald-400" : ""}>
              {formatLapTime(l.time_ms)}
            </span>
          </li>
        ))}
      </ol>

      {session.notes && <p className="mt-5 text-sm text-neutral-300">{session.notes}</p>}

      {session.user_id === user.id && (
        <form action={deleteSession} className="mt-8">
          <input type="hidden" name="id" value={session.id} />
          <button className="text-sm text-red-400 underline">Session löschen</button>
        </form>
      )}
    </>
  );
}

export default function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ach?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-400 underline">← Zurück</Link>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
