import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// Called by the KartTrack server with the signed-in user's JWT (verify_jwt = true).
// The function never trusts the request body: it re-checks the friendship in the database
// and sends at most one notification per request / per acceptance.

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BGsy9tYmmNkGi7FX4cuAXFnxxuO_ygHisXjaLcFVEtWaY0u81Dv4Eg34nuvIjjDmaOPUuZ7DLuMv_ep4yYCJh6U";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "https://karttrack.netlify.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!privateKey) return json({ error: "push not configured" }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  let kind: string, other: string;
  try {
    ({ kind, other } = await req.json());
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if ((kind !== "request" && kind !== "accepted") || typeof other !== "string") {
    return json({ error: "bad request" }, 400);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // request:  caller asked `other` -> notify `other`
  // accepted: `other` asked the caller, caller accepted -> notify `other`
  const match = kind === "request"
    ? { user_id: user.id, friend_id: other, status: "pending", flag: "request_notified_at" }
    : { user_id: other, friend_id: user.id, status: "accepted", flag: "accept_notified_at" };

  // claim the notification slot atomically: only the first caller gets a row back
  const { data: claimed } = await admin
    .from("friendships")
    .update({ [match.flag]: new Date().toISOString() })
    .eq("user_id", match.user_id)
    .eq("friend_id", match.friend_id)
    .eq("status", match.status)
    .is(match.flag, null)
    .select("user_id");
  if (!claimed?.length) return json({ sent: 0 });

  const { data: actor } = await admin.from("profiles").select("username").eq("id", user.id).single();
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", other);
  if (!subs?.length) return json({ sent: 0 });

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
  const name = actor?.username ?? "Jemand";
  const payload = JSON.stringify(
    kind === "request"
      ? { title: "Neue Freundschaftsanfrage", body: `${name} möchte dein Freund sein.`, url: "/friends" }
      : { title: "Anfrage angenommen", body: `${name} ist jetzt dein Freund – miss dich auf der Bahn!`, url: "/friends" },
  );

  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // expired
      }
    }
  }));
  return json({ sent });
});
