"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // forget cached user-specific pages when someone lands on the login page
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear-pages" });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.replace("/");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${location.origin}/`,
        },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace("/");
        router.refresh();
      } else setInfo("Fast geschafft! Bestätige deine E-Mail-Adresse über den Link in deinem Postfach.");
    }
    setBusy(false);
  }

  const input =
    "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-rose-500";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">
        Kart<span className="text-rose-500">Track</span>
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            className={input}
            placeholder="Benutzername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={24}
            required
          />
        )}
        <input
          className={input}
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={input}
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}
        <button
          disabled={busy}
          className="rounded-lg bg-rose-600 px-3 py-2 font-semibold hover:bg-rose-500 disabled:opacity-60"
        >
          {mode === "login" ? "Anmelden" : "Registrieren"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-sm text-neutral-400 underline"
      >
        {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
      </button>
    </main>
  );
}
