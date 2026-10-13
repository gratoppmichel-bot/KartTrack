import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddFriendForm } from "./add-friend-form";
import { CopyName } from "./copy-name";
import { removeFriendship, respondToRequest } from "./actions";

async function FriendLists() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  const { data: rows } = await supabase.from("friendships").select("user_id, friend_id, status");
  const friendships = rows ?? [];
  const otherId = (f: { user_id: string; friend_id: string }) => (f.user_id === user.id ? f.friend_id : f.user_id);

  const ids = [...new Set(friendships.map(otherId))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, username").in("id", ids)
    : { data: [] };
  const name = (id: string) => profiles?.find((p) => p.id === id)?.username ?? "Unbekannt";

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.friend_id === user.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.user_id === user.id);

  return (
    <>
      <CopyName username={me?.username ?? ""} />
      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Anfragen</h2>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {incoming.map((f) => (
              <li key={f.user_id} className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold">{name(f.user_id)}</span>
                <form action={respondToRequest} className="flex gap-2">
                  <input type="hidden" name="requester" value={f.user_id} />
                  <button name="action" value="accept" className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold">Annehmen</button>
                  <button name="action" value="decline" className="rounded-lg bg-neutral-800 px-3 py-1 text-sm">Ablehnen</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Meine Freunde</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-neutral-400">Noch keine Freunde – füge oben jemanden per Benutzernamen hinzu.</p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {accepted.map((f) => (
              <li key={otherId(f)} className="flex items-center justify-between px-4 py-3">
                <Link href={`/compare/${otherId(f)}`} className="font-semibold hover:text-rose-400">
                  {name(otherId(f))} <span className="text-xs font-normal text-neutral-400">· Vergleichen →</span>
                </Link>
                <form action={removeFriendship}>
                  <input type="hidden" name="user_id" value={f.user_id} />
                  <input type="hidden" name="friend_id" value={f.friend_id} />
                  <button className="text-xs text-neutral-400 underline">Entfernen</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Gesendet</h2>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {outgoing.map((f) => (
              <li key={f.friend_id} className="flex items-center justify-between px-4 py-3">
                <span>{name(f.friend_id)} <span className="text-xs text-neutral-400">· wartet auf Antwort</span></span>
                <form action={removeFriendship}>
                  <input type="hidden" name="user_id" value={f.user_id} />
                  <input type="hidden" name="friend_id" value={f.friend_id} />
                  <button className="text-xs text-neutral-400 underline">Zurückziehen</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function FriendsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-2xl font-black">Freunde</h1>
      <AddFriendForm />
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-neutral-900" />}>
        <FriendLists />
      </Suspense>
    </main>
  );
}
