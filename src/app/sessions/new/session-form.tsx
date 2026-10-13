"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseLapTime } from "@/lib/laps";
import { enqueue, listPending, saveSession, SaveError, type PendingSession } from "@/lib/offline-queue";

type Track = { id: string; name: string; location: string | null; is_custom: boolean };

const input =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-rose-500";

const today = () => new Date().toISOString().slice(0, 10);

export function SessionForm({ tracks, userId }: { tracks: Track[]; userId: string }) {
  const router = useRouter();
  const [queuedTracks, setQueuedTracks] = useState<Track[]>([]);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "new");
  const [newTrack, setNewTrack] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [isCustom, setIsCustom] = useState(true);
  const [date, setDate] = useState(today);
  const [kart, setKart] = useState("");
  const [weather, setWeather] = useState("");
  const [notes, setNotes] = useState("");
  const [lapsText, setLapsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);

  // tracks created offline are not on the server yet, but must stay selectable
  useEffect(() => {
    listPending().then((items) => {
      const seen = new Map<string, Track>();
      for (const p of items) {
        if (p.ownerId === userId && p.track.isNew && p.track.name) {
          seen.set(p.track.id, {
            id: p.track.id,
            name: p.track.name,
            location: p.track.location ?? null,
            is_custom: p.track.isCustom ?? true,
          });
        }
      }
      setQueuedTracks([...seen.values()].filter((t) => !tracks.some((s) => s.id === t.id)));
    });
  }, [tracks, userId, queued]);

  const allTracks = [...tracks, ...queuedTracks];

  function reset() {
    setQueued(false);
    setLapsText("");
    setNotes("");
    setNewTrack("");
    setNewLocation("");
  }

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

    const isNewTrack = trackId === "new";
    const item: PendingSession = {
      id: crypto.randomUUID(),
      ownerId: userId,
      createdAt: Date.now(),
      track: isNewTrack
        ? { id: crypto.randomUUID(), isNew: true, name: newTrack.trim(), location: newLocation.trim() || null, isCustom }
        : { id: trackId, isNew: false },
      date,
      kart: kart.trim() || null,
      weather: weather.trim() || null,
      notes: notes.trim() || null,
      times,
    };

    setBusy(true);
    try {
      await saveSession(createClient(), item);
    } catch (err) {
      if (err instanceof SaveError && err.network) {
        try {
          await enqueue(item);
          setQueued(true);
        } catch {
          setError("Offline speichern ist auf diesem Gerät nicht möglich.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
      setBusy(false);
      return;
    }

    const { data: awarded } = await createClient().rpc("award_achievements");
    const count = awarded?.length ?? 0;
    router.replace(`/sessions/${item.id}${count > 0 ? `?ach=${count}` : ""}`);
    router.refresh();
  }

  if (queued) {
    return (
      <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-5">
        <p className="font-semibold text-amber-300">📴 Offline gespeichert</p>
        <p className="mt-1 text-sm text-neutral-300">
          Die Session liegt auf deinem Gerät und wird automatisch hochgeladen, sobald du wieder Netz hast.
        </p>
        <button onClick={reset} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold hover:bg-rose-600">
          Weitere Session eintragen
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-neutral-400">
        Strecke
        <select className={input} value={trackId} onChange={(e) => setTrackId(e.target.value)}>
          {allTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.is_custom ? "★ " : ""}
              {t.name}
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
      <button disabled={busy} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold hover:bg-rose-600 disabled:opacity-60">
        {busy ? "Speichere…" : "Session speichern"}
      </button>
    </form>
  );
}
