// ═══════════════════════════════════════════════════════════════
//  MODY — Booking Flow, Detail Modal & Reviews
//  Load order: 8 (depends on: config.js, i18n.js, ui.js, auth.js)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  PART 6: BOOKING FLOW
// ═══════════════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────────────
var selSvcs      = [];   // array of selected services (multi-service booking)
var selNailColors = [];
var promoApplied  = null;
var promoDisc     = 0;

// ── MULTI-SERVICE HELPERS ─────────────────────────────────────
function selSvcPro()      { return selSvcs[0] || { proId: null, proName: "", proSpec: "" }; }
function selSvcTotal()    { return selSvcs.reduce(function(s, x) { return s + x.price; }, 0); }
function selSvcDuration() { return selSvcs.reduce(function(s, x) { return s + (x.duration || 60); }, 0); }
function selSvcNames()    { return selSvcs.map(function(s) { return s.name; }).join(" + "); }

// ── SELECT SERVICE (toggle add/remove) ───────────────────────
function selectService(id, name, price, proId, proName, proSpec, duration) {
  var idx = selSvcs.findIndex(function(s) { return s.id === id; });

  if (idx > -1) {
    // Deselect
    selSvcs.splice(idx, 1);
    if (event && event.target) {
      event.target.classList.remove("on");
      event.target.textContent = "Add";
    }
  } else {
    // If switching to a different professional, clear the cart first
    if (selSvcs.length > 0 && selSvcs[0].proId !== proId) {
      selSvcs = [];
      document.querySelectorAll(".svc-btn").forEach(function(b) {
        b.classList.remove("on"); b.textContent = "Add";
      });
    }
    selSvcs.push({ id: id, name: name, price: price, duration: duration || 60, proId: proId, proName: proName, proSpec: proSpec || "" });
    if (event && event.target) {
      event.target.classList.add("on");
      event.target.textContent = "✓ Added";
    }
  }
  updateSvcCart();
}

// ── UPDATE SIDEBAR CART ────────────────────────────────────────
function updateSvcCart() {
  var summary = ge("sbCartSummary");
  var btn     = ge("sbContinueBtn");
  if (!summary) return;

  if (selSvcs.length === 0) {
    summary.classList.add("hide");
    if (btn) { btn.textContent = "Select a service"; btn.style.opacity = ".45"; btn.style.pointerEvents = "none"; }
    return;
  }

  summary.classList.remove("hide");
  var rows = ge("sbCartRows");
  if (rows) {
    rows.innerHTML = selSvcs.map(function(s) {
      return "<div style=\"display:flex;justify-content:space-between;font-size:13px;padding:3px 0\">"
        + "<span>" + s.name + "</span><span style=\"font-weight:500\">" + s.price + "₾</span></div>";
    }).join("");
  }
  var total = selSvcTotal() + 5;
  // Show wallet balance hint
  var walletHint = ge("sbWalletHint");
  if (user && walletHint) {
    sb.from("client_wallets").select("balance").eq("client_id", user.id).maybeSingle().then(function(wr) {
      if (wr.data && wr.data.balance > 0) {
        walletHint.style.display = "block";
        walletHint.textContent = t("walletHint").replace("{0}", wr.data.balance);
      } else {
        walletHint.style.display = "none";
      }
    }).catch(function() { if (walletHint) walletHint.style.display = "none"; });
  }
  var st = ge("sbT"); if (st) st.textContent = total + "₾";
  if (btn) {
    btn.textContent = "Book " + selSvcs.length + " service" + (selSvcs.length > 1 ? "s" : "") + " — " + total + "₾";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "";
  }
}

