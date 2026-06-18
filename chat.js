export const config = { runtime: "edge" };

const RATE_LIMIT = new Map();
const MAX_CALLS  = 5;
const WINDOW_MS  = 60 * 60 * 1000;

export default async function handler(req) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const ip  = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const rec = RATE_LIMIT.get(ip);

  if (rec) {
    if (now - rec.ts > WINDOW_MS) {
      RATE_LIMIT.set(ip, { count: 1, ts: now });
    } else if (rec.count >= MAX_CALLS) {
      return new Response(
        JSON.stringify({ error: "rate_limit" }),
        { status: 429, headers }
      );
    } else {
      RATE_LIMIT.set(ip, { count: rec.count + 1, ts: rec.ts });
    }
  } else {
    RATE_LIMIT.set(ip, { count: 1, ts: now });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }

  const { messages, system } = body;
  if (!messages || !Array.isArray(messages))
    return new Response(JSON.stringify({ error: "Missing messages" }), { status: 400, headers });

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey)
    return new Response(JSON.stringify({ error: "no_key" }), { status: 500, headers });

  const groqMessages = [
    { role: "system", content: system || "" },
    ...messages
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        max_tokens:  300,
        temperature: 0.65,
        messages:    groqMessages,
      }),
    });

    const data = await res.json();

    if (!res.ok)
      return new Response(
        JSON.stringify({ error: data.error?.message || "Groq error" }),
        { status: 502, headers }
      );

    const text = data.choices?.[0]?.message?.content || "";
    return new Response(
      JSON.stringify({ content: [{ type: "text", text }] }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
}