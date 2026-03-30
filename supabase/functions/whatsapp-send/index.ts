// Supabase Edge Function: whatsapp-send
// Proxies WhatsApp Cloud API calls securely (keeps token server-side)
//
// Deploy: supabase functions deploy whatsapp-send
// Set secrets:
//   supabase secrets set WA_PHONE_ID=your_phone_number_id
//   supabase secrets set WA_API_TOKEN=your_access_token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { phone, template, params, text } = body;

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneId = Deno.env.get("WA_PHONE_ID");
    const token = Deno.env.get("WA_API_TOKEN");

    if (!phoneId || !token) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");

    let waBody: Record<string, unknown>;

    if (text) {
      // Free-form text message (within 24hr conversation window)
      waBody = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      };
    } else if (template) {
      // Template message
      waBody = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: params?.length
            ? [{ type: "body", parameters: params.map((p: string) => ({ type: "text", text: String(p) })) }]
            : [],
        },
      };
    } else {
      return new Response(JSON.stringify({ error: "Provide text or template" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const waRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(waBody),
      }
    );

    const waData = await waRes.json();

    return new Response(JSON.stringify(waData), {
      status: waRes.ok ? 200 : waRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
