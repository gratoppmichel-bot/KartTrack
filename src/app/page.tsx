import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function UserCard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, xp")
    .eq("id", user.id)
    .single();

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-neutral-400">Willkommen,</p>
      <p className="text-2xl font-bold">{profile?.username ?? user.email}</p>
      <p className="mt-2 text-sm text-neutral-400">{profile?.xp ?? 0} XP</p>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black">
          Kart<span className="text-rose-500">Track</span>
        </h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-400 underline">Abmelden</button>
        </form>
      </header>
      <Suspense
        fallback={<div className="mt-8 h-28 animate-pulse rounded-xl bg-neutral-900" />}
      >
        <UserCard />
      </Suspense>
      <p className="mt-6 text-sm text-neutral-500">
        Nächster Schritt: Sessions und Rundenzeiten eintragen.
      </p>
    </main>
  );
}
