// ═══════════════════════════════════════════════════════════════
//  MODY — Booking Flow, Detail Modal & Reviews
//  Load order: 8 (depends on: config.js, i18n.js, ui.js, auth.js)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  PART 6: BOOKING FLOW
// ═══════════════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────────────
var selSvc = { id: null, name: "", price: 0, duration: 60, proId: null, proName: "", proSpec: "" };
var selNailColors = [];
var promoApplied  = null;
var promoDisc     = 0;

// ── SELECT SERVICE ────────────────────────────────────────────
function selectService(id, name, price, proId, proName, proSpec, duration) {
  // un-highlight previous selection
  document.querySelectorAll(".svc-btn").forEach(function(b) {
    b.classList.remove("on"); b.textContent = "Select";
  });
  if (event && event.target) {
    event.target.classList.add("on");
    event.target.textContent = "✓ Selected";
  }
  selSvc = { id: id, name: name, price: price, duration: duration || 60, proId: proId, proName: proName, proSpec: proSpec || "" };
  // Update sidebar price box
  var pb = ge("sbPriceBox"); if (pb) pb.classList.remove("hide");
  var sn = ge("sbN"); if (sn) sn.textContent = name;
  var sp = ge("sbP"); if (sp) sp.textContent = price + "₾";
  var st = ge("sbT"); if (st) st.textContent = (price + 5) + "₾";
}

// ── GO TO BOOKING PAGE ────────────────────────────────────────
async function gotoBooking() {
  if (!user)         { toast("Please sign in to book", "err"); openM("auth"); return; }
  if (!selSvc.name)  { toast("Please select a service first", "err"); return; }

  // reset promo
  promoApplied = null; promoDisc = 0; selNailColors = [];
  var pi = ge("promoInp"); if (pi) pi.value = "";
  var pr = ge("promoResult"); if (pr) pr.innerHTML = "";
  var dr = ge("bkDiscRow"); if (dr) dr.style.display = "none";

  // fill in service info
  ge("bkSvcName").textContent  = selSvc.name;
  ge("bkProName").textContent  = selSvc.proName;
  ge("bkSvcPrice").textContent = selSvc.price + "₾";
  ge("bkSumSvcLbl").textContent = selSvc.name;
  var bsa = ge("bkSumSvcAmt"); if (bsa) bsa.textContent = selSvc.price + "₾";
  updateBkTotal();

  // show/hide promo card
  var pc = ge("promoCard");
  if (pc) pc.style.display = settings.promo_enabled === false ? "none" : "block";

  // setup nail color card
  await setupNailCard();

  buildCal();
  show("booking");
}

// ── NAIL COLORS IN BOOKING ────────────────────────────────────
async function setupNailCard() {
  var nc = ge("nailCard"); if (!nc) return;
  if (settings.nail_colors_enabled === false || selSvc.proSpec !== "Nails") {
    nc.style.display = "none"; return;
  }
  var colors = [];
  var demo = DEMOS.find(function(p) { return p.id === selSvc.proId; });
  if (demo && demo.nail_colors) {
    colors = demo.nail_colors;
  } else {
    try {
      var r = await sb.from("nail_colors").select("*").eq("pro_id", selSvc.proId).order("created_at");
      colors = r.data || [];
    } catch(e) {}
  }
  if (!colors.length) { nc.style.display = "none"; return; }
  nc.style.display = "block";
  var ctr = ge("bkNailColors"); if (!ctr) return;
  ctr.innerHTML = colors.map(function(c) {
    return "<div class=\"swatch\" style=\"background:" + c.hex_code + "\""
         + " title=\"" + c.name + "\""
         + " data-id=\"" + c.id + "\" data-name=\"" + c.name + "\""
         + " onclick=\"toggleNailColor(this)\"></div>";
  }).join("");
}

function toggleNailColor(el) {
  var id   = el.getAttribute("data-id");
  var name = el.getAttribute("data-name");
  var idx  = selNailColors.findIndex(function(c) { return c.id === id; });
  if (idx > -1) { selNailColors.splice(idx, 1); el.classList.remove("on"); }
  else          { selNailColors.push({ id: id, name: name }); el.classList.add("on"); }
  var txt = ge("nailSelTxt");
  if (txt) txt.textContent = selNailColors.length
    ? "Selected: " + selNailColors.map(function(c) { return c.name; }).join(", ")
    : "";
}

