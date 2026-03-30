// ═══════════════════════════════════════════════════════════════
//  MODY — WhatsApp Cloud API Integration
//  Load order: 11.5 (depends on: config.js, ui.js)
//  Uses Supabase Edge Function "whatsapp-send" as proxy
//  OR direct API calls if edge function URL is not set
// ═══════════════════════════════════════════════════════════════

// ── SEND WHATSAPP MESSAGE ──────────────────────────────────
async function sendWhatsApp(phone, templateName, params) {
  if (!settings.wa_enabled || settings.wa_enabled === "false" || settings.wa_enabled === false) return;
  if (!phone) return;

  // Clean phone number: remove spaces, dashes, ensure + prefix
  phone = phone.replace(/[\s\-()]/g, "");
  if (!phone.startsWith("+")) phone = "+995" + phone.replace(/^0+/, ""); // Default Georgia country code

  var token = settings.wa_api_token || "";
  var phoneId = settings.wa_phone_id || "";
  var edgeFnUrl = settings.wa_edge_function_url || "";

  if (!token || !phoneId) return;

  var body = {
    messaging_product: "whatsapp",
    to: phone.replace("+", ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: lang === "ka" ? "ka" : lang === "ru" ? "ru" : "en" },
      components: params && params.length ? [{
        type: "body",
        parameters: params.map(function(p) { return { type: "text", text: String(p) }; })
      }] : []
    }
  };

  try {
    if (edgeFnUrl) {
      // Use Supabase Edge Function as secure proxy
      await fetch(edgeFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (user ? (await sb.auth.getSession()).data.session.access_token : "") },
        body: JSON.stringify({ phone: phone, template: templateName, params: params })
      });
    } else {
      // Direct API call (token exposed in frontend — not recommended for production)
      await fetch("https://graph.facebook.com/v21.0/" + phoneId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(body)
      });
    }
  } catch(e) {
    console.log("WhatsApp send failed:", e.message);
  }
}

// ── SEND FREE-FORM TEXT MESSAGE (within 24hr window) ───────
async function sendWhatsAppText(phone, text) {
  if (!settings.wa_enabled || settings.wa_enabled === "false" || settings.wa_enabled === false) return;
  if (!phone || !text) return;

  phone = phone.replace(/[\s\-()]/g, "");
  if (!phone.startsWith("+")) phone = "+995" + phone.replace(/^0+/, "");

  var token = settings.wa_api_token || "";
  var phoneId = settings.wa_phone_id || "";
  var edgeFnUrl = settings.wa_edge_function_url || "";

  if (!token || !phoneId) return;

  var body = {
    messaging_product: "whatsapp",
    to: phone.replace("+", ""),
    type: "text",
    text: { body: text }
  };

  try {
    if (edgeFnUrl) {
      await fetch(edgeFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (user ? (await sb.auth.getSession()).data.session.access_token : "") },
        body: JSON.stringify({ phone: phone, text: text })
      });
    } else {
      await fetch("https://graph.facebook.com/v21.0/" + phoneId + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(body)
      });
    }
  } catch(e) {
    console.log("WhatsApp text send failed:", e.message);
  }
}

// ── BOOKING EVENT NOTIFICATIONS ────────────────────────────
function waNotifyBooking(booking, event) {
  if (!settings.wa_enabled || settings.wa_enabled === "false") return;

  var clientPhone = booking.client_phone || "";
  var proPhone = booking.pro_phone || "";
  var clientName = booking.client_name || "Client";
  var proName = booking.pro_name || "Professional";
  var service = booking.service_name || "Service";
  var timeSlot = booking.time_slot || "";
  var address = booking.address || "";

  switch(event) {
    case "new_booking":
      // Notify professional about new booking
      sendWhatsAppText(proPhone,
        "📋 MODY — New Booking!\n\n"
        + "Client: " + clientName + "\n"
        + "Service: " + service + "\n"
        + "Time: " + timeSlot + "\n"
        + "Address: " + address + "\n\n"
        + "Open the MODY app to accept or decline.");
      // Confirm to client
      sendWhatsAppText(clientPhone,
        "✅ MODY — Booking Confirmed!\n\n"
        + "Service: " + service + "\n"
        + "Professional: " + proName + "\n"
        + "Time: " + timeSlot + "\n\n"
        + "We'll notify you when your professional accepts.");
      break;

    case "accepted":
      sendWhatsAppText(clientPhone,
        "🎉 MODY — Booking Accepted!\n\n"
        + proName + " has accepted your booking.\n"
        + "Service: " + service + "\n"
        + "Time: " + timeSlot + "\n\n"
        + "Your professional will arrive on time!");
      break;

    case "on_the_way":
      sendWhatsAppText(clientPhone,
        "🚗 MODY — On The Way!\n\n"
        + proName + " is heading to your location now.\n"
        + "Address: " + address + "\n\n"
        + "Please be ready!");
      break;

    case "arrived":
      sendWhatsAppText(clientPhone,
        "📍 MODY — Professional Arrived!\n\n"
        + proName + " has arrived at your location.\n"
        + "Please confirm the arrival in the app.");
      break;

    case "in_progress":
      // No WhatsApp needed, they're together
      break;

    case "completed":
      sendWhatsAppText(clientPhone,
        "⭐ MODY — Service Completed!\n\n"
        + "Your " + service + " session with " + proName + " is complete.\n\n"
        + "Please leave a review in the app. Thank you!");
      sendWhatsAppText(proPhone,
        "✅ MODY — Service Completed!\n\n"
        + service + " for " + clientName + " is marked as complete.\n"
        + "Great job! 💅");
      break;

    case "cancelled":
      sendWhatsAppText(proPhone,
        "❌ MODY — Booking Cancelled\n\n"
        + "Booking for " + service + " with " + clientName + " has been cancelled.\n"
        + "Time: " + timeSlot);
      sendWhatsAppText(clientPhone,
        "❌ MODY — Booking Cancelled\n\n"
        + "Your booking for " + service + " has been cancelled.\n"
        + "You can book again anytime on MODY.");
      break;

    case "declined":
      sendWhatsAppText(clientPhone,
        "😔 MODY — Booking Declined\n\n"
        + proName + " was unable to accept your booking for " + service + ".\n"
        + "Time: " + timeSlot + "\n\n"
        + "Please try another professional or time slot.");
      break;
  }
}

// ── TEST WHATSAPP CONNECTION ───────────────────────────────
async function testWhatsApp() {
  var phone = settings.wa_test_phone || settings.alert_email || "";
  var testPhone = prompt("Enter phone number to test (with country code, e.g. +995...):");
  if (!testPhone) return;

  toast("Sending test message...");
  try {
    await sendWhatsAppText(testPhone, "✅ MODY WhatsApp integration is working! 🎉");
    toast("Test message sent! Check WhatsApp.", "ok");
  } catch(e) {
    toast("Test failed: " + e.message, "err");
  }
}
