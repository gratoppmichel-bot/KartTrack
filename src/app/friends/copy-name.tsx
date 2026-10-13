"use client";

import { useState } from "react";

export function CopyName({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable; the name stays visible to copy by hand
    }
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">Dein Benutzername – schick ihn deinen Freunden</p>
        <p className="truncate text-lg font-bold">{username}</p>
      </div>
      <button onClick={copy} className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-700">
        {copied ? "Kopiert ✓" : "Kopieren"}
      </button>
    </div>
  );
}
