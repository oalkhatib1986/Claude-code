/**
 * ATHL3TE AI relay + shared workout library — Cloudflare Worker
 *
 * Holds your Anthropic API key privately, forwards the workout-builder chat
 * from the leaderboard app to the Claude API, and stores the gym's saved
 * workouts in KV so every device shares one library. Deploy per AI_SETUP.md;
 * the library needs a KV namespace bound as LIB.
 */
// A CONVERSATION OPENS ON THE COACH (build 401): capping history at 30 can
// slice it so an assistant turn comes first, which the API rejects — drop
// leading non-user entries so the window always opens on a user message.
function trimUserFirst(arr) {
  let i = 0;
  while (i < arr.length && arr[i] && arr[i].role === "assistant") i++;
  return arr.slice(i);
}
// SCREENSHOTS IN THE CHAT (build 397): a message's content may be an array
// of vision blocks. Only base64 images of the usual web types (bounded) and
// text blocks pass; anything else is dropped. Strings pass as before.
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
function sanitizeContent(c) {
  if (!Array.isArray(c)) return String(c || "").slice(0, 20000);
  const out = [];
  for (const b of c.slice(0, 8)) {
    if (!b) continue;
    if (b.type === "image" && b.source && b.source.type === "base64"
        && IMG_TYPES.includes(b.source.media_type)
        && typeof b.source.data === "string" && b.source.data.length <= 2500000) {
      out.push({ type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } });
    } else if (b.type === "text") {
      out.push({ type: "text", text: String(b.text || "").slice(0, 20000) });
    }
  }
  return out.length ? out : "(empty)";
}
// Most capable first — the first entry is also the fallback for any
// unknown model an older app requests (build 395: the coach's AI runs
// the same model family as the engineering assistant).
const ALLOWED_MODELS = ["claude-fable-5-1", "claude-fable-5", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"];
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
      // `now` rides on every reply: THE RELAY IS THE REFEREE CLOCK. Devices
      // measure their own offset against it — a TV whose wall clock drifts 10s
      // must not show 9:10 on a 9:00 block (Omar's wall).
      if (body.op === "s.put") {
        const v = JSON.stringify(body.v || null);
        if (v.length > 1_000_000) return json({ error: "state too large" }, 413);
        await env.DB.prepare("INSERT INTO sess (k,v) VALUES ('s',?1) ON CONFLICT(k) DO UPDATE SET v=?1")
          .bind(v).run();
        return json({ ok: 1, now: Date.now() });
      }
      const row = await env.DB.prepare("SELECT v FROM sess WHERE k='s'").first();
      let v = null; try { v = row && JSON.parse(row.v); } catch {}
      return json({ v, now: Date.now() });
    }

    if (body.op === "lib.list" || body.op === "lib.put") {
      if (!env.LIB) return json({ error: "library storage not set up (bind a KV namespace as LIB)" }, 500);
      const lib = (await env.LIB.get(LIB_KEY, "json")) || {};
      if (body.op === "lib.list") return json({ presets: Object.values(lib) });
      const name = String(body.name || "").slice(0, 60).trim();
      if (!name) return json({ error: "no name" }, 400);
      const rec = { name, ts: parseInt(body.ts, 10) || Date.now() };
      if (body.del) {
        rec.del = true;
        // the recycle bin: a delete may carry the board's body, kept 30 days
        if (body.cfg && typeof body.cfg === "object") rec.cfg = body.cfg;
        if (body.seedV) rec.seedV = body.seedV;
      } else {
        if (!body.cfg || typeof body.cfg !== "object") return json({ error: "no cfg" }, 400);
        rec.cfg = body.cfg;
        if (body.seedV) rec.seedV = body.seedV;
      }
      lib[name] = rec;
      // empty the bin past 30 days: the cfg goes, the tombstone itself stays so
      // a stale device can never resurrect the board
      const cutoff = Date.now() - 30 * 86400000;
      for (const k in lib) { const r = lib[k];
        if (r && r.del && r.cfg && (r.ts || 0) < cutoff) delete r.cfg; }
      const out = JSON.stringify(lib);
      if (out.length > LIB_MAX) return json({ error: "library full" }, 413);
      await env.LIB.put(LIB_KEY, out);
      return json({ ok: 1, ts: rec.ts });
    }

    // ---- result emails (SendGrid; the gym's own address as the verified
    // single sender). The app hands us the finished rows; we send one message
    // per team that left an email, each recipient getting their own copy. ----
    if (body.op === "mail") {
      const KEY = env.SENDGRID_KEY, FROM = env.MAIL_FROM;
      if (!KEY || !FROM)
        return json({ error: "email not set up (set SENDGRID_KEY and MAIL_FROM env vars on the worker)" }, 500);
      const EMAILRE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const fromName = String(env.MAIL_FROM_NAME || "ATHL3TE").slice(0, 60);
      const board = String(body.board || "Workout").slice(0, 80);
      const unit = String(body.unit || "Score").slice(0, 20);
      const jobs = Array.isArray(body.results) ? body.results.slice(0, 60) : [];
      const unitTag = unit === "m" ? "M" : unit === "pts" ? "PTS" : "CAL";
      const hashtag = String(body.hashtag || "SENDITSATURDAY").replace(/[^A-Za-z0-9]/g, "").slice(0, 60);
      const date = String(body.date || "").slice(0, 40);
      // the share picture (Page 2): one PNG, attached to and embedded in every copy
      const img = String(body.image || "");
      const b64 = img.startsWith("data:") ? img.slice(img.indexOf(",") + 1) : "";
      const fname = (hashtag || "results") + ".png";
      let sent = 0, failed = 0;
      for (const j of jobs) {
        const to = (Array.isArray(j.to) ? j.to : [])
          .filter((x) => typeof x === "string" && EMAILRE.test(x)).slice(0, 5);
        if (!to.length) continue;
        const name = String(j.name || "Team").slice(0, 40);
        const rank = parseInt(j.rank, 10) || 0, of = parseInt(j.of, 10) || 0;
        const score = Math.round(+j.score || 0);
        const place = rank ? `#${rank}${of ? ` of ${of}` : ""}` : "";
        const text = [
          `${name}`, ``,
          place ? `You finished ${place} with ${score} ${unitTag}.` : `You scored ${score} ${unitTag}.`,
          ``, `Share it and tag @athletefitness.ae #${hashtag}`,
          ``, `— ${fromName}`,
        ].filter(Boolean).join("\n");
        const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5">`
          + `<p style="font-size:18px;font-weight:700;margin:0 0 8px">${name}</p>`
          + `<p style="font-size:16px;margin:0 0 4px">${place ? `You finished <b>${place}</b> with <b>${score} ${unitTag}</b>.` : `You scored <b>${score} ${unitTag}</b>.`}</p>`
          + `<p style="font-size:15px;margin:0 0 14px">Share it and tag <b>@athletefitness.ae</b> <b>#${hashtag}</b></p>`
          + (b64 ? `<img src="cid:results" alt="${board} results" style="display:block;max-width:100%;border-radius:8px"/>` : "")
          + `<p style="font-size:13px;color:#666;margin:14px 0 0">— ${fromName}</p></div>`;
        const mail = {
          // one personalization per address = each recipient gets their own copy
          personalizations: to.map((email) => ({ to: [{ email }] })),
          from: { email: FROM, name: fromName },
          subject: `${board} — Final Results${date ? ` · ${date}` : ""}`.slice(0, 120),
          content: [{ type: "text/plain", value: text }, { type: "text/html", value: html }],
        };
        if (b64) mail.attachments = [{
          content: b64, filename: fname, type: "image/png",
          disposition: "inline", content_id: "results",
        }];
        try {
          const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { authorization: "Bearer " + KEY, "content-type": "application/json" },
            body: JSON.stringify(mail),
          });
          if (r.ok || r.status === 202) sent += to.length; else failed += to.length;
        } catch { failed += to.length; }
      }
      return json({ ok: 1, sent, failed });
    }

    const model = ALLOWED_MODELS.includes(body.model) ? body.model : ALLOWED_MODELS[0];
    const payload = {
      model,
      max_tokens: Math.min(parseInt(body.max_tokens, 10) || 4000, MAX_TOKENS_CAP),
      system: String(body.system || "").slice(0, 40000),
      messages: trimUserFirst((Array.isArray(body.messages) ? body.messages : []).slice(-30)).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: sanitizeContent(m.content),
      })),
    };

    // TWO ROADS TO ANTHROPIC (build 401 — the edge's 403 "Request not
    // allowed" blocked the gateway path on Omar's floor-test day): the
    // AI Gateway (ANTHROPIC_URL, egress from Cloudflare's core network)
    // and the direct API are BOTH tried — a 403 door-slam on one road
    // immediately takes the other in the same request. Only when both
    // roads refuse does the app ever see the error.
    const routes = [];
    {
      const gw = (env.ANTHROPIC_URL || "").replace(/\/+$/, "");
      if (gw) routes.push(gw);
      routes.push("https://api.anthropic.com");
    }
    const reqBody = JSON.stringify(payload);
    let res = null;
    for (const base of routes) {
      res = await fetch(base + "/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: reqBody,
      });
      if (res.status !== 403) break;
    }

    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json", ...cors },
    });
  },
};
