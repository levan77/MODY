// ═══════════════════════════════════════════════════════════════
//  MODY — Client Dashboard
//  Load order: 9 (depends on: config.js, i18n.js, ui.js, auth.js, booking.js)
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
//  CLIENT DASHBOARD
// ──────────────────────────────────────────────────────────────
function cTab(tab) {
  ["bk","rev","prof","sup"].forEach(function(x) {
    var el = ge("cTab-" + x), ni = ge("cN-" + x);
    if (el) el.classList.toggle("hide", x !== tab);
    if (ni) ni.classList.toggle("on",   x === tab);
  });
  // Mobile bottom nav highlight
  var mn = ge("cMobNav");
  if (mn) mn.querySelectorAll(".mob-tab").forEach(function(b, i) {
    var map = ["bk","rev","prof","sup","out"];
    b.classList.toggle("on", map[i] === tab);
  });
  if (tab === "rev")  loadClientRevs();
  if (tab === "sup")  loadTickets("client");
}

async function loadClientDash() {
  if (!user) return;
  var nm = profile ? profile.full_name : user.email;
  var cw = ge("cdWelcome"); if (cw) cw.textContent = t("welcomeBack") + ", " + nm.split(" ")[0];
  var cn = ge("cdName");    if (cn) cn.textContent = nm;

  // Profile tab inputs
  if (ge("cPName"))  ge("cPName").value  = nm;
  if (ge("cPEmail")) ge("cPEmail").value = profile ? (profile.email || user.email) : user.email;
  if (ge("cPPhone")) ge("cPPhone").value = profile ? (profile.phone || "") : "";

  // Show current email/phone in account settings
  var ce = ge("cCurrentEmail"); if (ce) ce.textContent = t("currentLabel") + ": " + (profile ? (profile.email || user.email) : user.email);
  var cp = ge("cCurrentPhone"); if (cp) cp.textContent = t("currentLabel") + ": " + (profile && profile.phone ? profile.phone : t("notSet"));

  // Avatar
  if (profile && profile.avatar_url) {
    var ar = ge("cAvaRing");
    if (ar) ar.innerHTML = "<img src=\"" + profile.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">";
    var ca = ge("cdAva");
    if (ca) ca.innerHTML = "<img src=\"" + profile.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">";
  }

  // Fetch bookings
  var r = await sb.from("bookings").select("*").eq("client_id", user.id).order("created_at", { ascending: false });
  var bks      = r.data || [];
  var upcoming = bks.filter(function(b) { return ["pending","accepted","on_the_way","arrived","in_progress"].includes(b.status); });
  var done     = bks.filter(function(b) { return b.status === "completed"; });

  // Stats (no "Total Spent" per requirements)
  if (ge("cS1")) ge("cS1").textContent = bks.length;
  if (ge("cS2")) ge("cS2").textContent = upcoming.length;
  if (ge("cS3")) ge("cS3").textContent = done.length;

  // Wallet balance
  try {
    var wRes = await sb.from("client_wallets").select("balance").eq("client_id", user.id).maybeSingle();
    var wBal = (wRes.data && wRes.data.balance) ? wRes.data.balance : 0;
    var wEl = ge("cWalletBal");
    if (wEl) { wEl.textContent = wBal + "₾"; wEl.parentElement.style.display = wBal > 0 ? "" : "none"; }
  } catch(e) {
    var wEl2 = ge("cWalletBal"); if (wEl2) wEl2.parentElement.style.display = "none";
  }

  // ── Arrival & On-the-Way Banners ──
  var bannerEl = ge("cArrivalBanner");
  if (bannerEl) {
    var arrivedBks = bks.filter(function(b) { return b.status === "arrived"; });
    var onWayBks   = bks.filter(function(b) { return b.status === "on_the_way"; });
    var bannerHtml = "";
    onWayBks.forEach(function(b, i) {
      bannerHtml += "<div class=\"track-banner\" style=\"background:rgba(168,85,247,.08);border:1.5px solid rgba(168,85,247,.3)\">"
        + "<div style=\"display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px\">"
        + "<div style=\"display:flex;align-items:center;gap:10px\">"
        + "<span style=\"font-size:22px\">🚗</span>"
        + "<div>"
        + "<div style=\"font-weight:600;font-size:15px;color:#7e22ce\"><span class=\"track-pulse\"></span>" + t("cbOnWay") + "</div>"
        + "<div style=\"font-size:13px;color:var(--mu)\">" + (b.pro_name || "Your pro") + " — " + (b.service_name || "") + "</div>"
        + "</div></div>"
        + "<span style=\"font-size:12px;color:var(--mu)\">" + t("cbLiveTrack") + "</span>"
        + "</div>"
        + "<div class=\"track-map\" id=\"trackMap_otw_" + i + "\"></div>"
        + "</div>";
    });
    arrivedBks.forEach(function(b) {
      bannerHtml += "<div class=\"track-banner\" style=\"background:rgba(34,197,94,.1);border:1.5px solid rgba(34,197,94,.35);animation:pulseGlow 2s ease-in-out infinite\">"
        + "<div style=\"display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px\">"
        + "<div style=\"display:flex;align-items:center;gap:10px\">"
        + "<span style=\"font-size:26px\">📍</span>"
        + "<div>"
        + "<div style=\"font-weight:600;font-size:15px;color:#15803d\">" + t("cbArrived") + "</div>"
        + "<div style=\"font-size:13px;color:var(--mu)\">" + (b.pro_name || "Your pro") + " — " + (b.service_name || "") + " · " + (b.time_slot || "ASAP") + "</div>"
        + "</div></div>"
        + "<button class=\"btn btn-g\" style=\"font-size:14px;padding:10px 22px\" onclick=\"confirmArrival('" + b.id + "')\">✓ " + t("cbConfirm") + "</button>"
        + "</div></div>";
    });
    bannerEl.innerHTML = bannerHtml;
    // Initialize maps for on_the_way bookings
    onWayBks.forEach(function(b, i) {
      setTimeout(function() { initClientTrackMap("trackMap_otw_" + i, b.id, b.pro_id); }, 100);
    });
  }

  // Table
  var body = ge("cBkBody"); if (!body) return;
  if (!bks.length) {
    body.innerHTML = "<tr><td colspan=\"5\" style=\"text-align:center;padding:18px;color:var(--mu)\">No bookings yet. <span style=\"color:var(--g);cursor:pointer\" onclick=\"show('list')\">" + t("bookSvc") + " →</span></td></tr>";
    return;
  }
  body.innerHTML = bks.map(function(b) {
    var safe = JSON.stringify(b).replace(/\\/g,"\\\\").replace(/"/g,"&quot;");
    var actionBtn = "";
    if (b.status === "arrived") {
      actionBtn = "<button class=\"btn-sm btn-ok\" style=\"font-size:11px;margin-right:4px\" onclick=\"event.stopPropagation();confirmArrival('" + b.id + "')\">✓ " + t("cbConfirm") + "</button>";
    } else if (b.status === "on_the_way") {
      actionBtn = "<span style=\"font-size:11px;color:#7e22ce\">🚗 " + t("cbEnRoute") + "</span> ";
    }
    return "<tr" + (b.status === "arrived" ? " style=\"background:rgba(34,197,94,.06)\"" : "") + ">"
         + "<td>" + (b.service_name || "—") + "</td>"
         + "<td>" + (b.pro_name || "—") + "</td>"
         + "<td>" + (b.time_slot || "ASAP") + "</td>"
         + "<td>" + sBadge(b.status) + "</td>"
         + "<td style=\"white-space:nowrap\">" + actionBtn + "<button class=\"btn-sm btn-gh\" style=\"font-size:11px\" onclick=\"openBkDetail('" + safe + "','client')\">" + t("cbDetails") + "</button></td>"
         + "</tr>";
  }).join("");
}

async function saveClientProfile() {
  var n  = ge("cPName").value.trim();
  var ph = ge("cPPhone").value.trim();
  try {
    await sb.from("profiles").update({ full_name: n, phone: ph }).eq("id", user.id);
    if (profile) { profile.full_name = n; profile.phone = ph; }
    updateNav();
    toast(t("saveDone"), "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function loadClientRevs() {
  var el = ge("cRevList"); if (!el) return;
  try {
    var r = await sb.from("reviews").select("*").eq("reviewer_id", user.id).order("created_at", { ascending: false });
    if (r.error) { el.innerHTML = "<p style=\"color:#ef4444;font-size:13px\">Error loading reviews: " + r.error.message + "<br><span style=\"font-size:11px\">Run the SQL setup in admin Settings to fix the reviews table.</span></p>"; return; }
    var revs = r.data || [];
    if (!revs.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">" + t("noRevTxt") + "</p>"; return; }
    el.innerHTML = revs.map(function(rv) {
      var s = "★".repeat(rv.rating) + "☆".repeat(5 - rv.rating);
      return "<div style=\"padding:10px;background:var(--bg2);border-radius:var(--rs);margin-bottom:6px\">"
           + "<div style=\"display:flex;justify-content:space-between;margin-bottom:3px\">"
           + "<span style=\"font-size:13px;font-weight:500\">Booking #" + rv.booking_id.substring(0,8) + "</span>"
           + "<span style=\"color:#facc15;font-size:14px\">" + s + "</span></div>"
           + (rv.comment ? "<p style=\"font-size:13px;color:var(--mu)\">" + rv.comment + "</p>" : "")
           + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">" + t("noRevTxt") + "</p>"; }
}

