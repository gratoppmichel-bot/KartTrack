import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingSession = {
  id: string;
  ownerId: string;
  createdAt: number;
  track: { id: string; isNew: boolean; name?: string; location?: string | null; isCustom?: boolean };
  date: string;
  kart: string | null;
  weather: string | null;
  notes: string | null;
  times: number[];
  error?: string;
};

const DB_NAME = "karttrack";
const STORE = "pending";
export const QUEUE_EVENT = "karttrack:queue";

export class SaveError extends Error {
  constructor(
    message: string,
    public network: boolean,
  ) {
    super(message);
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

function notify() {
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export async function listPending(): Promise<PendingSession[]> {
  try {
    const all = await run<PendingSession[]>("readonly", (s) => s.getAll());
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function enqueue(item: PendingSession) {
  await run("readwrite", (s) => s.put(item));
  notify();
}

export async function removePending(id: string) {
  await run("readwrite", (s) => s.delete(id));
  notify();
}

function isNetworkMessage(message: string) {
  return !navigator.onLine || /fetch|network|load failed|timeout/i.test(message);
}

function fail(message: string): never {
  throw new SaveError(message, isNetworkMessage(message));
}

/** Idempotent: every row carries a client-generated id, so retries and double syncs are safe. */
export async function saveSession(supabase: SupabaseClient, item: PendingSession): Promise<void> {
  try {
    if (item.track.isNew) {
      const { error } = await supabase.from("tracks").upsert(
        {
          id: item.track.id,
          name: item.track.name,
          location: item.track.location ?? null,
          is_custom: item.track.isCustom ?? true,
          created_by: item.ownerId,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) fail(error.message);
    }

    const { error: sErr } = await supabase.from("sessions").upsert({
      id: item.id,
      user_id: item.ownerId,
      track_id: item.track.id,
      session_date: item.date,
      kart_type: item.kart,
      weather: item.weather,
      notes: item.notes,
    });
    if (sErr) fail(sErr.message);

    const { error: lErr } = await supabase
      .from("laps")
      .upsert(
        item.times.map((time_ms, i) => ({ session_id: item.id, lap_nr: i + 1, time_ms })),
        { onConflict: "session_id,lap_nr" },
      );
    if (lErr) {
      if (!isNetworkMessage(lErr.message)) await supabase.from("sessions").delete().eq("id", item.id);
      fail(lErr.message);
    }
  } catch (e) {
    if (e instanceof SaveError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new SaveError(message, isNetworkMessage(message));
  }
}

let syncing = false;

export type SyncResult = { synced: number; failed: number; achievements: number };

export async function syncPending(supabase: SupabaseClient): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, achievements: 0 };
  if (syncing || !navigator.onLine) return result;
  syncing = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return result;

    for (const item of await listPending()) {
      if (item.ownerId !== userId) continue;
      try {
        await saveSession(supabase, item);
        await removePending(item.id);
        result.synced++;
      } catch (e) {
        if (e instanceof SaveError && e.network) break; // still offline, try again later
        result.failed++;
        await enqueue({ ...item, error: e instanceof Error ? e.message : "Unbekannter Fehler" });
      }
    }

    if (result.synced > 0) {
      const { data } = await supabase.rpc("award_achievements");
      result.achievements = data?.length ?? 0;
    }
    return result;
  } finally {
    syncing = false;
  }
}

export async function clearPending() {
  await run("readwrite", (s) => s.clear());
  notify();
}
