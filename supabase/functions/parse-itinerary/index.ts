import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are a travel itinerary parser. Given raw reservation/booking text and/or document images, extract structured events.

Additionally, provide a high-level "summary" of the whole trip. This should include:
- A "notes" section summarizing the overall trip (e.g., duration, main destination, key theme like "Honeymoon" or "Business Trip", or important trip-wide reminders found in the documents).
- A "links" section for any useful resources mentioned that apply to the whole trip rather than a specific event (e.g., general travel insurance, destination guides, or shared cloud folder links).

Return a JSON object containing an "events" array and an optional "summary" object.

Each event object has these fields:
- type: one of "flight", "accommodation", "activity", "transfer"
- title: short descriptive title (for flights use "Origin → Destination" format, e.g. "Toronto → Belize City")
- date: ISO date string YYYY-MM-DD (departure date for flights, check-in for accommodation)
- endDate: ISO date string YYYY-MM-DD (only for accommodation, the check-out date)
- departureLocation: departure city/airport (flights only)
- departureTime: HH:MM in 24h format departure time (flights only)
- arrivalLocation: arrival city/airport (flights only)
- arrivalTime: HH:MM in 24h format arrival time (flights only)
- time: HH:MM in 24h format if available (non-flight events)
- location: city, airport code, or venue name (non-flight events)
- address: street address if available
- confirmationCode: booking reference / PNR if found
- flightNumber: airline code + number (e.g. AC1234) if applicable
- notes: any extra useful details from the text
- links: array of {label, url} if URLs are present

Rules:
- For flights, create ONE event per flight with type "flight". A flight from Toronto to Belize is a single event, not separate departure/arrival events. Include departureLocation, departureTime, arrivalLocation, arrivalTime.
- For hotels/resorts/stays, use type "accommodation" with date (check-in) and endDate (check-out). Do NOT split into separate check-in/check-out events.
- Omit fields that have no data (don't include null or empty strings).
- If you cannot determine a date, use today's date.
- Be thorough: extract every piece of useful information from all provided documents and text.
- Process ALL documents/images provided and extract ALL events from each one.`;

const toolDef = {
  type: "function",
  function: {
    name: "return_parsed_itinerary",
    description: "Return the parsed itinerary events and a trip summary as structured data.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "object",
          properties: {
            notes: { type: "string", description: "A high-level overview or trip-wide notes extracted from the documents." },
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  url: { type: "string" },
                },
                required: ["label", "url"],
              },
              description: "Trip-wide links/resources.",
            },
          },
        },
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["flight", "accommodation", "activity", "transfer"] },
              title: { type: "string" },
              date: { type: "string" },
              endDate: { type: "string" },
              departureLocation: { type: "string" },
              departureTime: { type: "string" },
              arrivalLocation: { type: "string" },
              arrivalTime: { type: "string" },
              time: { type: "string" },
              location: { type: "string" },
              address: { type: "string" },
              confirmationCode: { type: "string" },
              flightNumber: { type: "string" },
              notes: { type: "string" },
              links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["label", "url"],
                },
              },
            },
            required: ["type", "title", "date"],
          },
        },
      },
      required: ["events"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { text, files } = body;

    // files: array of { data: string (base64 data URI), name: string, type: string }
    const hasText = text && typeof text === "string" && text.trim();
    const hasFiles = Array.isArray(files) && files.length > 0;

    if (!hasText && !hasFiles) {
      return new Response(JSON.stringify({ error: "Missing text or files" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build multimodal user message content
    const userContent: any[] = [];

    if (hasFiles) {
      for (const file of files) {
        const dataUri: string = file.data;
        // Extract mime type and base64 from data URI
        const match = dataUri.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          
          if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
            userContent.push({
              type: "image_url",
              image_url: { url: dataUri },
            });
          } else {
            // For non-image/non-pdf files, decode as text
            try {
              const decoded = atob(base64Data);
              userContent.push({ type: "text", text: `--- Document: ${file.name} ---\n${decoded}` });
            } catch {
              userContent.push({ type: "text", text: `--- Document: ${file.name} (binary, could not decode) ---` });
            }
          }
        }
      }
    }

    if (hasText) {
      userContent.push({ type: "text", text });
    }

    if (userContent.length === 0) {
      userContent.push({ type: "text", text: "No content provided." });
    }

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
          { role: "user", content: userContent },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "return_parsed_itinerary" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI parsing failed" }), {
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
    console.error("parse-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
