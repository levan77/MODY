// ═══════════════════════════════════════════════════════════════
//  MODY — Bird (bird.com) WhatsApp Notifications
//  Load order: 11.6 (depends on: config.js, ui.js)
//  Calls Supabase Edge Function: bird-notifications
// ═══════════════════════════════════════════════════════════════

// ── SEND VIA BIRD EDGE FUNCTION ────────────────────────────
async function sendBirdNotification(phone, type, name, details) {
  if (!settings.bird_enabled || settings.bird_enabled === "false") return;
  if (!phone) return;

  var edgeFnUrl = settings.bird_edge_function_url || "";
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
    console.log("Bird notification failed:", e.message);
  }
}

// ── BOOKING EVENT NOTIFICATIONS ────────────────────────────
function birdNotifyBooking(booking, event) {
  if (!settings.bird_enabled || settings.bird_enabled === "false") return;

  var clientPhone  = booking.client_phone || "";
  var proPhone     = booking.pro_phone || "";
  var clientName   = booking.client_name || "კლიენტი";
  var proName      = booking.pro_name || "სპეციალისტი";
  var service      = booking.service_name || "";
  var timeSlot     = booking.time_slot || "";
  var details      = service + (timeSlot ? " · " + timeSlot : "");

  switch (event) {
    case "new_booking":
      // Notify pro about new booking
      sendBirdNotification(proPhone, "pro_new", proName, clientName + " · " + details);
      // Confirm to client
      sendBirdNotification(clientPhone, "new_booking", clientName, details);
      break;
    case "accepted":
      sendBirdNotification(clientPhone, "accepted", clientName, proName + " · " + details);
      break;
    case "on_the_way":
      sendBirdNotification(clientPhone, "on_the_way", clientName, proName);
      break;
    case "arrived":
      sendBirdNotification(clientPhone, "arrived", clientName, proName);
      break;
    case "in_progress":
      sendBirdNotification(clientPhone, "in_progress", clientName, service);
      break;
    case "completed":
      sendBirdNotification(clientPhone, "completed", clientName, service);
      sendBirdNotification(proPhone, "pro_completed", proName, clientName + " · " + service);
      break;
    case "cancelled":
      sendBirdNotification(clientPhone, "cancelled", clientName, details);
      sendBirdNotification(proPhone, "pro_cancelled", proName, clientName + " · " + details);
      break;
    case "declined":
      sendBirdNotification(clientPhone, "declined", clientName, proName + " · " + details);
      break;
  }
}

// ── TEST BIRD CONNECTION ───────────────────────────────────
async function testBird() {
  var testPhone = prompt("Enter phone number to test (e.g. +995599...):");
  if (!testPhone) return;
  toast("Sending Bird test message...");
  try {
    var session = await sb.auth.getSession();
    var token = session.data && session.data.session ? session.data.session.access_token : "";
    var edgeFnUrl = settings.bird_edge_function_url || "";
    if (!edgeFnUrl) { toast("Edge function URL not set", "err"); return; }

    var r = await fetch(edgeFnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ phone: testPhone, type: "new_booking", name: "სატესტო", details: "MODY Bird test ✅" })
    });
    var data = await r.json();
    if (r.ok) toast("Bird test message sent! Check WhatsApp.", "ok");
    else toast("Bird error: " + (data.error || r.status), "err");
  } catch(e) {
    toast("Bird test failed: " + e.message, "err");
  }
}
