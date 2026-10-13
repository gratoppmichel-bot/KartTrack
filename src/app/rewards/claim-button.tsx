"use client";

import { useActionState } from "react";
import { claimReward } from "./actions";

export function ClaimButton({ rewardId, disabled }: { rewardId: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(claimReward, undefined);
  return (
    <form action={action} className="text-right">
      <input type="hidden" name="reward" value={rewardId} />
      <button
        disabled={disabled || pending}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        Einlösen
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
