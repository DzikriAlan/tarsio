import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    takeaway: { type: "string" },
  },
  required: ["title", "body", "takeaway"],
};

function buildPrompt(
  questTitle: string,
  answers: { question: string; answer: string }[],
  lang: string
): string {
  const isId = lang === "id";
  const transcript = answers
    .map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer}`)
    .join("\n");

  const persona = isId
    ? `Kamu adalah "Tarsy", teman refleksi diri di aplikasi Tarsio. Gaya bicaramu hangat, santai, personal, pakai bahasa Indonesia sehari-hari (boleh "kamu", "aku", "nggak"). Kamu bukan terapis: jangan mendiagnosis, jangan memberi saran medis, jangan menggurui.`
    : `You are "Tarsy", a self-reflection companion in the Tarsio app. Your voice is warm, casual, and personal. You are not a therapist: never diagnose, never give medical advice, never lecture.`;

  const task = isId
    ? `Baca jawaban user di bawah dari misi "${questTitle}", lalu tulis refleksi "Tarsy POV" yang benar-benar spesifik ke jawaban mereka — bukan template umum.

Aturan:
- "title": 4-8 kata, puitis tapi membumi, tanpa tanda kutip.
- "body": 2 paragraf, dipisah "\\n\\n". Tiap paragraf 2-4 kalimat. Kutip atau rujuk detail nyata dari jawaban mereka supaya terasa didengar. Validasi dulu, baru reframe.
- "takeaway": 1-2 kalimat, satu langkah kecil dan konkret yang bisa dilakukan malam ini atau besok.
- Bahasa Indonesia. Jangan sebut kamu AI atau model.`
    : `Read the user's answers below from the quest "${questTitle}", then write a "Tarsy POV" reflection that is genuinely specific to their answers — not a generic template.

