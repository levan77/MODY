// Supabase Edge Function: bird-notifications
// Sends WhatsApp messages via Bird (bird.com) Conversations API
//
// Deploy:
//   supabase functions deploy bird-notifications
//
// Set secrets:
//   supabase secrets set BIRD_API_KEY=your_api_key
//   supabase secrets set BIRD_WORKSPACE_ID=your_workspace_id
//   supabase secrets set BIRD_CHANNEL_ID=your_whatsapp_channel_id

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Georgian message templates
const MESSAGES: Record<string, (name: string, details: string) => string> = {
  new_booking:   (name, details) => `გამარჯობა ${name}, თქვენი ჯავშანი ${details}-ზე მიღებულია! 💅`,
  accepted:      (name, details) => `გამარჯობა ${name}, თქვენი ჯავშანი ${details} დადასტურებულია! მალე დაგიკავშირდებათ სპეციალისტი.`,
  on_the_way:    (name, details) => `გამარჯობა ${name}, თქვენი სპეციალისტი ${details} გზაშია! გთხოვთ მოემზადოთ. 🚗`,
  arrived:       (name, details) => `გამარჯობა ${name}, სპეციალისტი ${details} მოვიდა! გთხოვთ დაადასტუროთ ჩამოსვლა აპლიკაციაში. 📍`,
  in_progress:   (name, details) => `გამარჯობა ${name}, ${details} მომსახურება დაწყებულია. 💅`,
  completed:     (name, details) => `გამარჯობა ${name}, ${details} მომსახურება დასრულდა! გთხოვთ დატოვოთ შეფასება აპლიკაციაში. ⭐`,
  cancelled:     (_name, _details) => `ბოდიშს გიხდით, თქვენი ჯავშანი გაუქმებულია. შეგიძლიათ ახალი ჯავშანი გააკეთოთ ნებისმიერ დროს MODY-ზე.`,
  declined:      (name, details) => `გამარჯობა ${name}, სამწუხაროდ სპეციალისტმა ვერ მიიღო ${details} ჯავშანი. გთხოვთ სცადოთ სხვა სპეციალისტი.`,
  pro_new:       (name, details) => `გამარჯობა ${name}, ახალი ჯავშანი: ${details}. გთხოვთ გახსნათ MODY აპლიკაცია დასადასტურებლად. 📋`,
  pro_cancelled: (name, details) => `გამარჯობა ${name}, ჯავშანი ${details} გაუქმებულია. ❌`,
  pro_completed: (name, details) => `გამარჯობა ${name}, ${details} სამსახური შესრულდა! გმადლობთ. ✅`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify Supabase auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
    const { type, phone, name, details } = body as {
      type: string;
      phone: string;
      name: string;
      details: string;
    };

    if (!phone || !type) {
      return new Response(JSON.stringify({ error: "phone and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey     = Deno.env.get("BIRD_API_KEY");
    const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
    const channelId  = Deno.env.get("BIRD_CHANNEL_ID");

    if (!apiKey || !workspaceId || !channelId) {
      return new Response(JSON.stringify({ error: "Bird not configured. Set BIRD_API_KEY, BIRD_WORKSPACE_ID, BIRD_CHANNEL_ID." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message text
    const msgFn = MESSAGES[type];
    const text = msgFn
      ? msgFn(name || "კლიენტო", details || "")
      : `MODY: ${details || type}`;

    // Clean phone number — ensure it starts with country code, no +
    const cleanPhone = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
    const phoneWithCC = cleanPhone.startsWith("995")
      ? cleanPhone
      : "995" + cleanPhone.replace(/^0+/, "");

    // Bird Conversations API — create conversation + send message
    const birdRes = await fetch(
      `https://api.bird.com/workspaces/${workspaceId}/conversations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `AccessKey ${apiKey}`,
        },
        body: JSON.stringify({
          channels: [{ id: channelId }],
          contact: {
            identifiers: [{ key: "phonenumber", value: phoneWithCC }],
          },
          messages: [
            {
              body: {
                type: "text",
                text: { text },
              },
            },
          ],
        }),
      }
    );

    const birdData = await birdRes.json();

    if (!birdRes.ok) {
      console.error("Bird API error:", JSON.stringify(birdData));
      return new Response(JSON.stringify({ error: "Bird API error", details: birdData }), {
        status: birdRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: birdData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
