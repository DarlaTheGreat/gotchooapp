// gotchoo coach endpoint: POST /api/coach
// Keeps the Anthropic API key on the server and streams plain text back to the page.
// Environment variables (Netlify > Site configuration > Environment variables):
//   ANTHROPIC_API_KEY  required
//   ANTHROPIC_MODEL    optional, defaults to claude-sonnet-5
//   ALLOWED_ORIGIN     optional, e.g. https://dariasur.com (blocks calls from other sites)

const MAX_CHARS = 16000;   // total characters accepted per request
const MAX_TURNS = 20;      // conversation turns accepted per request
const MAX_TOKENS = 3000;   // cap on each answer's length (cost control)

const GUARD = `You are the gotchoo coaching service, a cross-cultural workplace coach. Only help with workplace communication, cross-cultural adaptation and related professional situations. Observe rather than judge. If a request is unrelated (coding, homework, general chat, anything harmful), reply briefly that gotchoo only coaches on workplace communication. Follow the detailed instructions inside the user's first message.`;

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.get("origin");
  if (allowed && origin && !allowed.split(",").map(s => s.trim()).includes(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response("Coach not configured", { status: 503 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length || messages.length > MAX_TURNS) return new Response("Bad request", { status: 400 });
  const clean = messages.map(m => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? ""),
  }));
  if (clean[clean.length - 1].role !== "user") return new Response("Bad request", { status: 400 });
  if (clean.reduce((n, m) => n + m.content.length, 0) > MAX_CHARS) return new Response("Too long", { status: 413 });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: MAX_TOKENS,
      system: GUARD,
      messages: clean,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 ? 429 : 502;
    console.error("Anthropic API error", upstream.status, await upstream.text().catch(() => ""));
    return new Response("Upstream error", { status });
  }

  // Convert Anthropic's server-sent events into a plain text stream of the answer.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            let evt;
            try { evt = JSON.parse(line.slice(5)); } catch { continue; }
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              controller.enqueue(enc.encode(evt.delta.text));
            } else if (evt.type === "error") {
              controller.enqueue(enc.encode("\n[[COACH_ERROR]]"));
            }
          }
        }
      } catch (e) {
        console.error("Stream error", e);
        controller.enqueue(enc.encode("\n[[COACH_ERROR]]"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
};

export const config = {
  path: "/api/coach",
  // Netlify rate limiting: at most 20 requests per minute from one IP address.
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
