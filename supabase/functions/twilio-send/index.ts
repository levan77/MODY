// Supabase Edge Function: twilio-send
// Sends SMS/WhatsApp messages via Twilio REST API
//
// Deploy:
//   supabase functions deploy twilio-send
//
// Set secrets:
//   supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
//   supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
//   supabase secrets set TWILIO_FROM_NUMBER=+1xxxxxxxxxx
//   supabase secrets set TWILIO_CHANNEL=sms   (or "whatsapp")

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

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const channel    = Deno.env.get("TWILIO_CHANNEL") || "sms";

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(JSON.stringify({ error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message text
    const msgFn = MESSAGES[type];
    const text = msgFn
      ? msgFn(name || "კლიენტო", details || "")
      : `MODY: ${details || type}`;

    // Clean phone number — ensure it starts with +country code
    let cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (!cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.replace(/^0+/, "");
      if (!cleanPhone.startsWith("995")) cleanPhone = "995" + cleanPhone;
      cleanPhone = "+" + cleanPhone;
    }

    // Format To/From for WhatsApp channel if configured
    const to   = channel === "whatsapp" ? `whatsapp:${cleanPhone}` : cleanPhone;
    const from = channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;

    // Twilio REST API — send message
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formBody = new URLSearchParams({
      To: to,
      From: from,
      Body: text,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      },
      body: formBody.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio API error:", JSON.stringify(twilioData));
      return new Response(JSON.stringify({ error: "Twilio API error", details: twilioData }), {
        status: twilioRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sid: twilioData.sid }), {
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
