import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a thorough travel planning assistant. Analyze the user's message and extract travel planning information. You must be very diligent about gathering ALL necessary details.

Extract these fields if mentioned:
- tripName: a name for the trip
- destination: the travel destination (country and city if possible)
- travelers: list of travelers. For EACH traveler extract:
  - name: their full name
  - isMinor: whether they are under 18
  - citizenship: their passport country / nationality (e.g. "Canadian", "US", "British")
  - residency: their country of residence (e.g. "Canada", "USA", "UK") — this may differ from citizenship
- transitViaUSA: whether they will transit through the USA (connecting flights, layovers, etc.)
- transitCountry: any other transit country if not USA
- startDate: trip start date (YYYY-MM-DD format if possible)
- endDate: trip end date (YYYY-MM-DD format if possible)

IMPORTANT RULES:
1. Citizenship and residency are CRITICAL for determining visa/entry requirements. Always ask for both if not provided.
2. Each traveler may have different citizenship and residency — ask about each person individually if unclear.
3. If the user mentions a family or group, try to get names and details for each member.
4. Transit countries matter for visa requirements — always confirm the routing.
5. For minors, note that consent letters and additional documents are often required.
6. Be conversational and friendly, but thorough. Don't skip any field.

CHECKLIST REFINEMENT:
If a checklist is provided in the input, the user might want to add, change, or delete items. 
- If they mention something new that needs to be done, suggest adding it.
- If they want to change an existing item, suggest an update.
- If they want to remove something, suggest removing it.
Only suggest changes if the user's input clearly warrants it.

When generating the followUpMessage:
- Ask about ALL missing fields in one natural message
- Be specific: "What nationality/citizenship does each traveler hold?" not just "tell me more"
- If you have some travelers but missing their citizenship/residency, ask specifically for those details
- Mention WHY you need certain info (e.g. "I need citizenship info to check visa requirements")
- If refining a checklist, acknowledge the changes you've made.

If ALL fields are provided (including citizenship and residency for every traveler), set allComplete to true and generate a confirmation summary that includes each traveler's citizenship and residency.`;

const toolDef = {
  type: "function",
  function: {
    name: "return_analysis",
    description: "Return the extracted travel info, follow-up question, and checklist updates.",
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
                  citizenship: { type: "string", description: "Passport country / nationality" },
                  residency: { type: "string", description: "Country of current residence" },
                },
                required: ["name", "isMinor"],
              },
            },
            transitViaUSA: { type: "boolean" },
            transitCountry: { type: "string", description: "Any non-USA transit country" },
            startDate: { type: "string" },
            endDate: { type: "string" },
          },
        },
        missingFields: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "tripName", "destination", "travelers", "travelerCitizenship",
              "travelerResidency", "transitViaUSA", "startDate", "endDate"
            ],
          },
          description: "Include travelerCitizenship/travelerResidency if ANY traveler is missing those details",
        },
        followUpMessage: { type: "string" },
        allComplete: { type: "boolean" },
        checklistUpdates: {
          type: "object",
          properties: {
            add: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  url_label: { type: "string" },
                },
                required: ["title"],
              },
            },
            update: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  url_label: { type: "string" },
                  checked: { type: "boolean" },
                },
                required: ["id"],
              },
            },
            remove: {
              type: "array",
              items: { type: "string", description: "The ID of the item to remove" },
            },
          },
        },
      },
      required: ["extracted", "missingFields", "followUpMessage", "allComplete"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, currentChecklist } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userMessages = [
      { role: "system", content: systemPrompt },
    ];

    if (currentChecklist && currentChecklist.length > 0) {
      userMessages.push({
        role: "system",
        content: `The current checklist is: ${JSON.stringify(currentChecklist)}. You can suggest updates to this checklist based on the conversation.`
      });
    }

    userMessages.push(...messages);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: userMessages,
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
