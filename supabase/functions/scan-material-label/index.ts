import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const EMPTY_RESULT = {
  brand: null,
  color_name: null,
  color_code: null,
  material_type: null,
  fiber_content: null,
  yarn_weight: null,
  needle_size_mm: null,
  needle_size_us: null,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(EMPTY_RESULT), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify(EMPTY_RESULT), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64, mime_type } = await req.json();
    if (!image_base64 || !mime_type) {
      return new Response(JSON.stringify(EMPTY_RESULT), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mime_type,
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: `You are analyzing a photo of a craft material label (yarn, thread, fabric, etc). Extract the following information if visible:

- brand: The manufacturer or brand name
- color_name: The color name or colorway
- color_code: The manufacturer's color code or number (e.g. DMC #321, color number)
- material_type: One of "yarn", "thread/floss", "needle", "fabric", or "other"
- fiber_content: The fiber composition (e.g. "100% merino wool", "80% acrylic 20% wool")
- yarn_weight: The yarn weight category. Must be one of: "Lace (0)", "Fingering (1)", "Sport (2)", "DK (3)", "Worsted (4)", "Aran (5)", "Bulky (6)", "Super Bulky (7)", "Jumbo (8)". Only include if this is yarn.
- needle_size_mm: Recommended needle/hook size in millimeters (number only)
- needle_size_us: Recommended needle/hook size in US sizing (e.g. "US 7")

DO NOT extract: price, barcode numbers, care/washing symbols, retailer information, promotional text, recycling fees, or any unrelated numbers.

Return ONLY a JSON object with these fields. Use null for any field you cannot confidently identify. Do not include any text outside the JSON object.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic API error:", response.status, errBody);
      return new Response(JSON.stringify(EMPTY_RESULT), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";
    console.log("Claude response text:", text);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify(EMPTY_RESULT), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      brand: parsed.brand ?? null,
      color_name: parsed.color_name ?? null,
      color_code: parsed.color_code ?? null,
      material_type: parsed.material_type ?? null,
      fiber_content: parsed.fiber_content ?? null,
      yarn_weight: parsed.yarn_weight ?? null,
      needle_size_mm: parsed.needle_size_mm ?? null,
      needle_size_us: parsed.needle_size_us ?? null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify(EMPTY_RESULT), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
