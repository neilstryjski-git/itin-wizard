import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GDRIVE_CLIENT_ID = Deno.env.get("GDRIVE_CLIENT_ID");
const GDRIVE_CLIENT_SECRET = Deno.env.get("GDRIVE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, email, code, redirect_uri } = await req.json();

    if (action === "exchange") {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GDRIVE_CLIENT_ID!,
          client_secret: GDRIVE_CLIENT_SECRET!,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokens.error_description || "Token exchange failed");

      // Store tokens in user_cloud_auth
      const { error } = await supabase
        .from("user_cloud_auth")
        .upsert({
          user_email: email,
          tokens: {
            ...tokens,
            expires_at: Date.now() + tokens.expires_in * 1000,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_token") {
      // Fetch stored tokens
      const { data, error } = await supabase
        .from("user_cloud_auth")
        .select("tokens")
        .eq("user_email", email)
        .single();

      if (error || !data) throw new Error("No tokens found for user");

      let { tokens } = data;
      // Refresh if expired (with 1 min buffer)
      if (Date.now() > tokens.expires_at - 60000) {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            refresh_token: tokens.refresh_token,
            client_id: GDRIVE_CLIENT_ID!,
            client_secret: GDRIVE_CLIENT_SECRET!,
            grant_type: "refresh_token",
          }),
        });

        const refreshed = await refreshResponse.json();
        if (!refreshResponse.ok) throw new Error("Token refresh failed");

        tokens = {
          ...tokens,
          ...refreshed,
          expires_at: Date.now() + (refreshed.expires_in || 3600) * 1000,
        };

        // Update stored tokens
        await supabase
          .from("user_cloud_auth")
          .update({ tokens, updated_at: new Date().toISOString() })
          .eq("user_email", email);
      }

      return new Response(JSON.stringify({ access_token: tokens.access_token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (e) {
    console.error("gdrive-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
