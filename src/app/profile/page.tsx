import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount, ExportButton } from "./account-actions";
import { PushToggle } from "./push-toggle";

async function Content() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  const username = profile?.username ?? "";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-sm text-neutral-400">Angemeldet als</p>
        <p className="text-xl font-bold">{username}</p>
        <p className="text-sm text-neutral-400">{user.email}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Benachrichtigungen</h2>
        <PushToggle userId={user.id} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Deine Daten</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Du kannst jederzeit eine Kopie aller deiner Daten herunterladen. Mehr dazu in der{" "}
          <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link>.
        </p>
        <ExportButton />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Gefahrenzone</h2>
        <DeleteAccount username={username} />
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-400 underline">← Zurück</Link>
      <h1 className="mb-6 mt-3 text-2xl font-black">Profil</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <Content />
      </Suspense>
    </main>
  );
}
