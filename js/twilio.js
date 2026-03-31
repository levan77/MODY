// ═══════════════════════════════════════════════════════════════
//  MODY — Twilio SMS/WhatsApp Notifications
//  Load order: 11.5 (depends on: config.js, ui.js)
//  Calls Supabase Edge Function: twilio-send
// ═══════════════════════════════════════════════════════════════

// ── SEND VIA TWILIO EDGE FUNCTION ─────────────────────────
async function sendTwilioNotification(phone, type, name, details) {
  if (!settings.twilio_enabled || settings.twilio_enabled === "false") return;
  if (!phone) return;

  var edgeFnUrl = settings.twilio_edge_function_url || "";
  if (!edgeFnUrl) return;

  try {
    var session = await sb.auth.getSession();
    var token = session.data && session.data.session ? session.data.session.access_token : "";

    await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ phone: phone, type: type, name: name, details: details })
    });
  } catch(e) {
    console.log("Twilio notification failed:", e.message);
  }
}

// ── BOOKING EVENT NOTIFICATIONS ────────────────────────────
function twilioNotifyBooking(booking, event) {
  if (!settings.twilio_enabled || settings.twilio_enabled === "false") return;

  var clientPhone  = booking.client_phone || "";
  var proPhone     = booking.pro_phone || "";
  var clientName   = booking.client_name || "კლიენტი";
  var proName      = booking.pro_name || "სპეციალისტი";
  var service      = booking.service_name || "";
  var timeSlot     = booking.time_slot || "";
  var details      = service + (timeSlot ? " · " + timeSlot : "");

  switch (event) {
    case "new_booking":
      sendTwilioNotification(proPhone, "pro_new", proName, clientName + " · " + details);
      sendTwilioNotification(clientPhone, "new_booking", clientName, details);
      break;
    case "accepted":
      sendTwilioNotification(clientPhone, "accepted", clientName, proName + " · " + details);
      break;
    case "on_the_way":
      sendTwilioNotification(clientPhone, "on_the_way", clientName, proName);
      break;
    case "arrived":
      sendTwilioNotification(clientPhone, "arrived", clientName, proName);
      break;
    case "in_progress":
      sendTwilioNotification(clientPhone, "in_progress", clientName, service);
      break;
    case "completed":
      sendTwilioNotification(clientPhone, "completed", clientName, service);
      sendTwilioNotification(proPhone, "pro_completed", proName, clientName + " · " + service);
      break;
    case "cancelled":
      sendTwilioNotification(clientPhone, "cancelled", clientName, details);
      sendTwilioNotification(proPhone, "pro_cancelled", proName, clientName + " · " + details);
      break;
    case "declined":
      sendTwilioNotification(clientPhone, "declined", clientName, proName + " · " + details);
      break;
  }
}

// ── TEST TWILIO CONNECTION ─────────────────────────────────
async function testTwilio() {
  var testPhone = prompt("Enter phone number to test (e.g. +995599...):");
  if (!testPhone) return;
  toast("Sending Twilio test message...");
  try {
    var session = await sb.auth.getSession();
    var token = session.data && session.data.session ? session.data.session.access_token : "";
    var edgeFnUrl = settings.twilio_edge_function_url || "";
    if (!edgeFnUrl) { toast("Edge function URL not set", "err"); return; }

    var r = await fetch(edgeFnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ phone: testPhone, type: "new_booking", name: "სატესტო", details: "MODY Twilio test ✅" })
    });
    var data = await r.json();
    if (r.ok) toast("Twilio test message sent! Check your phone.", "ok");
    else toast("Twilio error: " + (data.error || r.status) + (data.details && data.details.message ? " — " + data.details.message : ""), "err");
  } catch(e) {
    toast("Twilio test failed: " + e.message, "err");
  }
}
