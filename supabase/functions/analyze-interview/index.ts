import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a travel planning assistant. Analyze the user's message and extract any travel planning information they've provided.

Extract these fields if mentioned:
- tripName: a name for the trip
- destination: the travel destination
- travelers: list of travelers with names and whether they are minors (under 18)
- transitViaUSA: whether they will transit through the USA
- startDate: trip start date
- endDate: trip end date

Also determine which fields are still missing and generate a friendly follow-up question asking ONLY about the missing information. If multiple fields are missing, ask about all of them in one natural conversational message.

If ALL fields are provided, set allComplete to true and generate a summary confirmation message instead.`;

const toolDef = {
  type: "function",
  function: {
    name: "return_analysis",
    description: "Return the extracted travel info and follow-up question.",
    parameters: {
      type: "object",
      properties: {
        extracted: {
          type: "object",
          properties: {
            tripName: { type: "string" },
            destination: { type: "string" },
            travelers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  isMinor: { type: "boolean" },
                },
                required: ["name", "isMinor"],
              },
            },
            transitViaUSA: { type: "boolean" },
            startDate: { type: "string" },
            endDate: { type: "string" },
          },
        },
        missingFields: {
          type: "array",
          items: { type: "string", enum: ["tripName", "destination", "travelers", "transitViaUSA", "startDate", "endDate"] },
        },
        followUpMessage: { type: "string" },
        allComplete: { type: "boolean" },
      },
      required: ["extracted", "missingFields", "followUpMessage", "allComplete"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