Rules:
- "title": 4-8 words, poetic but grounded, no quotation marks.
- "body": 2 paragraphs separated by "\\n\\n". Each 2-4 sentences. Quote or reference real details from their answers so they feel heard. Validate first, then reframe.
- "takeaway": 1-2 sentences, one small concrete step they can take tonight or tomorrow.
- English. Never mention that you are an AI or a model.`;

  return `${persona}\n\n${task}\n\n---\n${transcript}\n---`;
}

async function generateWithGemini(
  questTitle: string,
  answers: { question: string; answer: string }[],
  lang: string
): Promise<{ title: string; body: string; takeaway: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.interactions.create({
    model: GEMINI_MODEL,
    input: buildPrompt(questTitle, answers, lang),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESULT_SCHEMA,
    },
  });

  const parsed = JSON.parse(interaction.output_text ?? "");
  if (
    typeof parsed?.title !== "string" ||
    typeof parsed?.body !== "string" ||
    typeof parsed?.takeaway !== "string" ||
    !parsed.title.trim() ||
    !parsed.body.trim()
  ) {
    throw new Error("Gemini returned an unusable payload");
  }

  return {
    title: parsed.title.trim(),
    body: parsed.body.trim(),
    takeaway: parsed.takeaway.trim(),
  };
}

function generateReflection(
  questTitle: string,
  answers: { question: string; answer: string }[],
  lang: string
): { title: string; body: string; takeaway: string } {
  const isId = lang === "id";
  const answerValues = answers.map((a) => a.answer.toLowerCase());

  // Detect patterns from answers
  const hasOverthinking = answerValues.some((a) =>
    ["enough", "belong", "future", "compare", "worry", "overthinking"].includes(a)
  );
  const hasLowBoundary = answerValues.some((a) =>
    ["yes", "maybe", "fear", "guilt", "conflict", "people"].includes(a)
  );
  const hasCreative = answerValues.some((a) =>
    ["create", "creative"].includes(a)
  );
  const hasHighScale = answers.some(
    (a) => a.answer === "4" || a.answer === "5"
  );
  const hasLowScale = answers.some(
    (a) => a.answer === "1" || a.answer === "2"
  );
  const hasMoneyStress = answerValues.some((a) =>
    ["worry", "stress", "stranger", "mystery"].includes(a)
  );
  const textAnswers = answers.filter((a) => a.answer.length > 10);

  // Build personalized title
  let title: string;
  if (hasOverthinking) {
    title = isId
      ? "Pikiranmu Bukan Musuh, Tapi Sinyal"
      : "Your Thoughts Are Not the Enemy, They're Signals";
  } else if (hasLowBoundary) {
    title = isId
      ? "Batas Bukan Tembok, Tapi Jembatan Ke Diri Sendiri"
      : "Boundaries Aren't Walls, They're Bridges to Yourself";
  } else if (hasMoneyStress) {
    title = isId
      ? "Uang Bukan Cermin Nilaimu"
      : "Money Is Not a Mirror of Your Worth";
  } else if (hasCreative) {
    title = isId
      ? "Kreativitasmu Adalah Kekuatan Tersembunyi"
      : "Your Creativity Is a Hidden Strength";
  } else if (hasHighScale) {
    title = isId
      ? "Kamu Sudah Lebih Kuat Dari Yang Kamu Kiranya"
      : "You're Stronger Than You Think";
  } else {
    title = isId
      ? "Setiap Jawaban Adalah Langkah ke Depan"
      : "Every Answer Is a Step Forward";
  }

  // Build body paragraphs from answer analysis
  const bodyParts: string[] = [];

  if (hasOverthinking) {
    bodyParts.push(
      isId
        ? "Dari jawabanmu, aku lihat pikiran berputar yang sebenarnya cuma mau dilihat. Bukan dihentikan. Pikiran-pikiran itu bukti bahwa kamu peduli — dan peduli itu bukan kelemahan."
        : "From your answers, I see racing thoughts that actually just want to be seen. Not stopped. Those thoughts are proof that you care — and caring is not a weakness."
    );
  }

  if (hasLowBoundary) {
    bodyParts.push(
      isId
        ? "Kamu cenderung bilang iya dulu, baru memprosesnya setelahnya. Itu bukan kelemahan — itu tanda kamu menghargai hubungan. Tapi kamu boleh menghargai dirimu dengan cara yang sama."
        : "You tend to say yes first, then process it after. That's not a weakness — it shows you value connection. But you're allowed to value yourself the same way."
    );
  }

  if (hasMoneyStress) {
    bodyParts.push(
      isId
        ? "Soal uang, aku denger ada beban yang kamu bawa sendiri. Kamu nggak harus menyelesaikan semuanya hari ini. Satu langkah kecil — satu keputusan — sudah cukup."
        : "About money, I hear a weight you're carrying alone. You don't have to solve it all today. One small step — one decision — is enough."
    );
  }

  if (hasCreative) {
    bodyParts.push(
      isId
        ? "Ada energi kreatif di kamu yang mungkin sering kamu anggap remeh. Kamu bisa bikin sesuatu dari nggak ada — itu kekuatan yang langka."
        : "There's a creative energy in you that you might often overlook. You can make something from nothing — that's a rare strength."
    );
  }

  if (hasLowScale) {
    bodyParts.push(
      isId
        ? "Beberapa jawabanmu nunjukin kamu lagi di fase yang nggak gampang. Dan itu oke. Kamu nggak harus merasa 100% buat mulai. Mulai aja dari 1%."
        : "Some of your answers show you're in a phase that isn't easy. And that's okay. You don't need to feel 100% to start. Start from 1%."
    );
  }

  if (hasHighScale) {
    bodyParts.push(
      isId
        ? "Yang menarik, di beberapa area kamu sebenarnya udah merasa cukup baik. Itu worth dirayakan — jangan lupa lihat seberapa jauh kamu udah datang."
        : "What's interesting is that in some areas you actually feel quite good. That's worth celebrating — don't forget to see how far you've come."
    );
  }

  if (textAnswers.length > 0) {
    const firstText = textAnswers[0].answer;
    bodyParts.push(
      isId
        ? `Kamu nulis: "${firstText}". Itu bukan kalimat acak — itu petunjuk dari dirimu yang paling jujur. Simpan itu.`
        : `You wrote: "${firstText}". That's not a random sentence — it's a clue from your most honest self. Hold onto it.`
    );
  }

  if (bodyParts.length === 0) {
    bodyParts.push(
      isId
        ? "Setiap jawaban yang kamu pilih hari ini adalah cermin. Bukan buat dinilai, tapi buat dipahami. Kamu lagi mulai kenal dirimu lebih dalam — itu proses yang berani."
        : "Every answer you chose today is a mirror. Not to be judged, but to be understood. You're starting to know yourself deeper — that's a brave process."
    );
  }

  // Build takeaway
  let takeaway: string;
  if (hasOverthinking) {
    takeaway = isId
      ? "Malam ini, sebelum tidur, coba tanya: 'Apa yang aku peduliin hari ini?' Bukan 'Apa yang aku khawatirin?'"
      : "Tonight before sleep, try asking: 'What did I care about today?' Not 'What am I worried about?'";
  } else if (hasLowBoundary) {
    takeaway = isId
      ? "Minggu ini, coba bilang 'aku pikir dulu ya' sekali — bukan tidak, tapi jeda. Itu batas paling lembut."
      : "This week, try saying 'let me think about it' once — not no, but a pause. That's the gentlest boundary.";
  } else if (hasMoneyStress) {
    takeaway = isId
      ? "Besok, catat satu pengeluaran kecil yang bisa kamu tunda. Bukan buat ngirit, tapi buat merasa kendali."
      : "Tomorrow, note one small expense you can delay. Not to save money, but to feel in control.";
  } else {
    takeaway = isId
      ? "Pilih satu hal kecil dari jawabanmu hari ini. Lakukan besok. Bukan sempurna — cuma konsisten."
      : "Pick one small thing from your answers today. Do it tomorrow. Not perfect — just consistent.";
  }

  return { title, body: bodyParts.join("\n\n"), takeaway };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { quest_id, answers, lang } = await req.json();

    if (!quest_id || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: "Missing quest_id or answers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch quest title
    const { data: quest } = await supabase
      .from("quests")
      .select("title_id, title_en")
      .eq("id", quest_id)
      .single();

    const questTitle = quest
      ? lang === "id"
        ? quest.title_id
        : quest.title_en
      : "Quest";

    const language = lang || "id";

    let result: { title: string; body: string; takeaway: string };
    let source = "gemini";
    try {
      result = await generateWithGemini(questTitle, answers, language);
    } catch (err) {
      console.error("Gemini generation failed, falling back to template:", err);
      result = generateReflection(questTitle, answers, language);
      source = "fallback";
    }

    return new Response(JSON.stringify({ result, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to generate result" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
