/**
 * ATHL3TE AI relay + shared workout library — Cloudflare Worker
 *
 * Holds your Anthropic API key privately, forwards the workout-builder chat
 * from the leaderboard app to the Claude API, and stores the gym's saved
 * workouts in KV so every device shares one library. Deploy per AI_SETUP.md;
 * the library needs a KV namespace bound as LIB.
 */
const ALLOWED_MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001"];
const MAX_TOKENS_CAP = 8000;
const LIB_KEY = "library";
const LIB_MAX = 20_000_000;   // KV value cap is 25MB — refuse before we hit it

export default {
  async fetch(request, env) {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return new Response("POST only", { status: 405, headers: cors });

    let body;
    try { body = await request.json(); }
    catch { return new Response("bad json", { status: 400, headers: cors }); }

    // ---- shared workout library (one KV key, last-write-wins per board) ----
    const json = (o, status) => new Response(JSON.stringify(o), {
      status: status || 200, headers: { "content-type": "application/json", ...cors } });
    // ---- live session state (D1: strongly consistent, fast enough to poll) ----
    if (body.op === "s.get" || body.op === "s.put") {
      if (!env.DB) return json({ error: "session storage not set up (bind a D1 database as DB)" }, 500);
      await env.DB.exec("CREATE TABLE IF NOT EXISTS sess (k TEXT PRIMARY KEY, v TEXT)");
      if (body.op === "s.put") {
        const v = JSON.stringify(body.v || null);
        if (v.length > 1_000_000) return json({ error: "state too large" }, 413);
        await env.DB.prepare("INSERT INTO sess (k,v) VALUES ('s',?1) ON CONFLICT(k) DO UPDATE SET v=?1")
          .bind(v).run();
        return json({ ok: 1 });
      }
      const row = await env.DB.prepare("SELECT v FROM sess WHERE k='s'").first();
      let v = null; try { v = row && JSON.parse(row.v); } catch {}
      return json({ v });
    }

    if (body.op === "lib.list" || body.op === "lib.put") {
      if (!env.LIB) return json({ error: "library storage not set up (bind a KV namespace as LIB)" }, 500);
      const lib = (await env.LIB.get(LIB_KEY, "json")) || {};
      if (body.op === "lib.list") return json({ presets: Object.values(lib) });
      const name = String(body.name || "").slice(0, 60).trim();
      if (!name) return json({ error: "no name" }, 400);
      const rec = { name, ts: parseInt(body.ts, 10) || Date.now() };
      if (body.del) rec.del = true;
      else {
        if (!body.cfg || typeof body.cfg !== "object") return json({ error: "no cfg" }, 400);
        rec.cfg = body.cfg;
        if (body.seedV) rec.seedV = body.seedV;
      }
      lib[name] = rec;
      const out = JSON.stringify(lib);
      if (out.length > LIB_MAX) return json({ error: "library full" }, 413);
      await env.LIB.put(LIB_KEY, out);
      return json({ ok: 1, ts: rec.ts });
    }

    const model = ALLOWED_MODELS.includes(body.model) ? body.model : ALLOWED_MODELS[0];
    const payload = {
      model,
      max_tokens: Math.min(parseInt(body.max_tokens, 10) || 4000, MAX_TOKENS_CAP),
      system: String(body.system || "").slice(0, 40000),
      messages: (Array.isArray(body.messages) ? body.messages : []).slice(-30).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 20000),
      })),
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json", ...cors },
    });
  },
};
