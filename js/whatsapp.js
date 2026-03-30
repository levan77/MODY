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

// ── DEFAULT MESSAGE TEMPLATES ──────────────────────────────
// Placeholders: {client}, {pro}, {service}, {time}, {address}
var WA_DEFAULTS = {
  new_booking_pro:  "📋 MODY — New Booking!\n\nClient: {client}\nService: {service}\nTime: {time}\nAddress: {address}\n\nOpen the MODY app to accept or decline.",
  new_booking_client: "✅ MODY — Booking Confirmed!\n\nService: {service}\nProfessional: {pro}\nTime: {time}\n\nWe'll notify you when your professional accepts.",
  accepted_client: "🎉 MODY — Booking Accepted!\n\n{pro} has accepted your booking.\nService: {service}\nTime: {time}\n\nYour professional will arrive on time!",
  on_the_way_client: "🚗 MODY — On The Way!\n\n{pro} is heading to your location now.\nAddress: {address}\n\nPlease be ready!",
  arrived_client: "📍 MODY — Professional Arrived!\n\n{pro} has arrived at your location.\nPlease confirm the arrival in the app.",
  completed_client: "⭐ MODY — Service Completed!\n\nYour {service} session with {pro} is complete.\n\nPlease leave a review in the app. Thank you!",
  completed_pro: "✅ MODY — Service Completed!\n\n{service} for {client} is marked as complete.\nGreat job! 💅",
  cancelled_client: "❌ MODY — Booking Cancelled\n\nYour booking for {service} has been cancelled.\nYou can book again anytime on MODY.",
  cancelled_pro: "❌ MODY — Booking Cancelled\n\nBooking for {service} with {client} has been cancelled.\nTime: {time}",
  declined_client: "😔 MODY — Booking Declined\n\n{pro} was unable to accept your booking for {service}.\nTime: {time}\n\nPlease try another professional or time slot."
};

function waTemplate(key, vars) {
  // Use custom template from settings if available, otherwise use default
  var tpl = settings["wa_tpl_" + key] || WA_DEFAULTS[key] || "";
  return tpl
    .replace(/\{client\}/g, vars.client || "Client")
    .replace(/\{pro\}/g, vars.pro || "Professional")
    .replace(/\{service\}/g, vars.service || "Service")
    .replace(/\{time\}/g, vars.time || "")
    .replace(/\{address\}/g, vars.address || "");
}

// ── BOOKING EVENT NOTIFICATIONS ────────────────────────────
function waNotifyBooking(booking, event) {
  if (!settings.wa_enabled || settings.wa_enabled === "false") return;

  var clientPhone = booking.client_phone || "";
  var proPhone = booking.pro_phone || "";
  var vars = {
    client: booking.client_name || "Client",
    pro: booking.pro_name || "Professional",
    service: booking.service_name || "Service",
    time: booking.time_slot || "",
    address: booking.address || ""
  };

  switch(event) {
    case "new_booking":
      sendWhatsAppText(proPhone, waTemplate("new_booking_pro", vars));
      sendWhatsAppText(clientPhone, waTemplate("new_booking_client", vars));
      break;
    case "accepted":
      sendWhatsAppText(clientPhone, waTemplate("accepted_client", vars));
      break;
    case "on_the_way":
      sendWhatsAppText(clientPhone, waTemplate("on_the_way_client", vars));
      break;
    case "arrived":
      sendWhatsAppText(clientPhone, waTemplate("arrived_client", vars));
      break;
    case "in_progress":
      break;
    case "completed":
      sendWhatsAppText(clientPhone, waTemplate("completed_client", vars));
      sendWhatsAppText(proPhone, waTemplate("completed_pro", vars));
      break;
    case "cancelled":
      sendWhatsAppText(clientPhone, waTemplate("cancelled_client", vars));
      sendWhatsAppText(proPhone, waTemplate("cancelled_pro", vars));
      break;
    case "declined":
      sendWhatsAppText(clientPhone, waTemplate("declined_client", vars));
      break;
  }
}

// ── RENDER TEMPLATE EDITOR ─────────────────────────────────
function renderWaTemplates() {
  var el = ge("waTemplateList");
  if (!el) return;
  var labels = {
    new_booking_pro: "📋 New Booking → Professional",
    new_booking_client: "✅ New Booking → Client",
    accepted_client: "🎉 Accepted → Client",
    on_the_way_client: "🚗 On the Way → Client",
    arrived_client: "📍 Arrived → Client",
    completed_client: "⭐ Completed → Client",
    completed_pro: "✅ Completed → Professional",
    cancelled_client: "❌ Cancelled → Client",
    cancelled_pro: "❌ Cancelled → Professional",
    declined_client: "😔 Declined → Client"
  };
  var keys = Object.keys(WA_DEFAULTS);
  el.innerHTML = keys.map(function(key) {
    var current = settings["wa_tpl_" + key] || WA_DEFAULTS[key];
    return "<div style=\"margin-bottom:12px;border-bottom:1px solid var(--br);padding-bottom:12px\">"
      + "<div style=\"font-weight:500;font-size:13px;margin-bottom:4px\">" + (labels[key] || key) + "</div>"
      + "<textarea id=\"waTpl_" + key + "\" style=\"width:100%;min-height:80px;font-size:12px;font-family:inherit;padding:8px;border:1px solid var(--br);border-radius:var(--rs);background:var(--bg2);color:var(--tx);resize:vertical\">" + current.replace(/</g, "&lt;") + "</textarea>"
      + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-top:4px\">"
      + "<span style=\"font-size:10px;color:var(--mu)\">Placeholders: {client} {pro} {service} {time} {address}</span>"
      + "<div style=\"display:flex;gap:4px\">"
      + "<button class=\"btn-sm btn-gh\" onclick=\"resetWaTpl('" + key + "')\">Reset</button>"
      + "<button class=\"btn-sm btn-ok\" onclick=\"saveWaTpl('" + key + "')\">Save</button>"
      + "</div></div></div>";
  }).join("");
}

function saveWaTpl(key) {
  var el = ge("waTpl_" + key);
  if (!el) return;
  saveSetting("wa_tpl_" + key, el.value);
}

function resetWaTpl(key) {
  var el = ge("waTpl_" + key);
  if (!el) return;
  el.value = WA_DEFAULTS[key];
  saveSetting("wa_tpl_" + key, WA_DEFAULTS[key]);
  toast("Reset to default", "ok");
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
