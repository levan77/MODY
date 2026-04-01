// ═══════════════════════════════════════════════════════════════
//  MODY — Twilio SMS/WhatsApp Notifications (Direct API)
//  Load order: 11.5 (depends on: config.js, ui.js)
//  Calls Twilio REST API directly — no edge function needed
// ═══════════════════════════════════════════════════════════════

// Georgian message templates
var TWILIO_MSGS = {
  new_booking:   function(n, d) { return "გამარჯობა " + n + ", თქვენი ჯავშანი " + d + "-ზე მიღებულია! 💅"; },
  accepted:      function(n, d) { return "გამარჯობა " + n + ", თქვენი ჯავშანი " + d + " დადასტურებულია!"; },
  on_the_way:    function(n, d) { return "გამარჯობა " + n + ", თქვენი სპეციალისტი " + d + " გზაშია! 🚗"; },
  arrived:       function(n, d) { return "გამარჯობა " + n + ", სპეციალისტი " + d + " მოვიდა! 📍"; },
  in_progress:   function(n, d) { return "გამარჯობა " + n + ", " + d + " მომსახურება დაწყებულია. 💅"; },
  completed:     function(n, d) { return "გამარჯობა " + n + ", " + d + " მომსახურება დასრულდა! ⭐"; },
  cancelled:     function()     { return "ბოდიშს გიხდით, თქვენი ჯავშანი გაუქმებულია."; },
  declined:      function(n, d) { return "გამარჯობა " + n + ", სამწუხაროდ სპეციალისტმა ვერ მიიღო " + d + " ჯავშანი."; },
  pro_new:       function(n, d) { return "გამარჯობა " + n + ", ახალი ჯავშანი: " + d + ". გთხოვთ გახსნათ MODY. 📋"; },
  pro_cancelled: function(n, d) { return "გამარჯობა " + n + ", ჯავშანი " + d + " გაუქმებულია. ❌"; },
  pro_completed: function(n, d) { return "გამარჯობა " + n + ", " + d + " შესრულდა! გმადლობთ. ✅"; },
  custom:        function(n, d) { return d; }
};

// ── SEND SMS/WHATSAPP VIA TWILIO REST API ─────────────────
async function sendTwilioNotification(phone, type, name, details) {
  if (!settings.twilio_enabled || settings.twilio_enabled === "false") return;
  if (!phone) return;

  var sid = settings.twilio_account_sid || "";
  var token = settings.twilio_auth_token || "";
  var from = settings.twilio_from_number || "";
  var channel = settings.twilio_channel || "sms";

  if (!sid || !token || !from) return;

  // Build message text
  var msgFn = TWILIO_MSGS[type];
  var text = msgFn ? msgFn(name || "კლიენტო", details || "") : "MODY: " + (details || type);

  // Clean phone number
  var clean = phone.replace(/[\s\-()]/g, "");
  if (!clean.startsWith("+")) {
    clean = clean.replace(/^0+/, "");
    if (!clean.startsWith("995")) clean = "995" + clean;
    clean = "+" + clean;
  }

  // Format for WhatsApp if needed
  var to = channel === "whatsapp" ? "whatsapp:" + clean : clean;
  var fromNum = channel === "whatsapp" ? "whatsapp:" + from : from;

  try {
    await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(sid + ":" + token)
      },
      body: "To=" + encodeURIComponent(to) + "&From=" + encodeURIComponent(fromNum) + "&Body=" + encodeURIComponent(text)
    });
  } catch(e) {
    console.log("Twilio send failed:", e.message);
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

  var sid = settings.twilio_account_sid || "";
  var token = settings.twilio_auth_token || "";
  var from = settings.twilio_from_number || "";
  var channel = settings.twilio_channel || "sms";

  if (!sid || !token || !from) { toast("Set Twilio Account SID, Auth Token, and From Number first", "err"); return; }

  toast("Sending Twilio test message...");

  var clean = testPhone.replace(/[\s\-()]/g, "");
  if (!clean.startsWith("+")) {
    clean = clean.replace(/^0+/, "");
    if (!clean.startsWith("995")) clean = "995" + clean;
    clean = "+" + clean;
  }
  var to = channel === "whatsapp" ? "whatsapp:" + clean : clean;
  var fromNum = channel === "whatsapp" ? "whatsapp:" + from : from;

  try {
    var r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(sid + ":" + token)
      },
      body: "To=" + encodeURIComponent(to) + "&From=" + encodeURIComponent(fromNum) + "&Body=" + encodeURIComponent("MODY Twilio test ✅")
    });
    var data = await r.json();
    if (r.ok) toast("Test message sent! Check your phone.", "ok");
    else toast("Twilio error: " + (data.message || data.code || r.status), "err");
  } catch(e) {
    toast("Twilio test failed: " + e.message, "err");
  }
}

// ── SIMULTANEOUS MULTI-PRO BOOKING ALERT ──────────────────
async function notifyAdminSimultaneous(newBk, otherBks) {
  var adminPhone = settings.admin_phone || "";
  var msg = "⚠️ MODY: " + (newBk.client_name || "A client") + " has booked MULTIPLE professionals simultaneously on " + (newBk.time_slot || "").split(" ")[0] + ":\n"
    + "NEW: " + newBk.pro_name + " — " + newBk.service_name + " at " + (newBk.time_slot || "").split(" ")[1] + "\n"
    + otherBks.map(function(b) { return "ALSO: " + b.pro_name + " — " + b.service_name + " at " + (b.time_slot || "").split(" ")[1]; }).join("\n");

  // Send SMS to admin
  if (adminPhone && settings.twilio_account_sid && settings.twilio_auth_token && settings.twilio_from_number) {
    var sid = settings.twilio_account_sid;
    var token = settings.twilio_auth_token;
    var from = settings.twilio_from_number;
    var channel = settings.twilio_channel || "sms";
    var clean = adminPhone.replace(/[\s\-()]/g, "");
    if (!clean.startsWith("+")) { clean = clean.replace(/^0+/, ""); if (!clean.startsWith("995")) clean = "995" + clean; clean = "+" + clean; }
    var to = channel === "whatsapp" ? "whatsapp:" + clean : clean;
    var fromNum = channel === "whatsapp" ? "whatsapp:" + from : from;
    try {
      await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + btoa(sid + ":" + token) },
        body: "To=" + encodeURIComponent(to) + "&From=" + encodeURIComponent(fromNum) + "&Body=" + encodeURIComponent(msg)
      });
    } catch(e) {}
  }

  // Save to notifications table for admin panel
  try {
    await sb.from("notifications").insert({
      type: "simultaneous_booking",
      message: msg,
      data: { new_booking: newBk, other_bookings: otherBks }
    });
  } catch(e) {}
}
