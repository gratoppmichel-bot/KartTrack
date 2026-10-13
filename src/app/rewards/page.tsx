import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelInfo } from "@/lib/levels";
import { ClaimButton } from "./claim-button";
import { equipReward } from "./actions";

const ICON = { badge: "🏅", title: "👑" } as const;

async function Content() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // catches achievements that depend on friends' activity
  await supabase.rpc("award_achievements");

  const [{ data: profile }, { data: achievements }, { data: earned }, { data: rewards }, { data: claims }] =
    await Promise.all([
      supabase.from("profiles").select("xp, equipped_reward_id").eq("id", user.id).single(),
      supabase.from("achievements").select("id, code, name, description, xp").order("xp"),
      supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
      supabase.from("rewards").select("id, name, description, type, cost_xp").order("cost_xp"),
      supabase.from("reward_claims").select("reward_id").eq("user_id", user.id),
    ]);

  const xp = profile?.xp ?? 0;
  const claimed = new Set((claims ?? []).map((c) => c.reward_id));
  const spent = (rewards ?? []).filter((r) => claimed.has(r.id)).reduce((a, r) => a + r.cost_xp, 0);
  const available = xp - spent;
  const earnedIds = new Set((earned ?? []).map((e) => e.achievement_id));
  const { level, next, progress } = levelInfo(xp);

  return (
    <>
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-neutral-400">Level</p>
            <p className="text-4xl font-black text-rose-500">{level}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-400">Verfügbar</p>
            <p className="text-2xl font-bold">{available} XP</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full bg-rose-500" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          {xp} / {next} XP bis Level {level + 1}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">
          Achievements <span className="text-sm font-normal text-neutral-400">{earnedIds.size}/{achievements?.length ?? 0}</span>
        </h2>
        <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {(achievements ?? []).map((a) => {
            const done = earnedIds.has(a.id);
            return (
              <li key={a.id} className={`flex items-center gap-3 px-4 py-3 ${done ? "" : "opacity-50"}`}>
                <span className="text-2xl">{done ? "🏆" : "🔒"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.name}</span>
                  <span className="text-xs text-neutral-400">{a.description}</span>
                </span>
                <span className={`text-sm font-mono ${done ? "text-emerald-400" : "text-neutral-400"}`}>+{a.xp} XP</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">Belohnungen</h2>
        <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {(rewards ?? []).map((r) => {
            const owned = claimed.has(r.id);
            const equipped = profile?.equipped_reward_id === r.id;
            const icon = ICON[r.type as keyof typeof ICON] ?? "🎁";
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{r.name}</span>
                  <span className="text-xs text-neutral-400">
                    {r.description} · {r.cost_xp} XP
                  </span>
                </span>
                {owned ? (
                  <form action={equipReward}>
                    <input type="hidden" name="reward" value={equipped ? "" : r.id} />
                    <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${equipped ? "bg-emerald-700" : "bg-neutral-800 hover:bg-neutral-700"}`}>
                      {equipped ? "Aktiv ✓" : "Tragen"}
                    </button>
                  </form>
                ) : (
                  <ClaimButton rewardId={r.id} disabled={available < r.cost_xp} />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export default function RewardsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-2xl font-black">Belohnungen</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <Content />
      </Suspense>
    </main>
  );
}
