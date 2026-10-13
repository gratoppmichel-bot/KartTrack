import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "./session-form";

async function FormLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: tracks } = await supabase.from("tracks").select("id, name, location").order("name");
  return <SessionForm tracks={tracks ?? []} userId={user.id} />;
}

export default function NewSessionPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-400 underline">← Zurück</Link>
      <h1 className="mb-6 mt-3 text-2xl font-black">Neue Session</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-neutral-900" />}>
        <FormLoader />
      </Suspense>
    </main>
  );
}