// ── GO TO BOOKING PAGE ────────────────────────────────────────
async function gotoBooking() {
  if (!user)           { toast("Please sign in to book", "err"); openM("auth"); return; }
  if (!selSvcs.length) { toast("Please select at least one service", "err"); return; }

  var pro = selSvcPro();

  // reset promo
  promoApplied = null; promoDisc = 0; selNailColors = [];
  var pi = ge("promoInp"); if (pi) pi.value = "";
  var pr = ge("promoResult"); if (pr) pr.innerHTML = "";
  var dr = ge("bkDiscRow"); if (dr) dr.style.display = "none";

  // fill in service info
  ge("bkSvcName").textContent   = selSvcNames();
  ge("bkProName").textContent   = pro.proName;
  ge("bkSvcPrice").textContent  = selSvcTotal() + "₾";
  ge("bkSumSvcLbl").textContent = selSvcNames();
  var bsa = ge("bkSumSvcAmt"); if (bsa) bsa.textContent = selSvcTotal() + "₾";
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
  var pro = selSvcPro();
  var hasNails = selSvcs.some(function(s) { return s.proSpec === "Nails"; });
  if (settings.nail_colors_enabled === false || !hasNails) {
    nc.style.display = "none"; return;
  }
  var colors = [];
  var demo = DEMOS.find(function(p) { return p.id === pro.proId; });
  if (demo && demo.nail_colors) {
    colors = demo.nail_colors;
  } else {
    try {
      var r = await sb.from("nail_colors").select("*").eq("pro_id", pro.proId).order("created_at");
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
    if (selSvcTotal() < (p.min_order || 0)) {
      res.innerHTML = "<p style=\"color:#ef4444;font-size:13px;margin-top:6px\">Min order " + p.min_order + "₾ required.</p>"; return;
    }
    promoDisc = p.discount_type === "percent"
      ? Math.round(selSvcTotal() * p.discount_value / 100)
      : Math.min(Number(p.discount_value), selSvcTotal());
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
  var total = selSvcTotal() - promoDisc + 5;
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
  // Fetch existing bookings + pro buffer for collision check
  var blockedSlots = {};
  var proId = selSvcPro().proId;
  var svcDuration = selSvcDuration(); // combined duration of all selected services
  var arrivalBuffer = 60; // minutes before start
  var workStart = "09:00", workEnd = "19:00";
  if (proId && ["d1","d2","d3","d4","d5","d6"].indexOf(proId) === -1) {
    try {
      // Get pro's travel buffer and working hours
      var pRes = await sb.from("professionals").select("travel_buffer,work_start,work_end").eq("id", proId).single();
      var travelBuffer = (pRes.data && pRes.data.travel_buffer) ? pRes.data.travel_buffer : 60;
      if (pRes.data && pRes.data.work_start) workStart = pRes.data.work_start;
      if (pRes.data && pRes.data.work_end) workEnd = pRes.data.work_end;

      // Get all active bookings for this pro on the selected date
      var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
      var bRes = await sb.from("bookings").select("time_slot,service_name,service_duration")
        .eq("pro_id", proId).in("status", activeStatuses)
        .like("time_slot", bkSelDateStr + "%");
      var bookings = (bRes.data || []);

      // Get service durations for booked services (fallback for old bookings without service_duration)
      var svcRes = await sb.from("services").select("name,duration").eq("pro_id", proId);
      var svcMap = {};
      (svcRes.data || []).forEach(function(s) { svcMap[s.name] = s.duration || 60; });

      // For each existing booking, calculate blocked time range
      bookings.forEach(function(bk) {
        var parts = bk.time_slot.split(" ");
        if (parts.length < 2) return;
        var tp = parts[1].split(":");
        var bkStartMin = parseInt(tp[0]) * 60 + parseInt(tp[1]); // minutes from midnight
        var bkDuration = bk.service_duration || svcMap[bk.service_name] || 60;
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

  // Build time slots based on pro's working hours
  var wsParts = workStart.split(":"), weParts = workEnd.split(":");
  var wsMin = parseInt(wsParts[0]) * 60 + parseInt(wsParts[1] || 0);
  var weMin = parseInt(weParts[0]) * 60 + parseInt(weParts[1] || 0);
  if (weMin <= wsMin) weMin = 24 * 60; // handle midnight wrap
  var times = [];
  for (var m = wsMin; m < weMin; m += 30) {
    var hh = Math.floor(m / 60), mm = m % 60;
    times.push(String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"));
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
  if (!user) { toast(t("bkSignIn"), "err"); openM("auth"); return; }
  // Kill switch check
  if (settings.kill_switch === true || settings.kill_switch === "true") {
    toast(t("bkPaused"), "err"); return;
  }
  // Blocked client check
  if (profile && profile.blocked) {
    toast(t("bkBlocked"), "err"); return;
  }
  var addr = ge("bkAddr").value.trim();
  var slot = document.querySelector("#pg-booking .ts.on");
  if (!addr) { toast(t("bkEnterAddr"), "err"); return; }
  if (!slot) { toast(t("bkPickTime"), "err"); return; }

  var timeSlot = bkSelDateStr + " " + slot.textContent;
  var pro = selSvcPro();
  var proId = (pro.proId && ["d1","d2","d3","d4","d5","d6"].indexOf(pro.proId) === -1) ? pro.proId : null;

  // Double-booking prevention with buffer logic
  if (proId) {
    try {
      var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
      var pRes2 = await sb.from("professionals").select("travel_buffer").eq("id", proId).single();
      var travelBuf = (pRes2.data && pRes2.data.travel_buffer) ? pRes2.data.travel_buffer : 60;
      var arrBuf = 60; // arrival buffer
      var svcDur = selSvcDuration();

      var bkCheck = await sb.from("bookings").select("time_slot,service_name,service_duration")
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
        var exDur = bk.service_duration || durMap[bk.service_name] || 60;
        var exEnd = exStart + exDur;
        // Check overlap with buffers
        return (newEnd + travelBuf > exStart - arrBuf) && (newStart - arrBuf < exEnd + travelBuf);
      });

      if (hasConflict) {
        toast(t("bkTimeConflict"), "err");
        return;
      }
    } catch(e) {}
  }

  var total = selSvcTotal() - promoDisc + 5;
  var pro = selSvcPro();

  // Check wallet balance and auto-apply
  var walletUsed = 0;
  try {
    var wRes = await sb.from("client_wallets").select("balance").eq("client_id", user.id).maybeSingle();
    if (wRes.data && wRes.data.balance > 0) {
      walletUsed = Math.min(wRes.data.balance, total);
      total = total - walletUsed;
      if (total < 0) total = 0;
    }
  } catch(e) {}

  // Upload design if present
  var designUrl = null;
  var dfi = ge("designFile");
  if (dfi && dfi.files && dfi.files[0]) {
    toast(t("bkUploading"));
    designUrl = await uploadDesignImage();
  }

  var bk = {
    client_id:             user.id,
    pro_id:                proId,
    client_name:           profile ? profile.full_name : user.email,
    client_phone:          profile ? (profile.phone || "") : "",
    pro_name:              pro.proName,
    service_name:          selSvcNames(),
    service_price:         selSvcTotal(),
    promo_code:            promoApplied ? promoApplied.code : null,
    discount_amount:       promoDisc,
    total:                 total,
    address:               addr,
    district:              ge("bkDist").value,
    time_slot:             bkSelDateStr + " " + slot.textContent,
    notes:                 ge("bkNotes").value,
    selected_nail_colors:  selNailColors.length ? JSON.stringify(selNailColors) : null,
    design_url:            designUrl,
    service_duration:      selSvcDuration(),
    status:                "pending"
  };

  var r = await sb.from("bookings").insert(bk).select().single();
  if (r.error) { toast("Booking failed: " + r.error.message, "err"); return; }
  var insertedBk = r.data || bk;

  // Deduct wallet balance if used
  if (walletUsed > 0) {
    try {
      var curWallet = await sb.from("client_wallets").select("balance").eq("client_id", user.id).maybeSingle();
      var newBal = (curWallet.data ? curWallet.data.balance : 0) - walletUsed;
      await sb.from("client_wallets").update({ balance: Math.max(0, newBal), updated_at: new Date().toISOString() }).eq("client_id", user.id);
      await sb.from("wallet_transactions").insert({
        client_id: user.id, amount: -walletUsed, type: "booking_payment",
        description: "Applied to booking " + (insertedBk.id || "").substring(0, 8)
      });
    } catch(e) {}
  }

  // Queue retention reminder
  if (insertedBk && insertedBk.id && (settings.retention_enabled === true || settings.retention_enabled === "true")) {
    try {
      var retDays = parseInt(settings.retention_days) || 21;
      var sendAt = new Date();
      sendAt.setDate(sendAt.getDate() + retDays);
      await sb.from("retention_queue").insert({
        booking_id: insertedBk.id,
        client_id: user.id,
        client_phone: profile ? (profile.phone || "") : "",
        client_name: profile ? profile.full_name : "",
        service_name: selSvcNames(),
        pro_name: pro.proName,
        send_at: sendAt.toISOString(),
        status: "pending"
      });
    } catch(e) {}
  }

  // Increment promo usage counter
  if (promoApplied) {
    try {
      await sb.from("promo_codes")
        .update({ used_count: (promoApplied.used_count || 0) + 1 })
        .eq("id", promoApplied.id);
    } catch(e) {}
  }

  // Check for simultaneous multi-pro bookings (same client, same day, different pro)
  if (user && proId) {
    try {
      var sameDay = bk.time_slot.split(" ")[0];
      var simCheck = await sb.from("bookings")
        .select("id,pro_name,service_name,time_slot")
        .eq("client_id", user.id)
        .neq("pro_id", proId)
        .like("time_slot", sameDay + "%")
        .in("status", ["pending","accepted"]);
      if (simCheck.data && simCheck.data.length) {
        notifyAdminSimultaneous(insertedBk, simCheck.data);
      }
    } catch(e) {}
  }

  // Reset state
  selNailColors = [];
  clearDesign();

  twilioNotifyBooking(insertedBk, "new_booking");
  toast(t("bkSuccess") || "Booking confirmed!", "ok");
  closeModal("bookingModal");
}

// ── BOOKING DETAIL MODAL ──────────────────────────────────────
function openBkDetail(bkJson, role) {
  var bk = typeof bkJson === "string" ? JSON.parse(bkJson) : bkJson;
  var isC = role === "client";
  var isP = role === "pro";
  var isA = role === "admin";
  var acts = "";

  if (isC) {
    // Travel fee approval banner — shown above all other actions when pending
    if (bk.travel_fee_status === "pending" && bk.travel_fee_requested > 0) {
      acts += "<div style=\"background:rgba(245,158,11,.1);border:2px solid #f59e0b;border-radius:var(--rs);padding:14px;margin-bottom:8px\">"
        + "<div style=\"font-weight:600;font-size:15px;color:#92400e;margin-bottom:4px\">🚗 Professional requests a travel fee</div>"
        + "<div style=\"font-size:13px;color:var(--tx);margin-bottom:2px\">Extra charge: <strong>+" + bk.travel_fee_requested + "₾</strong></div>"
        + (bk.travel_fee_reason ? "<div style=\"font-size:12px;color:var(--mu);margin-bottom:10px\">" + bk.travel_fee_reason + "</div>" : "<div style=\"margin-bottom:10px\"></div>")
        + "<div style=\"display:flex;gap:8px\">"
        + "<button class=\"btn btn-g\" style=\"flex:1;justify-content:center;padding:12px;font-size:14px;background:#22c55e;color:#fff\" onclick=\"respondTravelFee('" + bk.id + "',true)\">✓ Approve +" + bk.travel_fee_requested + "₾</button>"
        + "<button class=\"btn btn-red\" style=\"flex:1;justify-content:center;padding:12px;font-size:14px\" onclick=\"respondTravelFee('" + bk.id + "',false)\">✕ Decline</button>"
        + "</div></div>";
    }
    if (bk.travel_fee_status === "approved" && bk.travel_fee_requested > 0)
      acts += "<div style=\"background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:#15803d;margin-bottom:8px\">✓ Travel fee of " + bk.travel_fee_requested + "₾ approved</div>";
    if (bk.travel_fee_status === "declined")
      acts += "<div style=\"background:var(--bg2);border:1px solid var(--br);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:var(--mu);margin-bottom:8px\">Travel fee request was declined</div>";
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
      acts += "<div style=\"background:rgba(234,184,183,.1);border:1px solid rgba(234,184,183,.25);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:#a16207;display:flex;align-items:center;gap:8px\"><span style=\"font-size:18px\">⏳</span>" + t("paWaitClient") + "</div>";
    if (bk.status === "in_progress")
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"chBkStatus('" + bk.id + "','completed','pro')\">✓ " + t("markCompleted") + "</button>";
    if (bk.status === "pending") {
      // Show travel fee status if already requested
      if (bk.travel_fee_status === "pending" && bk.travel_fee_requested > 0)
        acts += "<div style=\"background:rgba(245,158,11,.1);border:2px solid #f59e0b;border-radius:var(--rs);padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:8px\">⏳ Travel fee of <strong>" + bk.travel_fee_requested + "₾</strong> requested — waiting for client approval</div>";
      else if (bk.travel_fee_status === "approved" && bk.travel_fee_requested > 0)
        acts += "<div style=\"background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:#15803d;margin-bottom:8px\">✓ Travel fee of <strong>" + bk.travel_fee_requested + "₾</strong> approved by client</div>";
      else if (bk.travel_fee_status === "declined")
        acts += "<div style=\"background:var(--bg2);border:1px solid var(--br);border-radius:var(--rs);padding:10px 14px;font-size:13px;color:var(--mu);margin-bottom:8px\">✕ Travel fee request was declined by client</div>";

      // Accept (enabled only after fee approved or no fee needed)
      var canAccept = !bk.travel_fee_status || bk.travel_fee_status === "approved" || bk.travel_fee_status === "declined";
      acts += "<button class=\"btn btn-g\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px;background:#22c55e;color:#fff" + (canAccept ? "" : ";opacity:.4;pointer-events:none") + "\" onclick=\"acceptBk('" + bk.id + "')\">✓ " + t("acceptBooking") + "</button>";

      // Request travel fee button (only when feature is enabled and not yet requested)
      if ((settings.distance_fee_enabled === true || settings.distance_fee_enabled === "true") && !bk.travel_fee_status)
        acts += "<button class=\"btn btn-warn\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"openTravelFeeModal('" + bk.id + "')\">🚗 Request Travel Fee</button>";

      acts += "<button class=\"btn btn-red\" style=\"display:block;width:100%;padding:14px;font-size:15px;justify-content:center;border-radius:var(--rs);margin-bottom:6px;font-weight:600;min-height:50px\" onclick=\"chBkStatus('" + bk.id + "','cancelled','pro')\">✕ " + t("decline") + "</button>";
    }
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
  + "<div><div class=\"fl\">" + t("bdStatus") + "</div>" + sBadge(bk.status) + "</div>"
  + "<div><div class=\"fl\">" + t("bdTotal") + "</div><div style=\"font-weight:500\">" + (bk.total || 0) + "₾"
  + (bk.discount_amount > 0 ? "<span style=\"color:#15803d;font-size:12px\"> (-" + bk.discount_amount + "₾)</span>" : "") + "</div></div>"
  + "<div><div class=\"fl\">" + t("bdService") + "</div><div style=\"font-size:14px\">" + (bk.service_name || "—") + "</div></div>"
  + "<div><div class=\"fl\">" + t("bdTime") + "</div><div style=\"font-size:14px\">" + (bk.time_slot || "ASAP") + "</div></div>"
  + "<div><div class=\"fl\">" + t("bdDistrict") + "</div><div style=\"font-size:14px\">" + (bk.district || "—") + "</div></div>"
  + "<div><div class=\"fl\">" + (isC ? t("bdProfessional") : t("bdClient")) + "</div><div style=\"font-size:14px\">" + (isC ? (bk.pro_name || "—") : (bk.client_name || "—")) + "</div></div>"
  + (canSeePhone(bk) ? "<div><div class=\"fl\">📞 " + t("bdPhone") + "</div><div style=\"font-size:14px;color:var(--g);font-weight:500\"><a href=\"tel:" + (isC ? (bk.pro_phone||"") : (bk.client_phone||"")) + "\" style=\"color:var(--g)\">" + (isC ? (bk.pro_phone||"—") : (bk.client_phone||"—")) + "</a></div></div>" : "")
  + (bk.address ? "<div style=\"grid-column:1/-1\"><div class=\"fl\">" + t("bdAddress") + "</div><div style=\"font-size:14px\">" + bk.address + "</div></div><div style=\"grid-column:1/-1\"><div class=\"track-map\" id=\"bkdMap\"></div></div>" : "")
  + (bk.notes   ? "<div style=\"grid-column:1/-1\"><div class=\"fl\">" + t("bdNotes") + "</div><div style=\"font-size:13px;color:var(--mu)\">" + bk.notes + "</div></div>" : "")
  + "</div>"
  + (bk.design_url ? "<div style=\"margin-top:11px\"><div class=\"fl\">🎨 Client Design Reference</div><div style=\"margin-top:6px\"><img src=\"" + bk.design_url + "\" style=\"max-width:100%;max-height:250px;border-radius:var(--rs);border:1.5px solid var(--br);cursor:pointer;object-fit:contain\" onclick=\"lbOpen(['" + bk.design_url + "'],0)\"></div></div>" : "")
  + nailHtml
  + ((isC || isP) && bk.pro_id ? "<div style=\"margin-top:12px\"><button class=\"btn btn-gh\" style=\"display:flex;align-items:center;gap:6px;width:100%;justify-content:center;padding:12px;font-size:14px;border-radius:var(--rs)\" onclick=\"closeM('bkd');openChatFromBooking('" + bk.id + "','" + (isC ? (bk.pro_name || "Pro") : (bk.client_name || "Client")).replace(/'/g,"\\'") + "')\">💬 " + t("chatWith") + " " + (isC ? (bk.pro_name || t("bdProfessional")) : (bk.client_name || t("bdClient"))) + "</button></div>" : "")
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
          toast(t("paOnlyBkDay"), "err");
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
    toast(t("paAccepted"), "ok");
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

// ── TRAVEL FEE ────────────────────────────────────────────────
var _tfActiveBkId = null;
function openTravelFeeModal(bkId) {
  _tfActiveBkId = bkId;
  var am = ge("tfAmount"); if (am) am.value = "";
  var re = ge("tfReason"); if (re) re.value = "";
  openM("travelFee");
}

async function submitTravelFeeRequest() {
  var bkId = _tfActiveBkId;
  if (!bkId) return;
  var amount = parseInt(ge("tfAmount") ? ge("tfAmount").value : 0, 10);
  var reason = ge("tfReason") ? ge("tfReason").value.trim() : "";
  if (!amount || amount < 1) { toast(t("tfEnterAmt"), "err"); return; }

  try {
    var r = await sb.from("bookings")
      .update({ travel_fee_requested: amount, travel_fee_status: "pending", travel_fee_reason: reason })
      .eq("id", bkId);
    if (r.error) throw r.error;
    toast(t("tfRequested"), "ok");
    closeM("travelFee");
    closeM("bkd");
    if (typeof loadProDash === "function") loadProDash();
    // Notify client via Twilio
    try {
      var bkTw = await sb.from("bookings").select("client_name,client_phone,pro_name,service_name,time_slot").eq("id", bkId).single();
      if (bkTw.data) {
        var b = bkTw.data;
        var detail = b.service_name + (b.time_slot ? " · " + b.time_slot : "");
        sendTwilioNotification(b.client_phone, "travel_fee_request", b.client_name, b.pro_name + " requests +" + amount + "₾ travel fee for " + detail + (reason ? ": " + reason : ""));
      }
    } catch(e) {}
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function respondTravelFee(bkId, approve) {
  var newStatus = approve ? "approved" : "declined";
  try {
    // If approved, add fee to booking total
    var updates = { travel_fee_status: newStatus };
    if (approve) {
      var bkCur = await sb.from("bookings").select("total,travel_fee_requested").eq("id", bkId).single();
      if (!bkCur.error && bkCur.data) {
        updates.total = (bkCur.data.total || 0) + (bkCur.data.travel_fee_requested || 0);
      }
    }
    var r = await sb.from("bookings").update(updates).eq("id", bkId);
    if (r.error) throw r.error;
    toast(approve ? t("tfApproved") : t("tfDeclined"), approve ? "ok" : "");
    closeM("bkd");
    if (typeof loadClientDash === "function") loadClientDash();
    renderTracker();
    // Notify pro via Twilio
    try {
      var bkTw = await sb.from("bookings").select("client_name,client_phone,pro_name,pro_phone,service_name,travel_fee_requested").eq("id", bkId).single();
      if (bkTw.data) {
        var b = bkTw.data;
        var msgType = approve ? "travel_fee_approved" : "travel_fee_declined";
        sendTwilioNotification(b.pro_phone, msgType, b.pro_name, b.client_name + " · " + b.service_name + (approve ? " (+" + b.travel_fee_requested + "₾)" : ""));
      }
    } catch(e) {}
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function confirmArrival(id) {
  try {
    var r = await sb.from("bookings").update({ status: "in_progress" }).eq("id", id);
    if (r.error) throw r.error;
    toast(t("paConfirmed"), "ok");
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
  ge("revSubjectTxt").textContent = role === "client" ? t("rvRatePro") : t("rvRateClient");
  openM("rev");
}

async function submitReview() {
  if (!starRating) { toast(t("rvSelectRating"), "err"); return; }
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
    toast(t("rvSubmitted"), "ok");
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
