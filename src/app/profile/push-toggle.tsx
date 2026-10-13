"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function toKey(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toKey(VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON();
      const { error } = await createClient()
        .from("push_subscriptions")
        .upsert(
          { endpoint: sub.endpoint, user_id: userId, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
          { onConflict: "endpoint" },
        );
      if (error) throw new Error(error.message);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktivieren fehlgeschlagen.");
    }
  }

  async function disable() {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deaktivieren fehlgeschlagen.");
    }
  }

  const label: Record<State, string> = {
    loading: "Prüfe…",
    unsupported: "Auf diesem Gerät oder Browser nicht verfügbar. Auf dem iPhone muss die App zuerst zum Home-Bildschirm hinzugefügt werden.",
    denied: "Im Browser blockiert – erlaube Benachrichtigungen in den Seiteneinstellungen.",
    off: "Werde benachrichtigt, wenn dir jemand eine Freundschaftsanfrage schickt.",
    on: "Aktiv auf diesem Gerät.",
  };

  return (
    <div>
      <p className="text-sm text-neutral-400">{label[state]}</p>
      {(state === "off" || state === "on") && (
        <button
          onClick={state === "off" ? enable : disable}
          className="mt-3 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-700"
        >
          {state === "off" ? "Benachrichtigungen aktivieren" : "Deaktivieren"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
