import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";
import {
  assertReflectionShape,
  buildPrompt,
  generateReflection,
  RESULT_SCHEMA,
  type Answer,
} from "../_shared/reflection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";

async function generateWithGemini(
  questTitle: string,
  answers: Answer[],
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

  return assertReflectionShape(JSON.parse(interaction.output_text ?? ""));
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
