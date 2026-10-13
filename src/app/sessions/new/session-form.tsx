"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseLapTime } from "@/lib/laps";

type Track = { id: string; name: string; location: string | null; is_custom: boolean };

const input =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-rose-500";

export function SessionForm({ tracks, userId }: { tracks: Track[]; userId: string }) {
  const router = useRouter();
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "new");
  const [newTrack, setNewTrack] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [isCustom, setIsCustom] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kart, setKart] = useState("");
  const [weather, setWeather] = useState("");
  const [notes, setNotes] = useState("");
  const [lapsText, setLapsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const lines = lapsText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return setError("Trage mindestens eine Rundenzeit ein.");
    const times: number[] = [];
    for (const [i, line] of lines.entries()) {
      const ms = parseLapTime(line);
      if (ms === null) return setError(`Runde ${i + 1}: „${line}“ ist keine gültige Zeit (z. B. 1:02.345).`);
      times.push(ms);
    }
    if (trackId === "new" && !newTrack.trim()) return setError("Gib einen Namen für die Strecke ein.");

    setBusy(true);
    const supabase = createClient();

    let finalTrackId = trackId;
    if (trackId === "new") {
      const { data, error } = await supabase
        .from("tracks")
        .insert({ name: newTrack.trim(), location: newLocation.trim() || null, created_by: userId, is_custom: isCustom })
        .select("id")
        .single();
      if (error || !data) {
        setBusy(false);
        return setError(error?.message ?? "Strecke konnte nicht angelegt werden.");
      }
      finalTrackId = data.id;
    }

    // client-generated id keeps retries idempotent (needed for offline sync later)
    const sessionId = crypto.randomUUID();
    const { error: sErr } = await supabase.from("sessions").upsert({
      id: sessionId,
      user_id: userId,
      track_id: finalTrackId,
      session_date: date,
      kart_type: kart.trim() || null,
      weather: weather.trim() || null,
      notes: notes.trim() || null,
    });
    if (sErr) {
      setBusy(false);
      return setError(sErr.message);
    }
    const { error: lErr } = await supabase
      .from("laps")
      .upsert(times.map((time_ms, i) => ({ session_id: sessionId, lap_nr: i + 1, time_ms })), {
        onConflict: "session_id,lap_nr",
      });
    if (lErr) {
      await supabase.from("sessions").delete().eq("id", sessionId);
      setBusy(false);
      return setError(lErr.message);
    }

    router.replace(`/sessions/${sessionId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        Strecke
        <select className={input} value={trackId} onChange={(e) => setTrackId(e.target.value)}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.is_custom ? "★ " : ""}{t.name}
              {t.location ? ` (${t.location})` : ""}
            </option>
          ))}
          <option value="new">+ Neue Strecke anlegen</option>
        </select>
      </label>
      {trackId === "new" && (
        <div className="flex flex-col gap-2">
          <input className={input} placeholder="Name der Strecke" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} maxLength={80} />
          <input className={input} placeholder="Ort (optional)" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} maxLength={80} />
          <label className="flex items-start gap-2 text-sm text-neutral-300">
            <input type="checkbox" className="mt-1" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} />
            <span>
              Eigene Bahn – nur du und deine Freunde sehen sie und können sich darauf messen.
              Ohne Haken ist die Bahn für alle sichtbar.
            </span>
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        Datum
        <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <input className={input} placeholder="Kart (optional)" value={kart} onChange={(e) => setKart(e.target.value)} maxLength={60} />
        <input className={input} placeholder="Wetter (optional)" value={weather} onChange={(e) => setWeather(e.target.value)} maxLength={60} />
      </div>
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        Rundenzeiten – eine pro Zeile (z. B. 1:02.345 oder 62.345)
        <textarea
          className={`${input} h-40 font-mono`}
          value={lapsText}
          onChange={(e) => setLapsText(e.target.value)}
          placeholder={"1:02.345\n1:01.870\n1:01.512"}
        />
      </label>
      <textarea className={input} placeholder="Notizen (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-rose-600 px-3 py-2 font-semibold hover:bg-rose-500 disabled:opacity-60">
        {busy ? "Speichere…" : "Session speichern"}
      </button>
    </form>
  );
}
