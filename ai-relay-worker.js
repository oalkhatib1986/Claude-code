/**
 * ATHL3TE AI relay — Cloudflare Worker
 *
 * Holds your Anthropic API key privately and forwards the workout-builder
 * chat from the leaderboard app to the Claude API. Deploy per AI_SETUP.md.
 */
const ALLOWED_MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001"];
const MAX_TOKENS_CAP = 8000;

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
