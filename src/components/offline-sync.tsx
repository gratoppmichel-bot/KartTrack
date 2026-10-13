"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { listPending, QUEUE_EVENT, removePending, syncPending, type PendingSession } from "@/lib/offline-queue";

export function OfflineSync() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<PendingSession[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => setPending(await listPending()), []);

  const sync = useCallback(async () => {
    setBusy(true);
    try {
      const r = await syncPending(createClient());
      if (r.synced > 0) {
        setMessage(
          `${r.synced} ${r.synced === 1 ? "Session" : "Sessions"} synchronisiert` +
            (r.achievements > 0 ? ` · 🏆 ${r.achievements} neue Achievements` : ""),
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
      refresh();
    }
  }, [router, refresh]);

  useEffect(() => {
    // initial state is read once on mount; the listeners below keep it current
    /* eslint-disable react-hooks/set-state-in-effect */
    setOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) sync();
    /* eslint-enable react-hooks/set-state-in-effect */

    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);
    const onVisible = () => document.visibilityState === "visible" && navigator.onLine && sync();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(QUEUE_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, sync]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(t);
  }, [message]);

  const failed = pending.filter((p) => p.error);
  const waiting = pending.length - failed.length;
  if (online && pending.length === 0 && !message) return null;

  return (
    <div className="fixed inset-x-0 bottom-14 z-20 px-3" role="status" aria-live="polite">
      <div className="mx-auto max-w-xl rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm shadow-lg">
        {!online && <p className="text-amber-300">Offline – neue Sessions werden lokal gespeichert.</p>}
        {waiting > 0 && (
          <p className="flex items-center justify-between gap-3">
            <span>
              ⏳ {waiting} {waiting === 1 ? "Session wartet" : "Sessions warten"} auf Sync
            </span>
            {online && (
              <button onClick={sync} disabled={busy} className="font-semibold text-rose-400 disabled:opacity-50">
                {busy ? "Synchronisiere…" : "Jetzt synchronisieren"}
              </button>
            )}
          </p>
        )}
        {failed.map((p) => (
          <p key={p.id} className="flex items-center justify-between gap-3 text-red-400">
            <span className="min-w-0 truncate">Sync fehlgeschlagen: {p.error}</span>
            <button onClick={() => removePending(p.id)} className="shrink-0 underline">
              Verwerfen
            </button>
          </p>
        ))}
        {message && <p className="text-emerald-400">{message}</p>}
      </div>
    </div>
  );
}
