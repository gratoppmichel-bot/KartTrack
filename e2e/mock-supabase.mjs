// Minimal in-memory stand-in for the Supabase endpoints KartTrack calls (auth + PostgREST).
// Used by the Playwright tests so they need no network and no real project.
import http from "node:http";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const USER = {
  id: "00000000-0000-0000-0000-00000000e2e1", aud: "authenticated", role: "authenticated",
  email: "e2e@test.local", app_metadata: {}, user_metadata: { username: "e2etest" }, created_at: new Date().toISOString(),
};
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.sig`;
const writes = [];

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : null;
  const send = (code, data) => {
    res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": req.headers.origin || "*",
      "access-control-allow-credentials": "true", "access-control-allow-headers": "*", "access-control-allow-methods": "*" });
    res.end(data === undefined ? "" : JSON.stringify(data));
  };
  if (req.method === "OPTIONS") return send(204);
  const p = url.pathname;
  if (p === "/__log") return send(200, writes);
  if (p === "/__reset") { writes.length = 0; return send(200, {}); }
  if (p === "/auth/v1/token") return send(200, { access_token: jwt, refresh_token: "r", expires_in: 3600, expires_at: 4102444800, token_type: "bearer", user: USER });
  if (p === "/auth/v1/user") return send(200, USER);
  if (p.startsWith("/rest/v1/rpc/")) { writes.push({ rpc: p.split("/").pop() }); return send(200, []); }
  if (p.startsWith("/rest/v1/")) {
    const table = p.split("/").pop();
    if (req.method === "GET") {
      const single = (req.headers.accept || "").includes("pgrst.object");
      if (table === "profiles") return send(200, single ? { username: "e2etest", xp: 0, equipped_reward_id: null, rewards: null } : [{ id: USER.id, username: "e2etest" }]);
      if (table === "tracks") return send(200, [{ id: "99999999-9999-9999-9999-999999999991", name: "E2E Testbahn", location: "Test", is_custom: false }]);
      return send(200, single ? null : []);
    }
    writes.push({ method: req.method, table, rows: Array.isArray(body) ? body.length : 1, body });
    return send(201, undefined);
  }
  send(404, {});
}).listen(54321, () => console.log("mock on 54321"));