// ── PROMO CODE ────────────────────────────────────────────────
async function applyPromo() {
  var code = (ge("promoInp").value || "").trim().toUpperCase();
  var res  = ge("promoResult"); res.innerHTML = "";
  if (!code) { res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Enter a code.</p>"; return; }
  if (settings.promo_enabled === false) {
    res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Promo codes are currently disabled.</p>"; return;
  }
  try {
    var r = await sb.from("promo_codes").select("*").eq("code", code).eq("active", true).single();
    if (r.error || !r.data) { res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Invalid or inactive code.</p>"; return; }
    var p = r.data;
    if (p.expires_at && new Date(p.expires_at) < new Date()) {
      res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Code has expired.</p>"; return;
    }
    if (p.max_uses && p.used_count >= p.max_uses) {
      res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Usage limit reached.</p>"; return;
    }
    if (selSvc.price < (p.min_order || 0)) {
      res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Min order " + p.min_order + "₾ required.</p>"; return;
    }
    promoDisc = p.discount_type === "percent"
      ? Math.round(selSvc.price * p.discount_value / 100)
      : Math.min(Number(p.discount_value), selSvc.price);
    promoApplied = p;
    updateBkTotal();
    res.innerHTML = "<div class=\"promo-ok\">✓ " + p.code + " applied — <strong>-" + promoDisc + "₾</strong>"
      + "<span style=\"cursor:pointer;opacity:.6;margin-left:8px\" onclick=\"clearPromo()\">✕</span></div>";
    var dr = ge("bkDiscRow"), da = ge("bkDiscAmt");
    if (dr) dr.style.display = "flex";
    if (da) da.textContent = "-" + promoDisc + "₾";
  } catch(e) { res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Could not verify code.</p>"; }
}

function clearPromo() {
  promoApplied = null; promoDisc = 0;
  var pi = ge("promoInp"); if (pi) pi.value = "";
  var pr = ge("promoResult"); if (pr) pr.innerHTML = "";
  var dr = ge("bkDiscRow"); if (dr) dr.style.display = "none";
  updateBkTotal();
}

function updateBkTotal() {
  var total = selSvc.price - promoDisc + 5;
  var bt = ge("bkTotal"); if (bt) bt.textContent = total + "₾";
  var cb = ge("confirmBtn"); if (cb) cb.textContent = t("confirmBtnTxt") + " — " + total + "₾";
}

// ── CALENDAR ──────────────────────────────────────────────────
var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

var bkSelDateStr = "";

function buildCal() {
  var hdr = ge("bkCalHdr"), grid = ge("bkCalGrid");
  if (!hdr || !grid) return;
  hdr.innerHTML = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(d) {
    return "<div style=\"font-size:11px;text-align:center;color:var(--mu);padding:4px 0;font-weight:600\">" + d + "</div>";
  }).join("");
  var today = new Date(); today.setHours(0,0,0,0);
  var todayStr = fmtDate(today);
  if (!bkSelDateStr) bkSelDateStr = todayStr;
  var cells = [];
  for (var i = 0; i < 28; i++) { var d = new Date(today); d.setDate(today.getDate() + i); cells.push(d); }
  var startDow = cells[0].getDay(); startDow = startDow === 0 ? 6 : startDow - 1;
  var pad = ""; for (var p = 0; p < startDow; p++) pad += "<div></div>";
  grid.innerHTML = pad + cells.map(function(d, idx) {
    var ds = fmtDate(d), isToday = ds === todayStr, isSel = ds === bkSelDateStr;
    var mo = d.toLocaleString("default",{month:"short"});
    return "<div style=\"padding:8px 4px;text-align:center;border-radius:var(--rs);cursor:pointer;"
      + "border:2px solid " + (isSel ? "var(--g)" : isToday ? "rgba(234,184,183,.4)" : "transparent") + ";"
      + (isSel ? "background:rgba(234,184,183,.15);" : "") + "transition:all .15s\" onclick=\"pickDay('" + ds + "')\">"
      + (d.getDate()===1||idx===0 ? "<div style=\"font-size:9px;color:var(--g);font-weight:600\">" + mo + "</div>" : "")
      + "<div style=\"font-size:14px;font-weight:" + (isToday||isSel?"700":"500") + "\">" + d.getDate() + "</div>"
      + (isToday ? "<div style=\"font-size:8px;color:var(--g)\">Today</div>" : "") + "</div>";
  }).join("");
  buildTimeSlots();
}
function fmtDate(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function pickDay(ds) { bkSelDateStr = ds; buildCal(); }
async function buildTimeSlots() {
  var slots = ge("bkSlots"); if (!slots) return;
  var now = new Date(), isToday = bkSelDateStr === fmtDate(now), curHr = now.getHours(), curMin = now.getMinutes();
  var times = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];

  // Fetch existing bookings + pro buffer for collision check
  var blockedSlots = {};
  var proId = selSvc.proId;
  var svcDuration = selSvc.duration || 60; // minutes
  var arrivalBuffer = 60; // minutes before start
  if (proId && ["d1","d2","d3","d4","d5","d6"].indexOf(proId) === -1) {
    try {
      // Get pro's travel buffer
      var pRes = await sb.from("professionals").select("travel_buffer").eq("id", proId).single();
      var travelBuffer = (pRes.data && pRes.data.travel_buffer) ? pRes.data.travel_buffer : 60;

      // Get all active bookings for this pro on the selected date
      var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
      var bRes = await sb.from("bookings").select("time_slot,service_name")
        .eq("pro_id", proId).in("status", activeStatuses)
        .like("time_slot", bkSelDateStr + "%");
      var bookings = (bRes.data || []);

      // Get service durations for booked services
      var svcRes = await sb.from("services").select("name,duration").eq("pro_id", proId);
      var svcMap = {};
      (svcRes.data || []).forEach(function(s) { svcMap[s.name] = s.duration || 60; });

      // For each existing booking, calculate blocked time range
      bookings.forEach(function(bk) {
        var parts = bk.time_slot.split(" ");
        if (parts.length < 2) return;
        var tp = parts[1].split(":");
        var bkStartMin = parseInt(tp[0]) * 60 + parseInt(tp[1]); // minutes from midnight
        var bkDuration = svcMap[bk.service_name] || 60;
        var bkEndMin = bkStartMin + bkDuration;
        // Blocked zone: [bkStartMin - arrivalBuffer - travelBuffer, bkEndMin + travelBuffer]
        var blockStart = bkStartMin - arrivalBuffer - travelBuffer;
        var blockEnd = bkEndMin + travelBuffer;

        // Check each candidate slot against this blocked zone
        times.forEach(function(tt) {
          var sp = tt.split(":");
          var slotStart = parseInt(sp[0]) * 60 + parseInt(sp[1]);
          var slotEnd = slotStart + svcDuration;
          // Overlap: new booking [slotStart - arrivalBuffer, slotEnd + travelBuffer] must not overlap [bkStartMin - arrivalBuffer, bkEndMin + travelBuffer]
          // Simplified: slot is blocked if it overlaps with the blocked zone
          if (slotEnd + travelBuffer > bkStartMin - arrivalBuffer && slotStart - arrivalBuffer < bkEndMin + travelBuffer) {
            blockedSlots[tt] = true;
          }
        });
      });
    } catch(e) { /* continue without blocking */ }

    // Check pro_hours_off and pro_days_off
    try {
      var dayOffRes = await sb.from("pro_days_off").select("id").eq("pro_id", proId).eq("off_date", bkSelDateStr);
      if (dayOffRes.data && dayOffRes.data.length) {
        // Whole day is off — block all slots
        times.forEach(function(tt) { blockedSlots[tt] = "dayoff"; });
      } else {
        var hoursOffRes = await sb.from("pro_hours_off").select("off_hour").eq("pro_id", proId).eq("off_date", bkSelDateStr);
        (hoursOffRes.data || []).forEach(function(h) { blockedSlots[h.off_hour] = "houroff"; });
      }
    } catch(e) { /* continue */ }
  }

  slots.innerHTML = times.map(function(tt) {
    var sp = tt.split(":");
    var hr = parseInt(sp[0]), mn = parseInt(sp[1]);
    var isPast = isToday && (hr < curHr || (hr === curHr && mn <= curMin));
    var isBlocked = blockedSlots[tt];
    var cls = (isPast || isBlocked) ? " dis" : "";
    var title = isBlocked === "dayoff" ? " title=\"Professional is unavailable this day\""
              : isBlocked === "houroff" ? " title=\"Professional marked this hour unavailable\""
              : isBlocked ? " title=\"Not available — professional is booked nearby\""
              : "";
    return "<div class=\"ts" + cls + "\" onclick=\"pickTs(this)\" style=\"padding:9px 6px;font-size:13px\"" + title + ">" + tt + "</div>";
  }).join("");
}
function pickTs(el) {
  if (el.classList.contains("dis")) return;
  var p = el.closest(".ts-grid");
  if (p) p.querySelectorAll(".ts").forEach(function(t) { t.classList.remove("on"); });
  el.classList.add("on");
}

// ── SUBMIT BOOKING ────────────────────────────────────────────
async function submitBooking() {
  if (!user) { toast("Please sign in first", "err"); openM("auth"); return; }
  var addr = ge("bkAddr").value.trim();
  var slot = document.querySelector("#pg-booking .ts.on");
  if (!addr) { toast("Please enter your address", "err"); return; }
  if (!slot) { toast("Please pick a time slot", "err"); return; }

  var timeSlot = bkSelDateStr + " " + slot.textContent;
  var proId = (selSvc.proId && ["d1","d2","d3","d4","d5","d6"].indexOf(selSvc.proId) === -1) ? selSvc.proId : null;

  // Double-booking prevention with buffer logic
  if (proId) {
    try {
      var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
      var pRes2 = await sb.from("professionals").select("travel_buffer").eq("id", proId).single();
      var travelBuf = (pRes2.data && pRes2.data.travel_buffer) ? pRes2.data.travel_buffer : 60;
      var arrBuf = 60; // arrival buffer
      var svcDur = selSvc.duration || 60;

      var bkCheck = await sb.from("bookings").select("time_slot,service_name")
        .eq("pro_id", proId).in("status", activeStatuses)
        .like("time_slot", bkSelDateStr + "%");

      var svcCheck = await sb.from("services").select("name,duration").eq("pro_id", proId);
      var durMap = {};
      (svcCheck.data || []).forEach(function(s) { durMap[s.name] = s.duration || 60; });

      var tp2 = slot.textContent.split(":");
      var newStart = parseInt(tp2[0]) * 60 + parseInt(tp2[1]);
      var newEnd = newStart + svcDur;

      var hasConflict = (bkCheck.data || []).some(function(bk) {
        var parts = bk.time_slot.split(" ");
        if (parts.length < 2) return false;
        var bt = parts[1].split(":");
        var exStart = parseInt(bt[0]) * 60 + parseInt(bt[1]);
        var exDur = durMap[bk.service_name] || 60;
        var exEnd = exStart + exDur;
        // Check overlap with buffers
        return (newEnd + travelBuf > exStart - arrBuf) && (newStart - arrBuf < exEnd + travelBuf);
      });

      if (hasConflict) {
        toast("This professional is already booked at this time (including travel buffer). Please choose another time.", "err");
        return;
      }
    } catch(e) {}
  }

  var total = selSvc.price - promoDisc + 5;

  // Upload design if present
  var designUrl = null;
  var dfi = ge("designFile");
  if (dfi && dfi.files && dfi.files[0]) {
    toast("Uploading design...");
    designUrl = await uploadDesignImage();
  }

  var bk = {
    client_id:             user.id,
    pro_id:                proId,
    client_name:           profile ? profile.full_name : user.email,
    client_phone:          profile ? (profile.phone || "") : "",
    pro_name:              selSvc.proName,
    service_name:          selSvc.name,
    service_price:         selSvc.price,
    promo_code:            promoApplied ? promoApplied.code : null,
    discount_amount:       promoDisc,
    total:                 total,
    address:               addr,
    district:              ge("bkDist").value,
    time_slot:             bkSelDateStr + " " + slot.textContent,
    notes:                 ge("bkNotes").value,
    selected_nail_colors:  selNailColors.length ? JSON.stringify(selNailColors) : null,
    design_url:            designUrl,
    status:                "pending"
  };

  var r = await sb.from("bookings").insert(bk);
  if (r.error) { toast("Booking failed: " + r.error.message, "err"); return; }

  // Increment promo usage counter
  if (promoApplied) {
    try {
      await sb.from("promo_codes")
        .update({ used_count: (promoApplied.used_count || 0) + 1 })
        .eq("id", promoApplied.id);
    } catch(e) {}
  }

  // Reset state
  selNailColors = [];
  clearDesign();

  // Populate confirmation modal
  ge("bkConfDets").innerHTML =
    "<div style=\"display:flex;justify-content:space-between;padding:3px 0;font-size:13px\"><span>Service</span><span>" + selSvc.name + "</span></div>"
  + "<div style=\"display:flex;justify-content:space-between;padding:3px 0;font-size:13px\"><span>Professional</span><span>" + selSvc.proName + "</span></div>"
  + "<div style=\"display:flex;justify-content:space-between;padding:3px 0;font-size:13px\"><span>Time</span><span>" + slot.textContent + "</span></div>"
  + "<div style=\"display:flex;justify-content:space-between;padding:3px 0;font-size:13px\"><span>Address</span><span>" + addr + "</span></div>"
  + (promoDisc > 0 ? "<div style=\"display:flex;justify-content:space-between;padding:3px 0;font-size:13px;color:#15803d\"><span>Discount</span><span>-" + promoDisc + "₾</span></div>" : "")
  + "<div style=\"display:flex;justify-content:space-between;padding:7px 0 2px;font-size:14px;font-weight:500;border-top:1px solid var(--br);margin-top:4px\"><span>Total</span><span>" + total + "₾</span></div>";

  openM("bkconf");
  toast(t("bookingOk"), "ok");

  // Twilio notification for new booking
  twilioNotifyBooking(bk, "new_booking");
}

// ── BOOKING DETAIL MODAL ──────────────────────────────────────
function openBkDetail(bkJson, role) {
  var bk = typeof bkJson === "string" ? JSON.parse(bkJson) : bkJson;
  var isC = role === "client";
  var isP = role === "pro";
  var isA = role === "admin";
  var acts = "";

  if (isC) {
    if (bk.status === "arrived")
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px;background:#22c55e;color:#fff\" onclick=\"chBkStatus('" + bk.id + "','in_progress','client')\">✓ " + t("confirmArrText") + "</button>";
    if (bk.status === "completed" && bk.pro_id)
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"openRevModal('" + bk.id + "','" + bk.pro_id + "','client')\">⭐ " + t("leaveReview") + "</button>";
    if (["pending","accepted"].includes(bk.status))
      acts += "<button class=\"btn btn-red\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"if(confirm('Cancel?'))chBkStatus('" + bk.id + "','cancelled','client')\">✕ " + t("cancelBooking") + "</button>";
    if (bk.status === "on_the_way")
      acts += "<div style=\"background:rgba(168,85,247,.1);border:2px solid rgba(168,85,247,.3);border-radius:var(--rs);padding:18px;text-align:center;width:100%\"><span style=\"font-size:28px\">🚗</span><div style=\"font-weight:600;color:#7e22ce;font-size:16px;margin-top:6px\">" + t("proOnWay") + "</div></div>";
  }
  if (isP) {
    if (bk.status === "accepted") {
      var bkDateStr = (bk.time_slot || "").substring(0, 10);
      var todayStr = new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0") + "-" + String(new Date().getDate()).padStart(2,"0");
      if (bkDateStr === todayStr) {
        acts += "<button class=\"btn\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px;background:#7e22ce;color:#fff;border:none;cursor:pointer\" onclick=\"chBkStatus('" + bk.id + "','on_the_way','pro')\">🚗 " + t("onTheWay") + "</button>";
      } else {
        acts += "<div style=\"display:block;width:100%;padding:14px;font-size:14px;text-align:center;border-radius:var(--rs);margin-bottom:6px;background:var(--bg2);color:var(--mu);border:1px solid var(--br)\">🚗 " + t("onTheWay") + "<div style=\"font-size:11px;margin-top:4px\">" + t("onTheWayRestrict") + "</div></div>";
      }
    }
    if (bk.status === "on_the_way")
      acts += "<button class=\"btn\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px;background:#3b82f6;color:#fff;border:none;cursor:pointer\" onclick=\"chBkStatus('" + bk.id + "','arrived','pro')\">📍 " + t("iArrived") + "</button>";
    if (bk.status === "arrived")
      acts += "<div style=\"background:rgba(234,184,183,.1);border:1px solid rgba(234,184,183,.25);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:#a16207;display:flex;align-items:center;gap:8px\"><span style=\"font-size:18px\">⏳</span>Waiting for client to confirm your arrival…</div>";
    if (bk.status === "in_progress")
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"chBkStatus('" + bk.id + "','completed','pro')\">✓ " + t("markCompleted") + "</button>";
    if (bk.status === "pending")
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px;background:#22c55e;color:#fff\" onclick=\"acceptBk('" + bk.id + "')\">✓ " + t("acceptBooking") + "</button>"
            + "<button class=\"btn btn-red\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"chBkStatus('" + bk.id + "','cancelled','pro')\">✕ " + t("decline") + "</button>";
    if (bk.status === "completed")
      acts += "<button class=\"btn btn-o\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"openRevModal('" + bk.id + "','" + bk.client_id + "','pro')\">⭐ " + t("reviewClient") + "</button>";
  }
  if (isA) {
    var opts = ["pending","accepted","on_the_way","arrived","in_progress","completed","cancelled","no_show","late","refunded"];
    acts += "<div style=\"width:100%\">"
          + "<div style=\"font-size:12px;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px\">⚙️ Admin Controls</div>"
          + "<select class=\"fi\" style=\"font-size:14px;padding:10px;margin-bottom:8px\" onchange=\"chBkStatus('" + bk.id + "',this.value,'admin')\">"
          + "<option value=\"\">Change status…</option>"
          + opts.map(function(s) { return "<option value=\"" + s + "\"" + (s === bk.status ? " selected" : "") + ">" + s.replace(/_/g," ") + "</option>"; }).join("")
          + "</select>"
          + "<div style=\"display:flex;gap:6px;flex-wrap:wrap\">"
          + "<button class=\"btn btn-g\" style=\"flex:1;justify-content:center;padding:10px;font-size:13px\" onclick=\"chBkStatus('" + bk.id + "','completed','admin')\">✓ Force Complete</button>"
          + "<button class=\"btn btn-red\" style=\"flex:1;justify-content:center;padding:10px;font-size:13px\" onclick=\"chBkStatus('" + bk.id + "','cancelled','admin')\">✕ Cancel</button>"
          + "<button class=\"btn btn-warn\" style=\"flex:1;justify-content:center;padding:10px;font-size:13px\" onclick=\"chBkStatus('" + bk.id + "','refunded','admin')\">↩ Refund</button>"
          + "</div>"
          + "<div style=\"margin-top:8px;padding:8px;background:var(--bg2);border-radius:var(--rs);font-size:12px;color:var(--mu)\">"
          + "📞 Client: " + (bk.client_phone || bk.client_name || "—") + "<br>"
          + "📞 Pro: " + (bk.pro_phone || bk.pro_name || "—") + "<br>"
          + "🆔 Booking: " + bk.id + "<br>"
          + "📅 Created: " + (bk.created_at ? new Date(bk.created_at).toLocaleString() : "—")
          + "</div></div>";
  }

  // nail color display
  var nailHtml = "";
  if (bk.selected_nail_colors) {
    try {
      var nc = typeof bk.selected_nail_colors === "string"
        ? JSON.parse(bk.selected_nail_colors)
        : bk.selected_nail_colors;
      if (nc && nc.length) {
        nailHtml = "<div style=\"margin-top:11px\"><div class=\"fl\">Nail Colors</div><div class=\"swatch-row\">"
          + nc.map(function(col) {
              return "<div class=\"swatch\" style=\"background:" + (col.hex_code || "#ccc") + "\" title=\"" + col.name + "\"></div>"
                   + "<span style=\"font-size:12px;color:var(--mu);margin-left:3px\">" + col.name + "</span>";
            }).join("")
          + "</div></div>";
      }
    } catch(e) {}
  }

  ge("bkdTitle").textContent = "Booking #" + bk.id.substring(0, 8);
  ge("bkdContent").innerHTML =
    buildFlowBar(bk.status)
  + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:11px;margin:12px 0\">"
  + "<div><div class=\"fl\">Status</div>" + sBadge(bk.status) + "</div>"
  + "<div><div class=\"fl\">Total</div><div style=\"font-weight:500\">" + (bk.total || 0) + "₾"
  + (bk.discount_amount > 0 ? "<span style=\"color:#15803d;font-size:12px\"> (-" + bk.discount_amount + "₾)</span>" : "") + "</div></div>"
  + "<div><div class=\"fl\">Service</div><div style=\"font-size:14px\">" + (bk.service_name || "—") + "</div></div>"
  + "<div><div class=\"fl\">Time</div><div style=\"font-size:14px\">" + (bk.time_slot || "ASAP") + "</div></div>"
  + "<div><div class=\"fl\">District</div><div style=\"font-size:14px\">" + (bk.district || "—") + "</div></div>"
  + "<div><div class=\"fl\">" + (isC ? "Professional" : "Client") + "</div><div style=\"font-size:14px\">" + (isC ? (bk.pro_name || "—") : (bk.client_name || "—")) + "</div></div>"
  + (canSeePhone(bk) ? "<div><div class=\"fl\">📞 Phone</div><div style=\"font-size:14px;color:var(--g);font-weight:500\"><a href=\"tel:" + (isC ? (bk.pro_phone||"") : (bk.client_phone||"")) + "\" style=\"color:var(--g)\">" + (isC ? (bk.pro_phone||"Hidden") : (bk.client_phone||"Hidden")) + "</a></div></div>" : "")
  + (bk.address ? "<div style=\"grid-column:1/-1\"><div class=\"fl\">Address</div><div style=\"font-size:14px\">" + bk.address + "</div></div><div style=\"grid-column:1/-1\"><div class=\"track-map\" id=\"bkdMap\"></div></div>" : "")
  + (bk.notes   ? "<div style=\"grid-column:1/-1\"><div class=\"fl\">Notes</div><div style=\"font-size:13px;color:var(--mu)\">" + bk.notes + "</div></div>" : "")
  + "</div>"
  + (bk.design_url ? "<div style=\"margin-top:11px\"><div class=\"fl\">🎨 Client Design Reference</div><div style=\"margin-top:6px\"><img src=\"" + bk.design_url + "\" style=\"max-width:100%;max-height:250px;border-radius:var(--rs);border:1.5px solid var(--br);cursor:pointer;object-fit:contain\" onclick=\"lbOpen(['" + bk.design_url + "'],0)\"></div></div>" : "")
  + nailHtml
  + ((isC || isP) && bk.pro_id ? "<div style=\"margin-top:12px\"><button class=\"btn btn-gh\" style=\"display:flex;align-items:center;gap:6px;width:100%;justify-content:center;padding:12px;font-size:14px;border-radius:var(--rs)\" onclick=\"closeM('bkd');openChatFromBooking('" + bk.id + "','" + (isC ? (bk.pro_name || "Pro") : (bk.client_name || "Client")).replace(/'/g,"\\'") + "')\">💬 Chat with " + (isC ? (bk.pro_name || "Professional") : (bk.client_name || "Client")) + "</button></div>" : "")
  + (isA && bk.pro_id ? "<div style=\"margin-top:12px\"><button class=\"btn btn-gh\" style=\"display:flex;align-items:center;gap:6px;width:100%;justify-content:center;padding:12px;font-size:14px;border-radius:var(--rs)\" onclick=\"closeM('bkd');adminViewBookingChat('" + bk.id + "','" + (bk.client_name || "Client").replace(/'/g,"\\'") + "','" + (bk.pro_name || "Pro").replace(/'/g,"\\'") + "')\">💬 View Chat</button></div>" : "")
  + (acts ? "<div style=\"margin-top:16px;padding-top:14px;border-top:2px solid var(--br)\">"
    + "<div style=\"font-size:11px;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px\">Actions</div>"
    + "<div style=\"display:flex;flex-direction:column;gap:8px\">" + acts + "</div></div>" : "");

  openM("bkd");
  if (bk.address || bk.district) {
    setTimeout(function() {
      var m = ge("bkdMap"); if (!m) return;
      try {
        var mp = L.map("bkdMap",{zoomControl:false}).setView(TBILISI,14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OSM"}).addTo(mp);
        var mk = L.marker(TBILISI).addTo(mp).bindPopup((bk.address||"")+"<br>"+(bk.district||"")).openPopup();
        fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent((bk.address||"")+", "+(bk.district||"")+", Tbilisi, Georgia")+"&limit=1")
          .then(function(r){return r.json()}).then(function(d){if(d&&d[0]){mp.setView([+d[0].lat,+d[0].lon],16);mk.setLatLng([+d[0].lat,+d[0].lon])}}).catch(function(){});
        setTimeout(function(){mp.invalidateSize()},300);
      } catch(e){}
    }, 200);
  }
}

async function chBkStatus(id, status, actor) {
  if (!status) return;
  try {
    // Same-day validation for on_the_way
    if (status === "on_the_way") {
      var bkCheck = await sb.from("bookings").select("time_slot").eq("id", id).single();
      if (bkCheck.data) {
        var bkDate = (bkCheck.data.time_slot || "").substring(0, 10);
        var nowDate = new Date().getFullYear() + "-" + String(new Date().getMonth()+1).padStart(2,"0") + "-" + String(new Date().getDate()).padStart(2,"0");
        if (bkDate !== nowDate) {
          toast("You can only go 'On the Way' on the booking day.", "err");
          return;
        }
      }
    }
    var r = await sb.from("bookings").update({ status: status }).eq("id", id);
    if (r.error) throw r.error;
    toast("Status: " + status.replace(/_/g, " "), "ok");
    closeM("bkd");
    if (actor === "pro" && status === "on_the_way") startLocSharing(id);
    if (actor === "pro" && (status === "arrived" || status === "completed" || status === "cancelled")) stopLocSharing();
    // Immediate refresh
    if (actor === "client") loadClientDash();
    else if (actor === "pro" && typeof loadProDash === "function") loadProDash();
    else if (actor === "admin" && typeof loadAdminBks === "function") { loadAdminBks(); loadAdminData(); }
    renderTracker();
    setTimeout(function() { renderTracker(); }, 1000);
    setTimeout(function() { renderTracker(); }, 3000);

    // Twilio notification for status change
    try {
      var bkTw = await sb.from("bookings").select("client_name,client_phone,pro_name,pro_phone,service_name,time_slot,address").eq("id", id).single();
      if (bkTw.data) { twilioNotifyBooking(bkTw.data, status); }
    } catch(e) {}

    // Auto-open review popup when pro completes
    if (actor === "pro" && status === "completed") {
      try {
        var bkData = await sb.from("bookings").select("client_id").eq("id", id).single();
        if (bkData.data && bkData.data.client_id) {
          setTimeout(function() { openRevModal(id, bkData.data.client_id, "pro"); }, 800);
        }
      } catch(e) {}
    }
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function acceptBk(id) {
  try {
    var r = await sb.from("bookings").update({ status: "accepted" }).eq("id", id);
    if (r.error) throw r.error;
    toast("Booking accepted!", "ok");
    closeM("bkd");
    if (typeof loadProDash === "function") loadProDash();
    renderTracker();
    setTimeout(function() { renderTracker(); }, 1000);
    // Twilio notification
    try {
      var bkTw = await sb.from("bookings").select("client_name,client_phone,pro_name,pro_phone,service_name,time_slot,address").eq("id", id).single();
      if (bkTw.data) { twilioNotifyBooking(bkTw.data, "accepted"); }
    } catch(e) {}
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function confirmArrival(id) {
  try {
    var r = await sb.from("bookings").update({ status: "in_progress" }).eq("id", id);
    if (r.error) throw r.error;
    toast("Arrival confirmed! Service is now in progress.", "ok");
    closeM("bkd");
    cleanupClientMaps();
    sb.from("pro_locations").delete().eq("booking_id", id).then(function(){}).catch(function(){});
    loadClientDash();
    renderTracker();
    setTimeout(function() { renderTracker(); }, 1000);
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── REVIEWS ───────────────────────────────────────────────────
function openRevModal(bkId, targetId, role) {
  starRating = 0;
  renderStars(0);
  ge("revBkId").value      = bkId;
  ge("revTargetId").value  = targetId;
  ge("revRole").value      = role;
  ge("revComment").value   = "";
  ge("revSubjectTxt").textContent = role === "client" ? "Rate your professional" : "Rate the client";
  openM("rev");
}

async function submitReview() {
  if (!starRating) { toast("Please select a rating", "err"); return; }
  var bkId     = ge("revBkId").value;
  var targetId = ge("revTargetId").value;
  var role     = ge("revRole").value;
  var comment  = ge("revComment").value.trim();
  try {
    var r = await sb.from("reviews").insert({
      booking_id: bkId, reviewer_id: user.id,
      pro_id: role === "client" ? targetId : null,
      reviewer_role: role, rating: starRating, comment: comment, visible: true
    });
    if (r.error) {
      if (r.error.message.indexOf("schema cache") > -1 || r.error.message.indexOf("column") > -1) {
        toast("Database error: Please run the SQL setup to fix the reviews table. See admin Settings → SQL.", "err");
      }
      throw r.error;
    }
    // Recalculate pro rating average
    if (role === "client") {
      try {
        var rr = await sb.from("reviews").select("rating").eq("pro_id", targetId).eq("visible", true);
        if (rr.data && rr.data.length) {
          var avg = (rr.data.reduce(function(s, x) { return s + x.rating; }, 0) / rr.data.length).toFixed(1);
          await sb.from("professionals").update({ rating: parseFloat(avg), review_count: rr.data.length }).eq("id", targetId);
        }
      } catch(e) {}
    }
    closeM("rev");
    toast("Review submitted!", "ok");
    if (role === "client") loadClientDash();
    else if (typeof loadProDash === "function") loadProDash();
  } catch(e) { toast("Error: " + e.message, "err"); }
}



// ── DESIGN UPLOAD ────────────────────────────────────────────
// ── DESIGN UPLOAD ────────────────────────────────────────────
var designDataUrl = null;
var designUploadedUrl = null;

function previewDesign(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    designDataUrl = e.target.result;
    var prev = ge("designPreview");
    if (prev) { prev.innerHTML = "<img src='" + e.target.result + "' style='max-width:100%;max-height:200px;border-radius:var(--rs);object-fit:contain'>"; prev.style.display = "block"; }
    var prompt = ge("designPrompt"); if (prompt) prompt.style.display = "none";
    var acts = ge("designActions"); if (acts) acts.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

function clearDesign() {
  designDataUrl = null;
  designUploadedUrl = null;
  var prev = ge("designPreview"); if (prev) { prev.innerHTML = ""; prev.style.display = "none"; }
  var prompt = ge("designPrompt"); if (prompt) prompt.style.display = "";
  var acts = ge("designActions"); if (acts) acts.style.display = "none";
  var fi = ge("designFile"); if (fi) fi.value = "";
}

async function uploadDesignImage() {
  var fi = ge("designFile");
  if (!fi || !fi.files || !fi.files[0]) return null;
  var file = fi.files[0];
  var ext = file.name.split(".").pop().toLowerCase();
  var path = "designs/" + user.id + "/" + Date.now() + "." + ext;
  try {
    var r = await sb.storage.from("assets").upload(path, file, { upsert: true });
    if (r.error) return null;
    return sb.storage.from("assets").getPublicUrl(path).data.publicUrl;
  } catch(e) { return null; }
}


// ── DATE-AWARE TIME SLOTS ────────────────────────────────────
// ── DATE-AWARE TIME SLOTS ────────────────────────────────────
function getNowDate() { return new Date(); }

function isSlotPast(timeStr) {
  var now = getNowDate();
  var parts = timeStr.split(":");
  var slotDate = new Date(now);
  slotDate.setHours(parseInt(parts[0]), parseInt(parts[1] || 0), 0, 0);
  return slotDate <= now;
}

