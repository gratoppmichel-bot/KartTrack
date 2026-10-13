"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearPending } from "@/lib/offline-queue";

export function ExportButton() {
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    const { data, error } = await createClient().rpc("export_my_data");
    if (error) return setError(error.message);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `karttrack-daten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <button onClick={download} className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-700">
        Meine Daten herunterladen (JSON)
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function DeleteAccount({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    await clearPending().catch(() => {});
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/40">
        Konto löschen…
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
      <p className="text-sm text-red-200">
        Das löscht dein Konto, alle deine Sessions, Rundenzeiten, Freundschaften, Achievements und Belohnungen
        <strong> endgültig</strong>. Tippe zur Bestätigung deinen Benutzernamen <strong>{username}</strong> ein.
      </p>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={username}
        autoCapitalize="none"
        className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={remove}
          disabled={busy || confirm !== username}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Lösche…" : "Endgültig löschen"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg bg-neutral-800 px-4 py-2 text-sm">
          Abbrechen
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
