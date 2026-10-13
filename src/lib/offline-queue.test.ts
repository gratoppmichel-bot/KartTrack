import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSession, SaveError, type PendingSession } from "./offline-queue";

type Call = { table: string; op: string; rows?: unknown; opts?: unknown };

function fakeClient(errors: Record<string, string> = {}) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => ({
      upsert: async (rows: unknown, opts?: unknown) => {
        calls.push({ table, op: "upsert", rows, opts });
        return { error: errors[table] ? { message: errors[table] } : null };
      },
      delete: () => ({
        eq: async () => {
          calls.push({ table, op: "delete" });
          return { error: null };
        },
      }),
    }),
  };
  return { calls, client: client as unknown as SupabaseClient };
}

const item = (over: Partial<PendingSession> = {}): PendingSession => ({
  id: "s1",
  ownerId: "u1",
  createdAt: 0,
  track: { id: "t1", isNew: false },
  date: "2026-10-13",
  kart: null,
  weather: null,
  notes: null,
  times: [62_345, 61_870],
  ...over,
});

beforeEach(() => vi.stubGlobal("navigator", { onLine: true }));
afterEach(() => vi.unstubAllGlobals());

describe("saveSession", () => {
  it("writes session then laps for an existing track", async () => {
    const { calls, client } = fakeClient();
    await saveSession(client, item());
    expect(calls.map((c) => c.table)).toEqual(["sessions", "laps"]);
    expect(calls[1].rows).toEqual([
      { session_id: "s1", lap_nr: 1, time_ms: 62_345 },
      { session_id: "s1", lap_nr: 2, time_ms: 61_870 },
    ]);
  });

  it("creates a new track first, ignoring duplicates so retries are safe", async () => {
    const { calls, client } = fakeClient();
    await saveSession(client, item({ track: { id: "t9", isNew: true, name: "Ring", isCustom: true } }));
    expect(calls.map((c) => c.table)).toEqual(["tracks", "sessions", "laps"]);
    expect(calls[0].opts).toMatchObject({ onConflict: "id", ignoreDuplicates: true });
  });

  it("flags network failures so the caller can queue the session", async () => {
    const { client } = fakeClient({ sessions: "TypeError: Failed to fetch" });
    await expect(saveSession(client, item())).rejects.toMatchObject({ network: true });
  });

  it("treats everything as a network failure while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { client } = fakeClient({ sessions: "whatever" });
    await expect(saveSession(client, item())).rejects.toMatchObject({ network: true });
  });

  it("removes the half-written session on a real (non-network) lap error", async () => {
    const { calls, client } = fakeClient({ laps: "new row violates check constraint" });
    const err = await saveSession(client, item()).catch((e) => e);
    expect(err).toBeInstanceOf(SaveError);
    expect(err.network).toBe(false);
    expect(calls.at(-1)).toMatchObject({ table: "sessions", op: "delete" });
  });

  it("keeps the session on a network error while writing laps (retry fills the gap)", async () => {
    const { calls, client } = fakeClient({ laps: "Failed to fetch" });
    await expect(saveSession(client, item())).rejects.toMatchObject({ network: true });
    expect(calls.some((c) => c.op === "delete")).toBe(false);
  });
});
