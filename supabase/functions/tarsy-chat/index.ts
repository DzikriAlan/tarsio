import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";

type Msg = { role: "user" | "tarsy"; content: string };

function buildPrompt(history: Msg[], message: string, lang: string): string {
  const isId = lang === "id";

  const persona = isId
    ? `Kamu adalah "Tarsy", teman ngobrol di aplikasi refleksi diri Tarsio. Hangat, santai, pakai bahasa Indonesia sehari-hari ("kamu", "aku", "nggak"). Kamu bukan terapis: jangan mendiagnosis, jangan kasih saran medis, jangan menggurui.

Aturan balasan (WAJIB singkat — ini bubble chat):
- Maksimal 3 kalimat pendek. Idealnya 2.
- Dengerin dulu dan validasi perasaannya, baru tanya balik satu pertanyaan terbuka kalau memang pas.
- Jangan pakai bullet, heading, atau emoji berlebihan.
- Jangan sebut kamu AI atau model.
- Kalau dia cerita soal menyakiti diri sendiri atau krisis berat, akui perasaannya dengan lembut dan dorong dia bicara ke orang yang dipercaya atau layanan bantuan profesional.`
    : `You are "Tarsy", a chat companion in the Tarsio self-reflection app. Warm, casual, personal. You are not a therapist: never diagnose, never give medical advice, never lecture.

Reply rules (MUST be short — this is a chat bubble):
- 3 short sentences max. Two is ideal.
- Listen and validate first, then ask one open question if it fits.
- No bullets, no headings, no excessive emoji.
- Never mention that you are an AI or a model.
- If they mention self-harm or a serious crisis, gently acknowledge it and encourage them to reach out to someone they trust or a professional support line.`;

  const transcript = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Tarsy"}: ${m.content}`)
    .join("\n");

  const label = isId ? "Pesan terbaru user" : "User's latest message";

  return transcript
    ? `${persona}\n\n---\n${transcript}\n---\n\n${label}: ${message}`
    : `${persona}\n\n${label}: ${message}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, history, lang } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input: buildPrompt(Array.isArray(history) ? history : [], message, lang || "id"),
    });

    const reply = (interaction.output_text ?? "").trim();
    if (!reply) throw new Error("Gemini returned an empty reply");

    return new Response(JSON.stringify({ reply, source: "gemini" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tarsy-chat failed:", err);
    return new Response(JSON.stringify({ error: "Failed to generate reply" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
