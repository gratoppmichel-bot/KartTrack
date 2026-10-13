"use client";

import { useActionState } from "react";
import { sendRequest } from "./actions";

export function AddFriendForm() {
  const [state, action, pending] = useActionState(sendRequest, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="username"
          placeholder="Benutzername des Freundes"
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-rose-500"
          autoCapitalize="none"
          required
        />
        <button disabled={pending} className="rounded-lg bg-rose-700 px-4 py-2 font-semibold hover:bg-rose-600 disabled:opacity-60">
          Hinzufügen
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-400">{state.ok}</p>}
    </form>
  );
}
