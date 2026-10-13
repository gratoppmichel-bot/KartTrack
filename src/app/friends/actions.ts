"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function notify(supabase: Awaited<ReturnType<typeof createClient>>, kind: "request" | "accepted", other: string) {
  try {
    await supabase.functions.invoke("send-push", { body: { kind, other } });
  } catch {
    // push is best effort and must never break the friendship flow
  }
}

export type FormState = { error?: string; ok?: string } | undefined;

export async function sendRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  if (!username) return { error: "Gib einen Benutzernamen ein." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();
  if (!target) return { error: `Kein Fahrer „${username}“ gefunden.` };
  if (target.id === user.id) return { error: "Das bist du selbst." };

  const { data: existing } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return { error: `Du bist schon mit ${target.username} befreundet.` };
    if (existing.user_id === user.id) return { error: "Anfrage wurde schon gesendet." };
    // they already asked us: accept instead of creating a duplicate
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", target.id)
      .eq("friend_id", user.id);
    if (error) return { error: error.message };
    await notify(supabase, "accepted", target.id);
    revalidatePath("/friends");
    return { ok: `Du und ${target.username} seid jetzt Freunde!` };
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: target.id, status: "pending" });
  if (error) return { error: error.message };
  await notify(supabase, "request", target.id);
  revalidatePath("/friends");
  return { ok: `Anfrage an ${target.username} gesendet.` };
}

export async function respondToRequest(formData: FormData) {
  const requesterId = String(formData.get("requester"));
  const accept = formData.get("action") === "accept";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (accept) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", requesterId)
      .eq("friend_id", user.id);
    await notify(supabase, "accepted", requesterId);
  } else {
    await supabase.from("friendships").delete().eq("user_id", requesterId).eq("friend_id", user.id);
  }
  revalidatePath("/friends");
}

export async function removeFriendship(formData: FormData) {
  const a = String(formData.get("user_id"));
  const b = String(formData.get("friend_id"));
  const supabase = await createClient();
  await supabase.from("friendships").delete().eq("user_id", a).eq("friend_id", b);
  revalidatePath("/friends");
}
