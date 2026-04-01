// ═══════════════════════════════════════════════════════════════
//  MODY — Admin Panel
//  Load order: 11 (depends on: config.js, i18n.js, ui.js, auth.js)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  PART 8: ADMIN PANEL
// ═══════════════════════════════════════════════════════════════

var adminAllBks = [];

// ── TAB SWITCHER ──────────────────────────────────────────────
function aTab(tab) {
  ["ov","app","bks","pros","usr","cats","promo","rev","sup","set","tr","analytics","blog","mcal","notifs","crm","incidents"].forEach(function(x) {
    var el = ge("aTab-" + x), ni = ge("aN-" + x);
    if (el) el.classList.toggle("hide", x !== tab);
    if (ni) ni.classList.toggle("on",   x === tab);
  });
  // Mobile bottom nav highlight
  var mn = ge("aMobNav");
  if (mn) mn.querySelectorAll(".mob-tab").forEach(function(b, i) {
    var map = ["ov","app","bks","pros","more"];
    b.classList.toggle("on", map[i] === tab);
  });
  if (tab === "ov")    loadAdminData();
  if (tab === "app")   loadApprovals();
  if (tab === "bks")   loadAdminBks();
  if (tab === "pros")  loadAdminPros();
  if (tab === "usr")   loadAdminUsers();
  if (tab === "cats")  loadAdminCats();
  if (tab === "promo") loadAdminPromos();
  if (tab === "rev")   loadAdminRevs();
  if (tab === "sup")   { loadAdminSupport(); loadAdminChats(); }
  if (tab === "set") {
    loadSettings();
    var sb2 = ge("sqlBlock"); if (sb2) sb2.textContent = SETUP_SQL;
  }
  if (tab === "tr") {
    loadTransEditor();
  }
  if (tab === "analytics") {
    loadAnalytics();
  }
  if (tab === "blog") {
    loadAdminBlog();
  }
  if (tab === "mcal") {
    renderMasterCal();
  }
  if (tab === "notifs") {
    loadAdminNotifs();
  }
  if (tab === "crm") {
    loadCrm();
  }
  if (tab === "incidents") {
    loadIncidents();
  }
}

// ── OVERVIEW ──────────────────────────────────────────────────
async function loadAdminData() {
  var ae = ge("aEmail"); if (ae && profile) ae.textContent = profile.email || user.email;
  try {
    var [profs, bks, usrs] = await Promise.all([
      sb.from("professionals").select("id,status"),
      sb.from("bookings").select("id,total,status"),
      sb.from("profiles").select("id")
    ]);
    var profList = profs.data || [];
    var bkList   = bks.data || [];
    var usrList  = usrs.data || [];
    var revenue  = bkList.filter(function(b) { return b.status === "completed"; }).reduce(function(s, b) { return s + (b.total || 0); }, 0);
    if (ge("aS1")) ge("aS1").textContent = usrList.length;
    if (ge("aS2")) ge("aS2").textContent = profList.filter(function(p) { return p.status === "approved"; }).length;
    if (ge("aS3")) ge("aS3").textContent = bkList.length;
    if (ge("aS4")) ge("aS4").textContent = revenue + "₾";

    var pending = profList.filter(function(p) { return p.status === "pending"; }).length;
    var ab = ge("appBadge"); if (ab) ab.textContent = pending;
    var ap = ge("aPendCount"); if (ap) ap.textContent = pending;

    // Recent bookings
    var recent = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(10);
    adminAllBks = recent.data || [];
    renderAdminBks();
    var body = ge("aBkBody"); if (!body) return;
    body.innerHTML = (recent.data || []).slice(0, 8).map(function(b) {
      return "<tr>"
           + "<td>" + (b.client_name || "—") + "</td>"
           + "<td>" + (b.pro_name || "—") + "</td>"
           + "<td>" + (b.service_name || "—") + "</td>"
           + "<td>" + (b.total || 0) + "₾</td>"
           + "<td>" + sBadge(b.status) + "</td>"
           + "</tr>";
    }).join("");
  } catch(e) {
    toast("Could not load admin data. Run setup SQL.", "err");
  }
}

// ── APPROVALS ─────────────────────────────────────────────────
async function loadApprovals() {
  var el = ge("aAppList"); if (!el) return;
  try {
    var r = await sb.from("professionals").select("*").eq("status", "pending");
    var list = r.data || [];
    var ab = ge("appBadge"); if (ab) ab.textContent = list.length;
    var ap = ge("aPendCount"); if (ap) ap.textContent = list.length + " pending";
    if (!list.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No pending approvals.</p>"; return; }
    el.innerHTML = list.map(function(p) {
      return "<div class=\"app-row\">"
           + "<div class=\"app-ava\">" + (p.avatar_url ? "<img src=\"" + p.avatar_url + "\">" : (p.emoji || "💅")) + "</div>"
           + "<div>"
           + "<div style=\"font-weight:500;font-size:14px\">" + p.name + "</div>"
           + "<div style=\"font-size:12px;color:var(--mu)\">" + p.specialty + " · " + p.area + "</div>"
           + "</div>"
           + "<div style=\"display:flex;gap:6px\">"
           + "<button class=\"btn-sm btn-ok\" onclick=\"approvePro('" + p.id + "')\">Approve</button>"
           + "<button class=\"btn-sm btn-no\" onclick=\"rejectPro('" + p.id + "')\">Reject</button>"
           + "</div></div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Run setup SQL first.</p>"; }
}

async function approvePro(id) {
  try {
    await sb.from("professionals").update({ status: "approved" }).eq("id", id);
    toast("Professional approved!", "ok");
    loadApprovals(); loadAdminData();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function rejectPro(id) {
  try {
    await sb.from("professionals").update({ status: "rejected" }).eq("id", id);
    toast("Professional rejected.");
    loadApprovals(); loadAdminData();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── ALL BOOKINGS ──────────────────────────────────────────────
async function loadAdminBks() {
  try {
    var r = await sb.from("bookings").select("*").order("created_at", { ascending: false });
    adminAllBks = r.data || [];
    renderAdminBks();
  } catch(e) {}
}

function renderAdminBks() {
  var body = ge("aAllBkBody"); if (!body) return;
  var q  = (ge("bkSearch") ? ge("bkSearch").value : "").toLowerCase();
  var bks = adminAllBks.filter(function(b) {
    return !q || (b.client_name || "").toLowerCase().includes(q)
              || (b.pro_name || "").toLowerCase().includes(q)
              || (b.service_name || "").toLowerCase().includes(q);
  });
  if (!bks.length) { body.innerHTML = "<tr><td colspan=\"8\" style=\"text-align:center;padding:18px;color:var(--mu)\">No bookings found.</td></tr>"; return; }
  var opts = ["pending","accepted","on_the_way","arrived","in_progress","completed","cancelled","no_show","late","refunded"];
  body.innerHTML = bks.map(function(b) {
    var dur = b.service_duration ? b.service_duration + " min" : "—";
    return "<tr>"
         + "<td>" + (b.client_name || "—") + "<div style=\"font-size:10px;color:var(--mu)\">" + (b.client_phone || "") + "</div></td>"
         + "<td>" + (b.pro_name || "—") + "</td>"
         + "<td>" + (b.service_name || "—") + "<div style=\"font-size:10px;color:var(--mu)\">" + dur + "</div></td>"
         + "<td>" + (b.time_slot || "ASAP") + "</td>"
         + "<td>" + (b.total || 0) + "₾</td>"
         + "<td>" + sBadge(b.status) + "</td>"
         + "<td><select class=\"fi\" style=\"font-size:12px;padding:3px 6px\" onchange=\"chBkStatus('" + b.id + "',this.value,'admin')\">"
         + "<option value=\"\">Change…</option>"
         + opts.map(function(s) { return "<option value=\"" + s + "\">" + s.replace(/_/g," ") + "</option>"; }).join("")
         + "</select></td>"
         + "<td style=\"display:flex;gap:4px;flex-wrap:wrap\">"
         + "<button class=\"btn-sm btn-gh\" onclick=\"openAdminBkEdit('" + b.id + "','" + (b.time_slot||"").replace(/'/g,"\\'") + "')\" title=\"Edit time\">✏️</button>"
         + "<button class=\"btn-sm btn-no\" onclick=\"chBkStatus('" + b.id + "','cancelled','admin')\" title=\"Cancel booking\">🗑</button>"
         + "</td></tr>";
  }).join("");
}

// ── ADMIN: EDIT BOOKING TIME ──────────────────────────────
var adminEditBkId = null;
function openAdminBkEdit(id, currentSlot) {
  adminEditBkId = id;
  var parts = (currentSlot || "").split(" ");
  var dateEl = ge("adminBkEditDate"); if (dateEl) dateEl.value = parts[0] || "";
  var timeEl = ge("adminBkEditTime"); if (timeEl) timeEl.value = parts[1] || "";
  openM("adminBkEdit");
}

async function saveAdminBkTime() {
  if (!adminEditBkId) return;
  var d = ge("adminBkEditDate").value;
  var t = ge("adminBkEditTime").value;
  if (!d || !t) { toast("Pick a date and time", "err"); return; }
  try {
    var r = await sb.from("bookings").update({ time_slot: d + " " + t }).eq("id", adminEditBkId);
    if (r.error) throw r.error;
    toast("Booking rescheduled!", "ok");
    closeM("adminBkEdit");
    loadAdminBks();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── ADMIN: ADD BOOKING MANUALLY ───────────────────────────
function openAdminAddBk() {
  // Populate pro dropdown
  var proSel = ge("aabProSel");
  if (proSel && typeof allPros !== "undefined") {
    proSel.innerHTML = "<option value=\"\">— Select Pro —</option>"
      + allPros.filter(function(p) { return p.status === "approved"; })
               .map(function(p) { return "<option value=\"" + p.id + "\" data-name=\"" + (p.name||"").replace(/"/g,"&quot;") + "\" data-phone=\"" + (p.phone||"") + "\">" + p.name + " (" + (p.specialty||"") + ")</option>"; }).join("");
  }
  ge("aabDate").value = fmtDate(new Date());
  ge("aabClientName").value = "";
  ge("aabClientPhone").value = "";
  ge("aabPrice").value = "";
  ge("aabDuration").value = "60";
  ge("aabAddress").value = "";
  ge("aabSvcSel").innerHTML = "<option value=\"\">— Select Service —</option>";
  openM("adminAddBk");
}

function aabProChanged() {
  var proSel = ge("aabProSel");
  var proId = proSel ? proSel.value : "";
  var svcSel = ge("aabSvcSel");
  if (!svcSel) return;
  svcSel.innerHTML = "<option value=\"\">— Select Service —</option>";
  if (!proId || typeof allPros === "undefined") return;
  var pro = allPros.find(function(p) { return p.id === proId; });
  if (!pro || !pro.services || !pro.services.length) return;
  pro.services.forEach(function(s) {
    var opt = document.createElement("option");
    opt.value = typeof s === "object" ? (s.name || s) : s;
    opt.textContent = typeof s === "object" ? ((s.name || s) + (s.price ? " — " + s.price + "₾" : "") + (s.duration ? " (" + s.duration + "min)" : "")) : s;
    if (typeof s === "object" && s.price) opt.dataset.price = s.price;
    if (typeof s === "object" && s.duration) opt.dataset.dur = s.duration;
    svcSel.appendChild(opt);
  });
  svcSel.onchange = function() {
    var o = svcSel.options[svcSel.selectedIndex];
    if (o && o.dataset.price) ge("aabPrice").value = o.dataset.price;
    if (o && o.dataset.dur) ge("aabDuration").value = o.dataset.dur;
  };
}

async function submitAdminAddBk() {
  var clientName = (ge("aabClientName").value || "").trim();
  var clientPhone = (ge("aabClientPhone").value || "").trim();
  var proSel = ge("aabProSel");
  var proId = proSel ? proSel.value : "";
  var proOpt = proSel ? proSel.options[proSel.selectedIndex] : null;
  var proName = proOpt ? (proOpt.dataset.name || proOpt.text.split(" (")[0]) : "";
  var svcSel = ge("aabSvcSel");
  var svcName = svcSel ? svcSel.value : "";
  var svcPrice = parseInt(ge("aabPrice").value) || 0;
  var svcDur = parseInt(ge("aabDuration").value) || 60;
  var date = ge("aabDate").value;
  var time = ge("aabTime").value;
  var addr = (ge("aabAddress").value || "").trim();
  if (!clientName || !proId || !svcName || !date || !time) { toast("Fill in all required fields", "err"); return; }
  try {
    var r = await sb.from("bookings").insert({
      client_name: clientName, client_phone: clientPhone,
      pro_id: proId, pro_name: proName,
      service_name: svcName, service_price: svcPrice, service_duration: svcDur,
      total: svcPrice, address: addr,
      time_slot: date + " " + time, status: "accepted"
    });
    if (r.error) throw r.error;
    toast("Booking added!", "ok");
    closeM("adminAddBk");
    loadAdminBks();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── ADMIN: NOTIFICATIONS ──────────────────────────────────
async function loadAdminNotifs() {
  var el = ge("adminNotifList"); if (!el) return;
  el.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Loading...</p>";
  try {
    var r = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    var list = r.data || [];
    var unread = list.filter(function(n) { return !n.read; }).length;
    var badge = ge("adminNotifBadge");
    if (badge) badge.style.display = unread ? "inline-flex" : "none", badge.textContent = unread;
    if (!list.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:13px;padding:12px 0\">No notifications yet.</p>"; return; }
    el.innerHTML = list.map(function(n) {
      return "<div style=\"padding:12px;border-bottom:1px solid var(--br);background:" + (n.read ? "transparent" : "rgba(234,184,183,.07)") + "\">"
        + "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:8px\">"
        + "<div style=\"font-size:13px;line-height:1.6;white-space:pre-wrap\">" + (n.message || "") + "</div>"
        + "<button class=\"btn-sm btn-gh\" onclick=\"markNotifRead('" + n.id + "')\" style=\"flex-shrink:0\">" + (n.read ? "✓" : "Mark read") + "</button>"
        + "</div>"
        + "<div style=\"font-size:11px;color:var(--mu);margin-top:4px\">" + new Date(n.created_at).toLocaleString() + "</div>"
        + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444\">Error: " + e.message + "</p>"; }
}

async function markNotifRead(id) {
  try {
    await sb.from("notifications").update({ read: true }).eq("id", id);
    loadAdminNotifs();
  } catch(e) {}
}

async function markAllNotifsRead() {
  try {
    await sb.from("notifications").update({ read: true }).eq("read", false);
    loadAdminNotifs();
  } catch(e) {}
}

// ── ALL PROFESSIONALS ─────────────────────────────────────────
async function loadAdminPros() {
  var body = ge("aProsBody"); if (!body) return;
  try {
    var r = await sb.from("professionals").select("*").order("created_at", { ascending: false });
    var list = r.data || [];
    if (!list.length) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">No professionals yet.</td></tr>"; return; }
    body.innerHTML = list.map(function(p) {
      var uid = genUid("P", p.id);
      return "<tr>"
           + "<td><strong>" + p.name + "</strong>"
           + (p.verified ? " <span class=\"vbadge\">Verified</span>" : "")
           + (p.featured ? " <span style=\"display:inline-flex;align-items:center;gap:2px;background:rgba(234,184,183,.12);color:#C9918F;border:1px solid rgba(234,184,183,.25);padding:2px 7px;border-radius:50px;font-size:10px;font-weight:600\">★ Featured</span>" : "")
           + "<div style=\"font-size:10px;color:var(--g);font-weight:600;letter-spacing:.5px\">" + uid + "</div></td>"
           + "<td>" + (p.specialty || "—") + "</td>"
           + "<td>" + (p.area || "—") + "</td>"
           + "<td>★ " + (p.rating || "—") + "</td>"
           + "<td><input class=\"fi\" type=\"number\" min=\"0\" max=\"50\" style=\"width:60px;padding:3px 5px;font-size:12px\" value=\"" + (p.commission_rate || "") + "\" placeholder=\"—\" onchange=\"setProCommission('" + p.id + "',this.value)\">%</td>"
           + "<td>" + sBadge(p.status) + "</td>"
           + "<td style=\"display:flex;gap:5px;flex-wrap:wrap\">"
           + "<button class=\"btn-sm btn-gh\" onclick=\"openAdminCal('" + p.id + "','" + p.name.replace(/'/g,"\\'") + "')\" title=\"Individual calendar\">📅</button>"
           + "<button class=\"btn-sm btn-gh\" onclick=\"gotoMasterCal()\" title=\"Master Calendar — all pros\">🗓</button>"
           + (p.status !== "approved" ? "<button class=\"btn-sm btn-ok\" onclick=\"approvePro('" + p.id + "')\">Approve</button>" : "")
           + (p.status !== "rejected" ? "<button class=\"btn-sm btn-no\" onclick=\"rejectPro('" + p.id + "')\">Reject</button>" : "")
           + "<button class=\"btn-sm btn-gh\" onclick=\"suspendUser('" + p.user_id + "')\">Suspend</button>"
           + "<button class=\"btn-sm \" + (p.verified ? \"btn-no\" : \"btn-ok\") + \"\" onclick=\"toggleVerify('" + p.id + "'," + !p.verified + ")\">" + (p.verified ? "Unverify" : "Verify") + "</button>"
           + "<button class=\"btn-sm " + (p.featured ? "btn-g" : "btn-gh") + "\" onclick=\"toggleFeatured('" + p.id + "'," + !p.featured + ")\">" + (p.featured ? "★ Featured" : "☆ Feature") + "</button>"
           + "</td></tr>";
    }).join("");
  } catch(e) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">Run setup SQL first.</td></tr>"; }
}

// ── ALL USERS ─────────────────────────────────────────────────
async function loadAdminUsers() {
  var body = ge("aUsrBody"); if (!body) return;
  try {
    var r = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    var list = r.data || [];
    if (!list.length) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">No users yet.</td></tr>"; return; }
    body.innerHTML = list.map(function(u) {
      var uid = genUid(u.role === "pro" ? "P" : "C", u.id);
      return "<tr>"
           + "<td>" + (u.full_name || "—") + "<div style=\"font-size:10px;color:var(--g);font-weight:600;letter-spacing:.5px\">" + uid + "</div></td>"
           + "<td>" + (u.email || "—") + "</td>"
           + "<td><span class=\"bdg bdg-g\">" + u.role + "</span></td>"
           + "<td>" + (u.gender === "female" ? "👩" : u.gender === "male" ? "👨" : "—") + "</td>"
           + "<td>" + (u.phone || "—") + "</td>"
           + "<td>" + new Date(u.created_at).toLocaleDateString() + "</td>"
           + "<td>"
           + "<button class=\"btn-sm btn-no\" onclick=\"suspendUser('" + u.id + "')\">" + (u.suspended ? "Unsuspend" : "Suspend") + "</button> "
           + "<button class=\"btn-sm btn-gh\" onclick=\"adminResetPassword('" + (u.email||"") + "')\">🔑 Reset PW</button>"
           + "</td>"
           + "</tr>";
    }).join("");
  } catch(e) { body.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center;padding:18px;color:var(--mu)\">Run setup SQL first.</td></tr>"; }
}

async function suspendUser(id) {
  try {
    var r = await sb.from("profiles").select("suspended").eq("id", id).single();
    var cur = r.data ? r.data.suspended : false;
    await sb.from("profiles").update({ suspended: !cur }).eq("id", id);
    toast(cur ? "User unsuspended." : "User suspended.");
    loadAdminUsers();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function adminResetPassword(email) {
  if (!email) { toast("No email for this user", "err"); return; }
  if (!confirm("Send password reset email to " + email + "?")) return;
  try {
    var r = await sb.auth.resetPasswordForEmail(email);
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast("Password reset email sent to " + email, "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function adminDeleteReview(id) {
  if (!confirm("Delete this review permanently?")) return;
  try {
    await sb.from("reviews").delete().eq("id", id);
    toast("Review deleted.", "ok");
    doLookup();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── CATEGORIES ────────────────────────────────────────────────

// catIcon() is defined in categories.js (shared)

function previewCatIcon(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var prev = ge("catIconPreview");
    if (prev) prev.innerHTML = "<img src=\"" + e.target.result + "\" style=\"width:100%;height:100%;object-fit:contain\">";
  };
  reader.readAsDataURL(input.files[0]);
}

function updateCatIconPreview() {
  var emoji = ge("catEmoji").value.trim();
  var iconUrl = ge("catIconUrl").value;
  var prev = ge("catIconPreview");
  if (!prev) return;
  if (iconUrl) prev.innerHTML = "<img src=\"" + iconUrl + "\" style=\"width:100%;height:100%;object-fit:contain\">";
  else prev.innerHTML = emoji || "💅";
}

async function uploadCatIcon(file) {
  var ext = file.name.split(".").pop().toLowerCase();
  var path = "category-icons/" + Date.now() + "." + ext;
  try {
    var r = await sb.storage.from("assets").upload(path, file, { upsert: true });
    if (r.error) { toast("Upload error: " + r.error.message, "err"); return null; }
    return sb.storage.from("assets").getPublicUrl(path).data.publicUrl;
  } catch(e) { toast("Upload failed: " + e.message, "err"); return null; }
}

// loadSubCategories(), getSubsForCat(), subCatName() are defined in categories.js (shared)

async function loadAdminCats() {
  var el = ge("aCatList"); if (!el) return;
  await loadCategories();
  await loadSubCategories();
  if (!categories.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No categories yet.</p>"; return; }
  el.innerHTML = categories.map(function(c) {
    var subs = getSubsForCat(c.id);
    var subsText = subs.length ? subs.map(function(s) { return s.name_en; }).join(", ") : "No subcategories";
    return "<div class=\"cat-admin-row\">"
         + "<div style=\"width:40px;height:40px;border-radius:var(--rs);background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid var(--br)\">" + catIcon(c, 28) + "</div>"
         + "<div style=\"flex:1\">"
         + "<div style=\"font-weight:500;font-size:14px\">" + c.name_en + (c.name_ka ? " / " + c.name_ka : "") + "</div>"
         + "<div style=\"font-size:12px;color:var(--mu)\">" + subsText + "</div>"
         + "</div>"
         + "<div style=\"display:flex;align-items:center;gap:2px;flex-shrink:0\"><input class=\"fi\" type=\"number\" min=\"0\" max=\"50\" style=\"width:50px;padding:3px 4px;font-size:11px\" value=\"" + (c.commission_rate || "") + "\" placeholder=\"—\" onchange=\"setCatCommission('" + c.id + "',this.value)\"><span style=\"font-size:11px;color:var(--mu)\">%</span></div>"
         + "<label class=\"sw\"><input type=\"checkbox\"" + (c.visible !== false ? " checked" : "") + " onchange=\"toggleCatVisibility('" + c.id + "',this.checked)\"><span class=\"sw-t\"></span></label>"
         + "<button class=\"btn-sm btn-gh\" onclick=\"openCatModal('" + c.id + "')\">Edit</button>"
         + "<button class=\"btn-sm btn-no\" onclick=\"deleteCat('" + c.id + "')\">Del</button>"
         + "</div>";
  }).join("");
  var subEl = ge("aSubCatList");
  if (subEl) {
    if (!allSubCats.length) { subEl.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No subcategories yet.</p>"; }
    else {
      subEl.innerHTML = allSubCats.map(function(sc) {
        var parent = categories.find(function(c) { return c.id === sc.category_id; });
        return "<div class=\"cat-admin-row\">"
          + "<span style=\"font-size:18px\">" + (sc.emoji || "📂") + "</span>"
          + "<div style=\"flex:1\">"
          + "<div style=\"font-weight:500;font-size:14px\">" + sc.name_en + (sc.name_ka ? " / " + sc.name_ka : "") + "</div>"
          + "<div style=\"font-size:12px;color:var(--mu)\">Parent: " + (parent ? parent.name_en : "—") + "</div>"
          + "</div>"
          + "<div style=\"display:flex;align-items:center;gap:2px;flex-shrink:0\"><input class=\"fi\" type=\"number\" min=\"0\" max=\"50\" style=\"width:50px;padding:3px 4px;font-size:11px\" value=\"" + (sc.commission_rate || "") + "\" placeholder=\"—\" onchange=\"setSubCatCommission('" + sc.id + "',this.value)\"><span style=\"font-size:11px;color:var(--mu)\">%</span></div>"
          + "<label class=\"sw\"><input type=\"checkbox\"" + (sc.visible !== false ? " checked" : "") + " onchange=\"toggleSubCatVis('" + sc.id + "',this.checked)\"><span class=\"sw-t\"></span></label>"
          + "<button class=\"btn-sm btn-gh\" onclick=\"openSubCatModal('" + sc.id + "')\">Edit</button>"
          + "<button class=\"btn-sm btn-no\" onclick=\"deleteSubCat('" + sc.id + "')\">Del</button>"
          + "</div>";
      }).join("");
    }
  }
}

function openCatModal(id) {
  var cat = id ? categories.find(function(c) { return c.id === id; }) : null;
  ge("catEditId").value = id || "";
  ge("catModalTitle").textContent = id ? "Edit Category" : "Add Category";
  ge("catEmoji").value = cat ? (cat.emoji || "") : "💅";
  ge("catEn").value = cat ? cat.name_en : "";
  ge("catKa").value = cat ? (cat.name_ka || "") : "";
  ge("catRu").value = cat ? (cat.name_ru || "") : "";
  ge("catIconUrl").value = cat ? (cat.icon_url || "") : "";
  ge("catIconFile").value = "";
  ge("catShowHome").checked = cat ? cat.show_home !== false : true;
  ge("catShowFilter").checked = cat ? cat.show_filter !== false : true;
  ge("catShowSignup").checked = cat ? cat.show_signup !== false : true;
  var prev = ge("catIconPreview");
  if (prev) {
    if (cat && cat.icon_url) prev.innerHTML = "<img src=\"" + cat.icon_url + "\" style=\"width:100%;height:100%;object-fit:contain\">";
    else prev.innerHTML = (cat && cat.emoji) ? cat.emoji : "💅";
  }
  openM("cat");
}

async function saveCat() {
  var id = ge("catEditId").value;
  var emoji = ge("catEmoji").value.trim() || "💅";
  var en = ge("catEn").value.trim();
  var ka = ge("catKa").value.trim() || null;
  var ru = ge("catRu").value.trim() || null;
  if (!en) { toast("English name is required", "err"); return; }
  var iconUrl = ge("catIconUrl").value || null;
  var iconFile = ge("catIconFile").files ? ge("catIconFile").files[0] : null;
  if (iconFile) { toast("Uploading..."); var u = await uploadCatIcon(iconFile); if (u) iconUrl = u; }
  var maxSort = categories.reduce(function(m, c) { return Math.max(m, c.sort_order || 0); }, 0);
  var data = { emoji: emoji, name_en: en, name_ka: ka, name_ru: ru, icon_url: iconUrl, visible: true, show_home: ge("catShowHome").checked, show_filter: ge("catShowFilter").checked, show_signup: ge("catShowSignup").checked };
  try {
    if (id) await sb.from("categories").update(data).eq("id", id);
    else { data.sort_order = maxSort + 1; await sb.from("categories").insert(data); }
    toast("Category saved!", "ok"); closeM("cat"); await loadAdminCats(); populateSpecSelects();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deleteCat(id) {
  if (!confirm("Delete this category and all its subcategories?")) return;
  try { await sb.from("subcategories").delete().eq("category_id", id); await sb.from("categories").delete().eq("id", id); toast("Deleted."); await loadAdminCats(); }
  catch(e) { toast("Error: " + e.message, "err"); }
}

async function toggleCatVisibility(id, visible) {
  try { await sb.from("categories").update({ visible: visible }).eq("id", id); await loadAdminCats(); }
  catch(e) { toast("Error", "err"); }
}

function populateSubCatParent() {
  var sel = ge("subCatParent"); if (!sel) return;
  sel.innerHTML = categories.map(function(c) { return "<option value=\"" + c.id + "\">" + (c.emoji||"📂") + " " + c.name_en + "</option>"; }).join("");
}

function openSubCatModal(id) {
  var sc = id ? allSubCats.find(function(s) { return s.id === id; }) : null;
  ge("subCatEditId").value = id || "";
  ge("subCatModalTitle").textContent = id ? "Edit Subcategory" : "Add Subcategory";
  populateSubCatParent();
  ge("subCatEn").value = sc ? sc.name_en : "";
  ge("subCatKa").value = sc ? (sc.name_ka || "") : "";
  ge("subCatRu").value = sc ? (sc.name_ru || "") : "";
  ge("subCatEmoji").value = sc ? (sc.emoji || "") : "";
  if (sc) ge("subCatParent").value = sc.category_id;
  openM("subcat");
}

async function saveSubCat() {
  var id = ge("subCatEditId").value;
  var catId = ge("subCatParent").value;
  var en = ge("subCatEn").value.trim();
  if (!en || !catId) { toast("Parent and name required", "err"); return; }
  var data = { category_id: catId, name_en: en, name_ka: ge("subCatKa").value.trim()||null, name_ru: ge("subCatRu").value.trim()||null, emoji: ge("subCatEmoji").value.trim()||null, visible: true, sort_order: allSubCats.length };
  try {
    var r; if (id) r = await sb.from("subcategories").update(data).eq("id", id); else r = await sb.from("subcategories").insert(data);
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast("Subcategory saved!", "ok"); closeM("subcat"); await loadAdminCats();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deleteSubCat(id) {
  if (!confirm("Delete?")) return;
  try { await sb.from("subcategories").delete().eq("id", id); toast("Deleted."); await loadAdminCats(); } catch(e) { toast("Error", "err"); }
}

async function toggleSubCatVis(id, visible) {
  try { await sb.from("subcategories").update({ visible: visible }).eq("id", id); await loadAdminCats(); } catch(e) { toast("Error", "err"); }
}

// ── COMMISSION RATES ─────────────────────────────────────────
async function setProCommission(proId, value) {
  var rate = value ? parseFloat(value) : null;
  try {
    await sb.from("professionals").update({ commission_rate: rate }).eq("id", proId);
    toast(rate ? "Pro commission set to " + rate + "%" : "Pro commission reset to default", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function setCatCommission(catId, value) {
  var rate = value ? parseFloat(value) : null;
  try {
    await sb.from("categories").update({ commission_rate: rate }).eq("id", catId);
    toast(rate ? "Category commission set to " + rate + "%" : "Category commission reset to default", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function setSubCatCommission(subId, value) {
  var rate = value ? parseFloat(value) : null;
  try {
    await sb.from("subcategories").update({ commission_rate: rate }).eq("id", subId);
    toast(rate ? "Subcategory commission set to " + rate + "%" : "Reset to default", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── PROMO CODES ───────────────────────────────────────────────
async function loadAdminPromos() {
  var body = ge("aPromoBody"); if (!body) return;
  // Sync global toggle
  var pg = ge("promoGlobal"); if (pg) pg.checked = settings.promo_enabled !== false;
  try {
    var r = await sb.from("promo_codes").select("*").order("created_at", { ascending: false });
    var list = r.data || [];
    if (!list.length) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">No promo codes yet.</td></tr>"; return; }
    body.innerHTML = list.map(function(p) {
      var val = p.discount_type === "percent" ? p.discount_value + "%" : p.discount_value + "₾";
      var exp = p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "∞";
      return "<tr>"
           + "<td><strong>" + p.code + "</strong></td>"
           + "<td>" + p.discount_type + "</td>"
           + "<td>" + val + "</td>"
           + "<td>" + (p.used_count || 0) + (p.max_uses ? "/" + p.max_uses : "") + "</td>"
           + "<td>" + exp + "</td>"
           + "<td><label class=\"sw\"><input type=\"checkbox\"" + (p.active ? " checked" : "") + " onchange=\"togglePromo('" + p.id + "',this.checked)\"><span class=\"sw-t\"></span></label></td>"
           + "<td style=\"display:flex;gap:5px\">"
           + "<button class=\"btn-sm btn-gh\" onclick=\"openPromoModal('" + p.id + "')\">Edit</button>"
           + "<button class=\"btn-sm btn-no\" onclick=\"deletePromo('" + p.id + "')\">Del</button>"
           + "</td></tr>";
    }).join("");
  } catch(e) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">Run setup SQL first.</td></tr>"; }
}

async function openPromoModal(id) {
  ge("promoEditId").value = id || "";
  ge("promoModalTitle").textContent = id ? "Edit Promo Code" : "Create Promo Code";
  if (!id) {
    ge("promoCode").value = ""; ge("promoType").value = "percent";
    ge("promoVal").value  = ""; ge("promoMin").value  = "";
    ge("promoMax").value  = ""; ge("promoExp").value  = "";
  } else {
    try {
      var r = await sb.from("promo_codes").select("*").eq("id", id).single();
      if (r.data) {
        ge("promoCode").value = r.data.code || "";
        ge("promoType").value = r.data.discount_type || "percent";
        ge("promoVal").value  = r.data.discount_value || "";
        ge("promoMin").value  = r.data.min_order || "";
        ge("promoMax").value  = r.data.max_uses || "";
        ge("promoExp").value  = r.data.expires_at ? r.data.expires_at.substring(0, 16) : "";
      }
    } catch(e) {
      ge("promoCode").value = ""; ge("promoType").value = "percent";
      ge("promoVal").value  = ""; ge("promoMin").value  = "";
      ge("promoMax").value  = ""; ge("promoExp").value  = "";
    }
  }
  openM("promo");
}

async function savePromo() {
  var id    = ge("promoEditId").value;
  var code  = (ge("promoCode").value || "").trim().toUpperCase();
  var type  = ge("promoType").value;
  var val   = parseFloat(ge("promoVal").value) || 0;
  var min   = parseInt(ge("promoMin").value) || 0;
  var max   = parseInt(ge("promoMax").value) || null;
  var exp   = ge("promoExp").value || null;
  if (!code || !val) { toast("Code and value are required", "err"); return; }
  var data = { code, discount_type: type, discount_value: val, min_order: min, max_uses: max, expires_at: exp, active: true };
  try {
    if (id) await sb.from("promo_codes").update(data).eq("id", id);
    else    await sb.from("promo_codes").insert(data);
    toast("Promo code saved!", "ok");
    closeM("promo");
    loadAdminPromos();
  } catch(e) { toast("Error: " + (e.message || "duplicate code?"), "err"); }
}

async function togglePromo(id, active) {
  try { await sb.from("promo_codes").update({ active }).eq("id", id); toast(active ? "Code enabled." : "Code disabled."); }
  catch(e) { toast("Error", "err"); }
}

async function deletePromo(id) {
  if (!confirm("Delete this promo code?")) return;
  try { await sb.from("promo_codes").delete().eq("id", id); toast("Deleted."); loadAdminPromos(); }
  catch(e) { toast("Error", "err"); }
}

// ── REVIEW MODERATION ─────────────────────────────────────────
async function loadAdminRevs() {
  var el = ge("aRevList"); if (!el) return;
  try {
    var r = await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
    var revs = r.data || [];
    if (!revs.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No reviews yet.</p>"; return; }
    // Enrich with reviewer names
    var rids = revs.map(function(rv) { return rv.reviewer_id; }).filter(Boolean);
    var profMap = {};
    if (rids.length) {
      try {
        var pp = await sb.from("profiles").select("id,full_name").in("id", rids);
        (pp.data||[]).forEach(function(p) { profMap[p.id] = p.full_name; });
      } catch(e) {}
    }
    el.innerHTML = revs.map(function(rv) {
      var stars = "★".repeat(rv.rating) + "☆".repeat(5 - rv.rating);
      var rName = profMap[rv.reviewer_id] || "Unknown";
      var rUid = genUid("C", rv.reviewer_id);
      return "<div style=\"display:flex;align-items:center;gap:11px;padding:10px;background:var(--bg2);border-radius:var(--rs);margin-bottom:6px\">"
           + "<div style=\"flex:1\">"
           + "<div style=\"font-size:13px;font-weight:600;margin-bottom:2px\">" + rName + " <span style=\"color:var(--g);font-size:11px\">" + rUid + "</span></div>"
           + "<div style=\"font-size:11px;color:var(--mu);margin-bottom:3px\">Booking #" + rv.booking_id.substring(0,8) + " · " + rv.reviewer_role + " · " + new Date(rv.created_at).toLocaleDateString() + "</div>"
           + "<span style=\"color:#facc15;font-size:14px\">" + stars + "</span>"
           + (rv.comment ? "<p style=\"font-size:13px;margin-top:2px\">" + rv.comment + "</p>" : "")
           + "</div>"
           + "<label class=\"sw\"><input type=\"checkbox\"" + (rv.visible ? " checked" : "") + " onchange=\"toggleRev('" + rv.id + "',this.checked)\"><span class=\"sw-t\"></span></label>"
           + "<button class=\"btn-sm btn-no\" onclick=\"deleteRev('" + rv.id + "')\">Del</button>"
           + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Run setup SQL first.</p>"; }
}

async function toggleRev(id, visible) {
  try { await sb.from("reviews").update({ visible }).eq("id", id); toast(visible ? "Review shown." : "Review hidden."); }
  catch(e) { toast("Error", "err"); }
}

async function deleteRev(id) {
  if (!confirm("Permanently delete this review?")) return;
  try { await sb.from("reviews").delete().eq("id", id); toast("Review deleted."); loadAdminRevs(); }
  catch(e) { toast("Error", "err"); }
}

// ── ADMIN SUPPORT ─────────────────────────────────────────────
async function loadAdminSupport() {
  var el = ge("aSupList"); if (!el) return;
  try {
    var r = await sb.from("support_tickets").select("*").order("created_at", { ascending: false });
    var list = r.data || [];
    if (!list.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No support tickets yet.</p>"; return; }
    var statusOpts = ["open","in_progress","resolved","closed"];
    el.innerHTML = list.map(function(tk) {
      return "<div class=\"ticket-row\">"
           + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:5px\">"
           + "<div style=\"font-weight:500;font-size:14px\">" + tk.subject + "</div>"
           + "<select class=\"fi\" style=\"font-size:12px;padding:3px 7px;max-width:130px\" onchange=\"updateTicketStatus('" + tk.id + "',this.value)\">"
           + statusOpts.map(function(s) { return "<option value=\"" + s + "\"" + (s === tk.status ? " selected" : "") + ">" + s + "</option>"; }).join("")
           + "</select>"
           + "</div>"
           + "<div style=\"font-size:12px;color:var(--mu);margin-bottom:7px\">"
           + (tk.user_name || "—") + " · " + tk.user_role + " · " + tk.priority + " priority · " + new Date(tk.created_at).toLocaleDateString()
           + "</div>"
           + "<button class=\"btn-sm btn-gh\" onclick=\"adminOpenTicket('" + tk.id + "','" + tk.subject.replace(/'/g,"\\'") + "')\" style=\"font-size:12px\">View & Reply</button>"
           + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Run setup SQL first.</p>"; }
}

async function updateTicketStatus(id, status) {
  try { await sb.from("support_tickets").update({ status }).eq("id", id); toast("Status updated."); }
  catch(e) { toast("Error", "err"); }
}

async function adminOpenTicket(id, subject) {
  currentTicketId = id;
  ge("ticketModalTitle").textContent = "Admin Reply";
  ge("ticketModalSub").textContent   = subject;
  await loadTicketMessages(id);
  openM("ticket");
}


// ═══════════════════════════════════════════════════════════════
//  PART 9: INIT + REALTIME
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  PART 10A: LIVE TRANSLATION EDITOR
// ═══════════════════════════════════════════════════════════════

// Labels for the editor so admin knows what each key does
var TR_LABELS = {
  heroBadge:"Hero badge (top of homepage)", heroTitle:"Hero headline", heroSub:"Hero subtitle",
  heroBtn:"Search button text", trust1:"Trust badge 1", trust2:"Trust badge 2", trust3:"Trust badge 3",
  searchPh:"Search placeholder", catTitle:"Categories section title", catSub:"Categories subtitle",
  viewAll:"View all button", seeAll:"See all button",
  howTitle:"How it works title", s1t:"Step 1 title", s1d:"Step 1 description",
  s2t:"Step 2 title", s2d:"Step 2 description", s3t:"Step 3 title", s3d:"Step 3 description",
  featTitle:"Featured pros section title", proTag:"Pro CTA tag", proTitle:"Pro CTA headline",
  proSub:"Pro CTA subtitle", joinPro:"Join as pro button", signIn2:"Sign in button",
  fhSvc:"Footer: Services", fhCo:"Footer: Company", fhSup:"Footer: Support", footerTag:"Footer tagline",
  bcHome:"Breadcrumb: Home", bcPros:"Breadcrumb: Professionals",
  authWel:"Auth modal title", tabIn:"Tab: Sign In", tabClient:"Tab: Client", tabPro:"Tab: Professional",
  lEmail:"Label: Email", lPass:"Label: Password", lPhone:"Label: Phone",
  lFirst:"Label: First Name", lLast:"Label: Last Name", lSpec:"Label: Specialty", lDist:"Label: District",
  siBtnTxt:"Sign in button", scBtnTxt:"Create account button", spBtnTxt:"Apply as pro button",
  noAcc:"No account text", signUpLnk:"Sign up link", proWarn:"Pro approval warning",
  cdTitle:"Client dashboard title", welcomeBack:"Welcome back text", bookSvc:"Book a service button",
  stPending:"Status: Pending", stAccepted:"Status: Accepted", stOnWay:"Status: On the Way",
  stArrived:"Status: Arrived", stInProg:"Status: In Progress", stCompleted:"Status: Completed",
  stCancelled:"Status: Cancelled", stNoShow:"Status: No-show",
  bkTitle:"Booking page title", confirmBtnTxt:"Confirm booking button",
  bkConfTitle:"Booking confirmed title", bkConfSub:"Booking confirmed subtitle"
};

// Editable translation keys (most important ones)
var TR_EDITABLE = Object.keys(TR_LABELS);

function loadTransEditor() {
  var el = ge("trEditorFields"); if (!el) return;
  var selLang = ge("trLangSel").value;
  var data = TR[selLang] || TR.en;

  el.innerHTML = TR_EDITABLE.map(function(key) {
    var val = data[key] || "";
    // Strip HTML for editing but keep it
    var cleanVal = val.replace(/"/g, "&quot;");
    return "<div style=\"margin-bottom:10px;padding:10px;background:var(--bg2);border-radius:var(--rs)\">"
      + "<label style=\"font-size:11px;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px\">"
      + (TR_LABELS[key] || key)
      + " <span style=\"font-weight:400;opacity:.5\">(" + key + ")</span></label>"
      + "<input class=\"fi\" data-trkey=\"" + key + "\" value=\"" + cleanVal + "\" style=\"font-size:13px\">"
      + "</div>";
  }).join("");
}

function getEditorValues() {
  var fields = document.querySelectorAll("#trEditorFields input[data-trkey]");
  var vals = {};
  fields.forEach(function(f) { vals[f.getAttribute("data-trkey")] = f.value; });
  return vals;
}

function previewTranslations() {
  var selLang = ge("trLangSel").value;
  var vals = getEditorValues();
  for (var key in vals) { TR[selLang][key] = vals[key]; }
  applyLang();
  toast("Preview applied! (not saved yet)");
}

async function saveTranslations() {
  var selLang = ge("trLangSel").value;
  var vals = getEditorValues();

  // Apply to live TR object
  for (var key in vals) { TR[selLang][key] = vals[key]; }
  applyLang();

  // Save to database
  try {
    var r = await sb.from("platform_settings").upsert({
      key: "translations_" + selLang,
      value: JSON.stringify(TR[selLang])
    }, { onConflict: "key" });
    if (r.error) { toast("Save error: " + r.error.message, "err"); return; }
    toast("Translations saved! Changes are live.", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// loadSavedTranslations() is defined in i18n.js (shared)


// ── ANALYTICS ────────────────────────────────────────────────
function getCommRate(proId, catName) {
  // Priority: pro rate > subcategory rate > category rate > global
  var globalRate = parseFloat(settings.commission) || 5;
  // Check pro-specific rate
  var pro = allPros.find(function(p) { return p.id === proId; });
  if (pro && pro.commission_rate) return parseFloat(pro.commission_rate);
  // Check category rate
  var cat = categories.find(function(c) { return c.name_en === catName; });
  if (cat && cat.commission_rate) return parseFloat(cat.commission_rate);
  return globalRate;
}

async function loadAnalytics() {
  try {
    var [bkRes, profRes, prosRes] = await Promise.all([
      sb.from("bookings").select("*"),
      sb.from("profiles").select("id,gender,role"),
      sb.from("professionals").select("id,name,specialty,commission_rate")
    ]);
    var bks = bkRes.data || [];
    var profs = profRes.data || [];
    var pros = prosRes.data || [];

    var completed = bks.filter(function(b) { return b.status === "completed"; });

    // Calculate totals with commission
    var totalRev = 0, platformRev = 0, proRev = 0;
    completed.forEach(function(b) {
      var amt = b.total || 0;
      var proObj = pros.find(function(p) { return p.id === b.pro_id; });
      var spec = proObj ? proObj.specialty : "";
      var commRate = getCommRate(b.pro_id, spec);
      var platformCut = Math.round(amt * commRate / 100);
      totalRev += amt;
      platformRev += platformCut;
      proRev += (amt - platformCut);
    });

    ge("anTotalBk").textContent = bks.length;
    ge("anCompleted").textContent = completed.length;
    ge("anTotalRev").textContent = totalRev + "₾";
    ge("anPlatformRev").textContent = platformRev + "₾";
    ge("anProRev").textContent = proRev + "₾";

    // Gender stats
    var clients = profs.filter(function(p) { return p.role === "client"; });
    ge("anFemale").textContent = clients.filter(function(p) { return p.gender === "female"; }).length;
    ge("anMale").textContent = clients.filter(function(p) { return p.gender === "male"; }).length;

    // ── Revenue by Service ──
    var svcData = {};
    completed.forEach(function(b) {
      var sn = b.service_name || "Unknown";
      if (!svcData[sn]) svcData[sn] = { count: 0, revenue: 0, platform: 0, proEarn: 0, commRate: 0 };
      var amt = b.total || 0;
      var proObj = pros.find(function(p) { return p.id === b.pro_id; });
      var spec = proObj ? proObj.specialty : "";
      var cr = getCommRate(b.pro_id, spec);
      var pc = Math.round(amt * cr / 100);
      svcData[sn].count++;
      svcData[sn].revenue += amt;
      svcData[sn].platform += pc;
      svcData[sn].proEarn += (amt - pc);
      svcData[sn].commRate = cr;
    });

    var svcBody = ge("anSvcBreakdown");
    if (svcBody) {
      var svcArr = Object.keys(svcData).map(function(k) { return { name: k, d: svcData[k] }; })
        .sort(function(a, b) { return b.d.revenue - a.d.revenue; });
      if (!svcArr.length) {
        svcBody.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center;padding:14px;color:var(--mu)\">No completed bookings yet.</td></tr>";
      } else {
        svcBody.innerHTML = svcArr.map(function(s) {
          return "<tr>"
            + "<td style=\"font-weight:500\">" + s.name + "</td>"
            + "<td>" + s.d.count + "</td>"
            + "<td style=\"font-weight:600\">" + s.d.revenue + "₾</td>"
            + "<td><span style=\"background:rgba(234,184,183,.12);color:var(--gd);padding:2px 8px;border-radius:50px;font-size:12px;font-weight:600\">" + s.d.commRate + "%</span></td>"
            + "<td style=\"color:#22c55e;font-weight:600\">" + s.d.platform + "₾</td>"
            + "<td style=\"color:#7e22ce;font-weight:600\">" + s.d.proEarn + "₾</td>"
            + "</tr>";
        }).join("")
        + "<tr style=\"border-top:2px solid var(--br);font-weight:700\">"
        + "<td>TOTAL</td><td>" + svcArr.reduce(function(s,x){return s+x.d.count},0) + "</td>"
        + "<td>" + totalRev + "₾</td><td></td>"
        + "<td style=\"color:#22c55e\">" + platformRev + "₾</td>"
        + "<td style=\"color:#7e22ce\">" + proRev + "₾</td></tr>";
      }
    }

    // ── Revenue by Professional ──
    var proData = {};
    completed.forEach(function(b) {
      var pid = b.pro_id || "unknown";
      var pName = b.pro_name || "Unknown";
      if (!proData[pid]) proData[pid] = { name: pName, count: 0, revenue: 0, platform: 0, proEarn: 0, commRate: 0 };
      var amt = b.total || 0;
      var proObj = pros.find(function(p) { return p.id === pid; });
      var spec = proObj ? proObj.specialty : "";
      var cr = getCommRate(pid, spec);
      var pc = Math.round(amt * cr / 100);
      proData[pid].count++;
      proData[pid].revenue += amt;
      proData[pid].platform += pc;
      proData[pid].proEarn += (amt - pc);
      proData[pid].commRate = cr;
    });

    var proBody = ge("anProBreakdown");
    if (proBody) {
      var proArr = Object.keys(proData).map(function(k) { return proData[k]; })
        .sort(function(a, b) { return b.revenue - a.revenue; });
      if (!proArr.length) {
        proBody.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center;padding:14px;color:var(--mu)\">No data yet.</td></tr>";
      } else {
        proBody.innerHTML = proArr.map(function(p) {
          return "<tr>"
            + "<td style=\"font-weight:500\">" + p.name + "</td>"
            + "<td>" + p.count + "</td>"
            + "<td style=\"font-weight:600\">" + p.revenue + "₾</td>"
            + "<td><span style=\"background:rgba(234,184,183,.12);color:var(--gd);padding:2px 8px;border-radius:50px;font-size:12px;font-weight:600\">" + p.commRate + "%</span></td>"
            + "<td style=\"color:#22c55e;font-weight:600\">" + p.platform + "₾</td>"
            + "<td style=\"color:#7e22ce;font-weight:600\">" + p.proEarn + "₾</td>"
            + "</tr>";
        }).join("")
        + "<tr style=\"border-top:2px solid var(--br);font-weight:700\">"
        + "<td>TOTAL</td><td>" + proArr.reduce(function(s,x){return s+x.count},0) + "</td>"
        + "<td>" + totalRev + "₾</td><td></td>"
        + "<td style=\"color:#22c55e\">" + platformRev + "₾</td>"
        + "<td style=\"color:#7e22ce\">" + proRev + "₾</td></tr>";
      }
    }

    // ── Popular / Least Popular ──
    var svcCount = {};
    bks.forEach(function(b) {
      var sn = b.service_name || "Unknown";
      svcCount[sn] = (svcCount[sn] || 0) + 1;
    });
    var sorted = Object.keys(svcCount).map(function(k) { return { name: k, count: svcCount[k] }; })
      .sort(function(a, b) { return b.count - a.count; });

    var popEl = ge("anPopularSvcs");
    if (popEl) {
      var top = sorted.slice(0, 5);
      popEl.innerHTML = top.length ? top.map(function(s, i) {
        var pct = Math.round(s.count / bks.length * 100);
        return "<div style='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--br)'>"
          + "<div style='font-weight:600;color:var(--g);width:24px'>#" + (i+1) + "</div>"
          + "<div style='flex:1'><div style='font-weight:500;font-size:14px'>" + s.name + "</div>"
          + "<div style='height:6px;background:var(--bg2);border-radius:3px;margin-top:4px;overflow:hidden'><div style='height:100%;background:var(--g);border-radius:3px;width:" + pct + "%'></div></div></div>"
          + "<div style='font-size:14px;font-weight:600'>" + s.count + "</div></div>";
      }).join("") : "<p style='color:var(--mu);font-size:13px'>No bookings yet.</p>";
    }

    var leastEl = ge("anLeastSvcs");
    if (leastEl) {
      var bottom = sorted.slice(-5).reverse();
      leastEl.innerHTML = bottom.length ? bottom.map(function(s) {
        return "<div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--br);font-size:14px'>"
          + "<span>" + s.name + "</span><span style='color:var(--mu)'>" + s.count + " bookings</span></div>";
      }).join("") : "<p style='color:var(--mu);font-size:13px'>No data.</p>";
    }
  } catch(e) { toast("Analytics error: " + e.message, "err"); }
}

// ── LOOKUP ───────────────────────────────────────────────────
async function doLookup() {
  var q = (ge("anLookup").value || "").trim();
  var el = ge("anLookupResult");
  if (!q) { toast("Enter email or ID", "err"); return; }
  el.innerHTML = "<div class='spin'></div>";

  try {
    var foundProfile = null;

    // Try email lookup
    if (q.includes("@")) {
      var r = await sb.from("profiles").select("*").eq("email", q.toLowerCase()).single();
      if (r.data) foundProfile = r.data;
    }

    // Try unique ID lookup
    if (!foundProfile && (q.toUpperCase().startsWith("C") || q.toUpperCase().startsWith("P"))) {
      var allProfs = await sb.from("profiles").select("*");
      if (allProfs.data) {
        foundProfile = allProfs.data.find(function(p) {
          var prefix = p.role === "pro" ? "P" : "C";
          return genUid(prefix, p.id) === q.toUpperCase();
        });
      }
    }

    if (!foundProfile) { el.innerHTML = "<p style='color:#ef4444;font-size:14px'>User not found.</p>"; return; }

    // Load bookings
    var bkField = foundProfile.role === "pro" ? "pro_id" : "client_id";
    var bkVal = foundProfile.role === "pro" ? foundProfile.pro_id : foundProfile.id;
    var bks = [];
    if (bkVal) {
      var br = await sb.from("bookings").select("*").eq(bkField, bkVal).order("created_at", { ascending: false });
      bks = br.data || [];
    }

    var completed = bks.filter(function(b) { return b.status === "completed"; });
    var total = bks.reduce(function(s, b) { return s + (b.total || 0); }, 0);
    var uid = genUid(foundProfile.role === "pro" ? "P" : "C", foundProfile.id);

    // Fetch user's reviews
    var userRevs = [];
    try {
      var rr = await sb.from("reviews").select("*").eq("reviewer_id", foundProfile.id).order("created_at", { ascending: false });
      userRevs = rr.data || [];
    } catch(e) {}

    el.innerHTML = "<div style='background:var(--bg2);border-radius:var(--rs);padding:14px;margin-top:8px'>"
      + "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px'>"
      + "<div>"
      + "<div style='font-weight:600;font-size:16px'>" + (foundProfile.full_name || "—") + "</div>"
      + "<div style='font-size:12px;color:var(--mu)'>" + (foundProfile.email || "") + " · " + uid + "</div>"
      + "</div>"
      + "<span class='bdg bdg-g'>" + foundProfile.role + "</span>"
      + "</div>"
      + "<div style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px'>"
      + "<div class='st' style='padding:10px'><div class='st-v' style='font-size:18px'>" + bks.length + "</div><div class='st-l'>Bookings</div></div>"
      + "<div class='st' style='padding:10px'><div class='st-v' style='font-size:18px'>" + completed.length + "</div><div class='st-l'>Completed</div></div>"
      + "<div class='st' style='padding:10px'><div class='st-v' style='font-size:18px'>" + total + "₾</div><div class='st-l'>" + (foundProfile.role === "pro" ? "Earned" : "Spent") + "</div></div>"
      + "</div>"
      + "<div style='font-size:12px;color:var(--mu)'>Gender: " + (foundProfile.gender || "Not set") + " · Phone: " + (foundProfile.phone || "—") + " · Joined: " + new Date(foundProfile.created_at).toLocaleDateString() + "</div>"
      + (bks.length ? "<div style='margin-top:10px;font-size:13px;font-weight:600'>Recent Bookings:</div>" + bks.slice(0,5).map(function(b) {
          return "<div style='display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--br)'>"
            + "<span>" + (b.service_name||"—") + "</span><span>" + sBadge(b.status) + "</span><span>" + (b.total||0) + "₾</span></div>";
        }).join("") : "")
      + "<div style='margin-top:14px;font-size:13px;font-weight:600'>Reviews Given (" + userRevs.length + "):</div>"
      + (userRevs.length ? userRevs.map(function(rv) {
          var stars = Array(5).fill(0).map(function(_,i){ return "<span style='color:" + (i<rv.rating?"#facc15":"var(--bg3)") + "'>★</span>"; }).join("");
          return "<div style='padding:8px 0;border-bottom:1px solid var(--br);display:flex;justify-content:space-between;align-items:flex-start'>"
            + "<div style='flex:1'>"
            + "<div style='font-size:12px;font-weight:600;color:var(--mu)'>" + (foundProfile.full_name || "—") + " · " + uid + "</div>"
            + "<div>" + stars + " <span style='font-size:11px;color:var(--mu)'>" + new Date(rv.created_at).toLocaleDateString() + "</span></div>"
            + (rv.comment ? "<p style='font-size:13px;color:var(--tx);margin-top:2px'>" + rv.comment + "</p>" : "")
            + "</div>"
            + "<div style='display:flex;gap:4px;flex-shrink:0;margin-left:8px'>"
            + "<button class='btn-sm btn-no' onclick=\"adminDeleteReview('" + rv.id + "')\">🗑</button>"
            + "</div></div>";
        }).join("") : "<p style='color:var(--mu);font-size:13px'>No reviews.</p>")
      + "</div>";
  } catch(e) { el.innerHTML = "<p style='color:#ef4444'>Error: " + e.message + "</p>"; }
}

// ═══════════════════════════════════════════════════════════════
//  PART 10C: BLOG / CMS
// ═══════════════════════════════════════════════════════════════

var allPosts = [];
var allPages = [];

async function loadAdminBlog() {
  await loadAdminPosts();
  await loadAdminPages();
}

async function loadAdminPosts() {
  var el = ge("aBlogList"); if (!el) return;
  try {
    var r = await sb.from("blog_posts").select("*").order("created_at", { ascending: false });
    allPosts = r.data || [];
    if (!allPosts.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No posts yet.</p>"; return; }
    el.innerHTML = allPosts.map(function(p) {
      return "<div class=\"cat-admin-row\">"
        + "<div style=\"flex:1\">"
        + "<div style=\"font-weight:600;font-size:14px\">" + p.title + "</div>"
        + "<div style=\"font-size:12px;color:var(--mu)\">" + new Date(p.created_at).toLocaleDateString() + " · " + (p.published ? "✅ Published" : "📝 Draft") + (p.tags ? " · " + p.tags : "") + "</div>"
        + "</div>"
        + "<button class=\"btn-sm btn-gh\" onclick=\"openPostModal('" + p.id + "')\">Edit</button>"
        + "<button class=\"btn-sm btn-no\" onclick=\"deletePost('" + p.id + "')\">Del</button>"
        + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444;font-size:13px\">Error: " + e.message + "</p>"; }
}

async function loadAdminPages() {
  var el = ge("aPageList"); if (!el) return;
  try {
    var r = await sb.from("static_pages").select("*").order("created_at", { ascending: false });
    allPages = r.data || [];
    if (!allPages.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No pages yet.</p>"; return; }
    el.innerHTML = allPages.map(function(p) {
      return "<div class=\"cat-admin-row\">"
        + "<div style=\"flex:1\">"
        + "<div style=\"font-weight:600;font-size:14px\">" + p.title + " <span style=\"font-size:11px;color:var(--g)\">/page/" + p.slug + "</span></div>"
        + "<div style=\"font-size:12px;color:var(--mu)\">" + (p.published ? "✅ Published" : "📝 Draft") + "</div>"
        + "</div>"
        + "<button class=\"btn-sm btn-gh\" onclick=\"openPageModal('" + p.id + "')\">Edit</button>"
        + "<button class=\"btn-sm btn-no\" onclick=\"deletePage('" + p.id + "')\">Del</button>"
        + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444;font-size:13px\">Error: " + e.message + "</p>"; }
}

function openPostModal(id) {
  var post = id ? allPosts.find(function(p) { return p.id === id; }) : null;
  ge("postEditId").value = id || "";
  ge("postModalTitle").textContent = id ? "Edit Post" : "New Post";
  ge("postTitle").value = post ? post.title : "";
  ge("postCover").value = post ? (post.cover_url || "") : "";
  ge("postBody").value = post ? post.content : "";
  ge("postTags").value = post ? (post.tags || "") : "";
  ge("postPublished").checked = post ? post.published !== false : true;
  openM("post");
}

async function savePost() {
  var id = ge("postEditId").value;
  var title = ge("postTitle").value.trim();
  var content = ge("postBody").value.trim();
  if (!title || !content) { toast("Title and content required", "err"); return; }
  var data = {
    title: title,
    content: content,
    cover_url: ge("postCover").value.trim() || null,
    tags: ge("postTags").value.trim() || null,
    published: ge("postPublished").checked
  };
  try {
    if (id) { var r = await sb.from("blog_posts").update(data).eq("id", id); if (r.error) throw r.error; }
    else { var r2 = await sb.from("blog_posts").insert(data); if (r2.error) throw r2.error; }
    toast("Post saved!", "ok"); closeM("post"); loadAdminPosts();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  try { await sb.from("blog_posts").delete().eq("id", id); toast("Deleted."); loadAdminPosts(); }
  catch(e) { toast("Error", "err"); }
}

function openPageModal(id) {
  var pg = id ? allPages.find(function(p) { return p.id === id; }) : null;
  ge("pageEditId").value = id || "";
  ge("pageModalTitle").textContent = id ? "Edit Page" : "New Page";
  ge("pageTitle").value = pg ? pg.title : "";
  ge("pageSlug").value = pg ? pg.slug : "";
  ge("pageBody").value = pg ? pg.content : "";
  ge("pagePublished").checked = pg ? pg.published !== false : true;
  openM("page");
}

async function savePage() {
  var id = ge("pageEditId").value;
  var title = ge("pageTitle").value.trim();
  var slug = ge("pageSlug").value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  var content = ge("pageBody").value.trim();
  if (!title || !slug || !content) { toast("Title, slug, and content required", "err"); return; }
  var data = { title: title, slug: slug, content: content, published: ge("pagePublished").checked };
  try {
    if (id) { var r = await sb.from("static_pages").update(data).eq("id", id); if (r.error) throw r.error; }
    else { var r2 = await sb.from("static_pages").insert(data); if (r2.error) throw r2.error; }
    toast("Page saved!", "ok"); closeM("page"); loadAdminPages();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deletePage(id) {
  if (!confirm("Delete this page?")) return;
  try { await sb.from("static_pages").delete().eq("id", id); toast("Deleted."); loadAdminPages(); }
  catch(e) { toast("Error", "err"); }
}

// Public blog
async function loadBlogPublic() {
  show("blog");
  var el = ge("blogList"); if (!el) return;
  el.innerHTML = "<div class=\"spin\" style=\"margin:30px auto\"></div>";
  try {
    var r = await sb.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false });
    var posts = r.data || [];
    if (!posts.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No posts yet. Check back soon!</p>"; return; }
    el.innerHTML = posts.map(function(p) {
      return "<div style=\"background:var(--cd);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin-bottom:14px;cursor:pointer;transition:all .2s;border:1.5px solid transparent\" onclick=\"viewPost('" + p.id + "')\" onmouseover=\"this.style.borderColor='rgba(234,184,183,.4)'\" onmouseout=\"this.style.borderColor='transparent'\">"
        + (p.cover_url ? "<img src=\"" + p.cover_url + "\" style=\"width:100%;height:200px;object-fit:cover\">" : "")
        + "<div style=\"padding:16px\">"
        + "<div style=\"font-size:12px;color:var(--g);font-weight:600;margin-bottom:4px\">" + new Date(p.created_at).toLocaleDateString() + (p.tags ? " · " + p.tags : "") + "</div>"
        + "<h2 style=\"font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;margin-bottom:6px\">" + p.title + "</h2>"
        + "<p style=\"color:var(--mu);font-size:14px;line-height:1.6\">" + p.content.substring(0, 150) + "…</p>"
        + "</div></div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444\">Error loading blog.</p>"; }
}

async function viewPost(id) {
  show("blogpost");
  var el = ge("blogPostContent"); if (!el) return;
  el.innerHTML = "<div class=\"spin\" style=\"margin:30px auto\"></div>";
  try {
    var r = await sb.from("blog_posts").select("*").eq("id", id).single();
    var p = r.data;
    if (!p) { el.innerHTML = "<p>Post not found.</p>"; return; }
    el.innerHTML = (p.cover_url ? "<img src=\"" + p.cover_url + "\" style=\"width:100%;max-height:350px;object-fit:cover;border-radius:var(--r);margin-bottom:16px\">" : "")
      + "<div style=\"font-size:12px;color:var(--g);font-weight:600;margin-bottom:6px\">" + new Date(p.created_at).toLocaleDateString() + (p.tags ? " · " + p.tags : "") + "</div>"
      + "<h1 style=\"font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;margin-bottom:16px\">" + p.title + "</h1>"
      + "<div style=\"font-size:15px;line-height:1.8;color:var(--tx)\">" + p.content.replace(/\n/g, "<br>") + "</div>";
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444\">Error loading post.</p>"; }
}

async function viewStaticPage(slug) {
  show("staticpage");
  var el = ge("staticPageContent"); if (!el) return;
  el.innerHTML = "<div class=\"spin\" style=\"margin:30px auto\"></div>";
  try {
    var r = await sb.from("static_pages").select("*").eq("slug", slug).eq("published", true).single();
    var p = r.data;
    if (!p) { el.innerHTML = "<p>Page not found.</p>"; return; }
    el.innerHTML = "<h1 style=\"font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;margin-bottom:16px\">" + p.title + "</h1>"
      + "<div style=\"font-size:15px;line-height:1.8;color:var(--tx)\">" + p.content.replace(/\n/g, "<br>") + "</div>";
  } catch(e) { el.innerHTML = "<p style=\"color:#ef4444\">Error loading page.</p>"; }
}


// ── ADMIN CALENDAR VIEWER ────────────────────────────────────
var adminCalProId = null;
var adminCalDate = new Date();
var adminCalBks = [];
var adminCalTasks = [];
var adminCalOff = [];

function openAdminCal(proId, proName) {
  adminCalProId = proId;
  adminCalDate = new Date();
  ge("adminCalTitle").textContent = "📅 " + proName + "'s Calendar";
  renderAdminCal();
  openM("admincal");
}

function adminCalNav(dir) {
  adminCalDate.setMonth(adminCalDate.getMonth() + dir);
  renderAdminCal();
}

async function renderAdminCal() {
  if (!adminCalProId) return;
  var now = new Date();
  var y = adminCalDate.getFullYear(), m = adminCalDate.getMonth();
  var mEl = ge("adminCalMonth");
  if (mEl) mEl.textContent = adminCalDate.toLocaleString("default", { month: "long", year: "numeric" });

  var start = y + "-" + String(m+1).padStart(2,"0") + "-01";
  var end = y + "-" + String(m+1).padStart(2,"0") + "-31";
  try {
    var res = await Promise.all([
      sb.from("bookings").select("*").eq("pro_id", adminCalProId).gte("created_at", start + "T00:00:00").lte("created_at", end + "T23:59:59"),
      sb.from("pro_tasks").select("*").eq("pro_id", adminCalProId).gte("task_date", start).lte("task_date", end),
      sb.from("pro_days_off").select("*").eq("pro_id", adminCalProId).gte("off_date", start).lte("off_date", end)
    ]);
    adminCalBks = res[0].data || [];
    adminCalTasks = res[1].data || [];
    adminCalOff = (res[2].data || []).map(function(d) { return d.off_date; });
  } catch(e) { adminCalBks = []; adminCalTasks = []; adminCalOff = []; }

  renderCalGrid("adminCalGrid", y, m, now, adminCalBks, adminCalTasks, adminCalOff, "onAdminCalSelect");
}

function onAdminCalSelect(dateStr) {
  proCalSelDate = dateStr;
  renderAdminCal();
  var el = ge("adminCalEvents"); if (!el) return;
  var evs = [];
  adminCalBks.forEach(function(b) {
    if ((b.created_at || "").substring(0,10) === dateStr) {
      evs.push("<div class=\"cal-ev\"><div class=\"cal-ev-dot\" style=\"background:var(--g)\"></div>" + (b.time_slot||"ASAP") + " — " + (b.client_name||"") + " · " + (b.service_name||"") + " <span class=\"s " + (ST_CSS[b.status]||"s-pen") + "\">" + b.status + "</span></div>");
    }
  });
  adminCalTasks.forEach(function(t) {
    if (t.task_date === dateStr) {
      evs.push("<div class=\"cal-ev\"><div class=\"cal-ev-dot\" style=\"background:#7e22ce\"></div>" + (t.task_time||"") + " " + t.title + "</div>");
    }
  });
  if (adminCalOff.indexOf(dateStr) > -1) evs.unshift("<div class=\"cal-ev\"><div class=\"cal-ev-dot\" style=\"background:#ef4444\"></div>Unavailable</div>");
  el.innerHTML = evs.length ? evs.join("") : "<p style=\"color:var(--mu);font-size:13px\">No events.</p>";
}

// ── FLOATING BOOKING TRACKER ─────────────────────────────────
var ftInterval = null;
var ftCollapsed = false;

// ── VERIFY / FEATURED / ADMIN ACTIONS ────────────────────────
async function toggleVerify(proId, verified) {
  try {
    var r = await sb.from("professionals").update({ verified: verified }).eq("id", proId);
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast(verified ? "Professional verified!" : "Verification removed.", "ok");
    loadAdminPros();
    loadPros(); // refresh cards on homepage
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function toggleFeatured(proId, featured) {
  try {
    var r = await sb.from("professionals").update({ featured: featured }).eq("id", proId);
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast(featured ? "Added to featured!" : "Removed from featured.", "ok");
    loadAdminPros();
    loadPros(); // refresh homepage featured section
  } catch(e) { toast("Error: " + e.message, "err"); }
}


// ── ADMIN CHANGE ANY STATUS ──────────────────────────────────
async function adminForceStatus(bookingId) {
  var opts = ["pending","accepted","on_the_way","arrived","in_progress","completed","cancelled","no_show","late","refunded"];
  var sel = prompt("Enter new status:\\n" + opts.join(", "));
  if (!sel || opts.indexOf(sel) === -1) { toast("Invalid status", "err"); return; }
  try {
    var r = await sb.from("bookings").update({ status: sel }).eq("id", bookingId);
    if (r.error) throw r.error;
    toast("Status changed to: " + sel.replace(/_/g," "), "ok");
    closeM("bkd");
    loadAdminBks();
    loadAdminData();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── ADMIN: VIEW BOOKING CHAT FROM DETAIL ────────────────────
function adminViewBookingChat(bookingId, clientName, proName) {
  aTab("sup");
  // Small delay to let tab render
  setTimeout(function() { adminOpenChat("booking_" + bookingId, clientName, proName); }, 200);
}

// ── MASTER CALENDAR ─────────────────────────────────────────
function gotoMasterCal() {
  aTab("mcal");
}

// Master calendar state
var mcalAllPros = [];
var mcalSelectedIds = {};

function mcalToggleAll(on) {
  mcalAllPros.forEach(function(p) { mcalSelectedIds[p.id] = on; });
  mcalUpdateFilterUI();
  renderMasterCalGrid();
}

function mcalTogglePro(id) {
  mcalSelectedIds[id] = !mcalSelectedIds[id];
  mcalUpdateFilterUI();
  renderMasterCalGrid();
}

function mcalFilterProList() {
  var q = (ge("mcalProSearch") ? ge("mcalProSearch").value : "").toLowerCase();
  var el = ge("mcalProFilter"); if (!el) return;
  el.querySelectorAll("[data-pro]").forEach(function(btn) {
    var name = btn.dataset.name || "";
    btn.style.display = (!q || name.toLowerCase().includes(q)) ? "" : "none";
  });
}

function mcalUpdateFilterUI() {
  var el = ge("mcalProFilter"); if (!el) return;
  el.innerHTML = mcalAllPros.map(function(p) {
    var on = mcalSelectedIds[p.id];
    return "<button data-pro=\"" + p.id + "\" data-name=\"" + (p.name||"") + "\" onclick=\"mcalTogglePro('" + p.id + "')\" style=\"padding:4px 10px;border-radius:50px;font-size:11px;cursor:pointer;border:1px solid " + (on ? "var(--g)" : "var(--br)") + ";background:" + (on ? "rgba(193,163,142,.15)" : "var(--bg)") + ";color:" + (on ? "var(--g)" : "var(--mu)") + "\">" + (p.name||"Pro") + "</button>";
  }).join("");
}

async function renderMasterCal() {
  var dateEl = ge("mcalDate");
  var timeline = ge("mcalTimeline");
  if (!dateEl || !timeline) return;
  if (!dateEl.value) dateEl.value = fmtDate(new Date());

  timeline.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Loading...</p>";

  try {
    var pRes = await sb.from("professionals").select("*").eq("status", "approved");
    if (pRes.error) { timeline.innerHTML = "<p style=\"color:#ef4444\">DB error: " + pRes.error.message + "</p>"; return; }
    mcalAllPros = pRes.data || [];
    if (!mcalAllPros.length) { timeline.innerHTML = "<p style=\"color:var(--mu)\">No approved professionals yet.</p>"; return; }

    // Auto-select first 15 if first load
    if (!Object.keys(mcalSelectedIds).length) {
      mcalAllPros.forEach(function(p, i) { mcalSelectedIds[p.id] = i < 15; });
    }
    // Add newly approved pros as unselected
    mcalAllPros.forEach(function(p) { if (mcalSelectedIds[p.id] === undefined) mcalSelectedIds[p.id] = false; });

    mcalUpdateFilterUI();
    renderMasterCalGrid();
  } catch(e) {
    timeline.innerHTML = "<p style=\"color:#ef4444\">Error loading calendar: " + e.message + "</p>";
  }
}

async function renderMasterCalGrid() {
  var timeline = ge("mcalTimeline");
  var dateEl = ge("mcalDate");
  if (!timeline || !dateEl) return;
  var selDate = dateEl.value;

  var pros = mcalAllPros.filter(function(p) { return mcalSelectedIds[p.id]; });
  if (!pros.length) { timeline.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Select at least one professional above.</p>"; return; }

  timeline.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Loading...</p>";

  try {
    var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress","completed"];
    var bRes = await sb.from("bookings").select("*").in("status", activeStatuses).like("time_slot", selDate + "%");
    var allBookings = bRes.data || [];

    var sRes = await sb.from("services").select("pro_id,name,duration");
    var svcDurMap = {};
    (sRes.data || []).forEach(function(s) {
      if (!svcDurMap[s.pro_id]) svcDurMap[s.pro_id] = {};
      svcDurMap[s.pro_id][s.name] = s.duration || 60;
    });

    // Determine time range: union of all selected pros' working hours (full 24h for admin view)
    var globalStart = 24 * 60, globalEnd = 0;
    pros.forEach(function(pro) {
      var ws = pro.work_start || "09:00", we = pro.work_end || "19:00";
      var wsP = ws.split(":"), weP = we.split(":");
      var wsM = parseInt(wsP[0]) * 60 + parseInt(wsP[1] || 0);
      var weM = parseInt(weP[0]) * 60 + parseInt(weP[1] || 0);
      if (weM <= wsM) weM = 24 * 60;
      if (wsM < globalStart) globalStart = wsM;
      if (weM > globalEnd) globalEnd = weM;
    });
    // Add 1 hour buffer each side, clamp 0-24
    globalStart = Math.max(0, globalStart - 60);
    globalEnd = Math.min(24 * 60, globalEnd + 60);
    // Round to nearest hour
    globalStart = Math.floor(globalStart / 60) * 60;
    globalEnd = Math.ceil(globalEnd / 60) * 60;

    var slotHeight = 56;
    var times = [];
    for (var m = globalStart; m < globalEnd; m += 30) {
      var hh = Math.floor(m / 60), mm = m % 60;
      times.push(String(hh).padStart(2,"0") + ":" + String(mm).padStart(2,"0"));
    }

    var statusColors = {
      pending: "#f59e0b", accepted: "#10b981", on_the_way: "#3b82f6",
      arrived: "#8b5cf6", in_progress: "var(--g)", completed: "#6b7280",
      cancelled: "#ef4444"
    };

    // Pre-compute traffic gap zones per pro
    var gapZones = {}; // proId -> [{start, end}]
    pros.forEach(function(pro) {
      var proBookings = allBookings.filter(function(bk) { return bk.pro_id === pro.id; });
      var proSvcMap = svcDurMap[pro.id] || {};
      var travelBuf = pro.travel_buffer || 60;
      var zones = [];
      proBookings.forEach(function(bk) {
        var parts = bk.time_slot.split(" ");
        if (parts.length < 2) return;
        var btp = parts[1].split(":");
        var bkStart = parseInt(btp[0]) * 60 + parseInt(btp[1]);
        var dur = bk.service_duration || proSvcMap[bk.service_name] || 60;
        var bkEnd = bkStart + dur;
        // Gap zone: after booking ends, travelBuf minutes
        zones.push({ start: bkEnd, end: bkEnd + travelBuf });
      });
      gapZones[pro.id] = zones;
    });

    var html = "<div style=\"overflow-x:auto;overflow-y:auto;max-height:70vh\">";
    html += "<table style=\"border-collapse:collapse;width:100%;min-width:" + (70 + pros.length * 160) + "px\">";

    // Header
    html += "<thead><tr><th style=\"width:56px;min-width:56px;background:var(--cd);position:sticky;left:0;top:0;z-index:3;border:1px solid var(--br);padding:6px;font-size:11px;color:var(--mu)\">Time</th>";
    pros.forEach(function(pro) {
      var avatar = pro.avatar_url
        ? "<img src=\"" + pro.avatar_url + "\" style=\"width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0\">"
        : "<span style=\"width:26px;height:26px;border-radius:50%;background:var(--bg2);display:inline-flex;align-items:center;justify-content:center;font-size:14px\">" + (pro.emoji||"💅") + "</span>";
      var wsLabel = (pro.work_start || "09:00") + "–" + (pro.work_end || "19:00");
      html += "<th style=\"background:var(--cd);position:sticky;top:0;z-index:2;border:1px solid var(--br);padding:6px 4px;min-width:160px\">"
        + "<div style=\"display:flex;align-items:center;gap:5px;justify-content:center\">"
        + avatar
        + "<div style=\"text-align:left\"><div style=\"font-size:12px;font-weight:600\">" + pro.name + "</div>"
        + "<div style=\"font-size:10px;color:var(--mu)\">" + (pro.specialty||"") + "</div>"
        + "<div style=\"font-size:9px;color:var(--g)\">" + wsLabel + "</div></div></div></th>";
    });
    html += "</tr></thead><tbody>";

    // Body rows
    times.forEach(function(tt) {
      var sp = tt.split(":");
      var slotMin = parseInt(sp[0]) * 60 + parseInt(sp[1]);
      var isHour = sp[1] === "00";
      html += "<tr style=\"height:" + slotHeight + "px\">";
      html += "<td style=\"position:sticky;left:0;z-index:1;background:var(--cd);border:1px solid var(--br);padding:3px 5px;font-size:11px;font-weight:" + (isHour ? "600" : "400") + ";color:" + (isHour ? "var(--tx)" : "var(--mu)") + ";vertical-align:top;white-space:nowrap\">" + tt + "</td>";

      pros.forEach(function(pro) {
        var proSvcMap = svcDurMap[pro.id] || {};
        // Check if slot is outside pro working hours
        var ws = pro.work_start || "09:00", we = pro.work_end || "19:00";
        var wsP = ws.split(":"), weP = we.split(":");
        var wsM = parseInt(wsP[0]) * 60 + parseInt(wsP[1] || 0);
        var weM = parseInt(weP[0]) * 60 + parseInt(weP[1] || 0);
        if (weM <= wsM) weM = 24 * 60;
        var outsideHours = slotMin < wsM || slotMin >= weM;

        // Check if slot is in a traffic gap zone
        var inGap = false;
        (gapZones[pro.id] || []).forEach(function(z) {
          if (slotMin >= z.start && slotMin < z.end) inGap = true;
        });

        // Find bookings that START in this slot
        var slotBks = allBookings.filter(function(bk) {
          if (bk.pro_id !== pro.id) return false;
          var parts = bk.time_slot.split(" ");
          if (parts.length < 2) return false;
          var btp = parts[1].split(":");
          var bkMin = parseInt(btp[0]) * 60 + parseInt(btp[1]);
          return bkMin === slotMin;
        });
        // Find bookings that SPAN through this slot
        var spanBks = allBookings.filter(function(bk) {
          if (bk.pro_id !== pro.id) return false;
          var parts = bk.time_slot.split(" ");
          if (parts.length < 2) return false;
          var btp = parts[1].split(":");
          var bkMin = parseInt(btp[0]) * 60 + parseInt(btp[1]);
          var dur = bk.service_duration || proSvcMap[bk.service_name] || 60;
          return bkMin < slotMin && (bkMin + dur) > slotMin;
        });

        var bgColor = outsideHours ? "rgba(0,0,0,.06)"
          : inGap && !slotBks.length && !spanBks.length ? "rgba(126,34,206,.08)"
          : (slotMin % 60 === 0 ? "var(--cd)" : "var(--bg)");

        html += "<td style=\"border:1px solid var(--br);padding:2px;vertical-align:top;background:" + bgColor + "\">";

        // Traffic gap indicator (only if no booking block here)
        if (inGap && !slotBks.length && !spanBks.length) {
          html += "<div style=\"height:" + (slotHeight - 8) + "px;background:rgba(126,34,206,.12);border-left:3px solid #7e22ce;border-radius:0 4px 4px 0;display:flex;align-items:center;padding-left:6px;font-size:10px;color:#7e22ce\">🚗 travel gap</div>";
        }

        slotBks.forEach(function(bk) {
          var dur = bk.service_duration || proSvcMap[bk.service_name] || 60;
          var rowSpan = Math.max(1, Math.ceil(dur / 30));
          var endMin = slotMin + dur;
          var endH = Math.floor(endMin / 60), endM = endMin % 60;
          var endStr = String(endH).padStart(2,"0") + ":" + String(endM).padStart(2,"0");
          var col = statusColors[bk.status] || "var(--g)";
          var bkId = bk.id || "";
          html += "<div onclick=\"openBkDetail(JSON.parse(decodeURIComponent('" + encodeURIComponent(JSON.stringify(bk)) + "')),'admin')\" style=\"background:" + col + ";color:#fff;border-radius:6px;padding:5px 7px;font-size:11px;line-height:1.4;cursor:pointer;min-height:" + (rowSpan * slotHeight - 6) + "px;overflow:hidden;margin-bottom:2px\" title=\"" + (bk.client_name||"") + " — " + (bk.service_name||"") + "\">"
            + "<div style=\"font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">" + (bk.client_name||"Client") + "</div>"
            + "<div style=\"opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\">" + (bk.service_name||"") + "</div>"
            + "<div style=\"opacity:.8;font-size:10px\">" + tt + "–" + endStr + " · " + dur + "min</div>"
            + "<div style=\"opacity:.75;font-size:10px\">" + (bk.status||"").replace(/_/g," ") + "</div>"
            + "</div>";
        });

        if (spanBks.length && !inGap) {
          spanBks.forEach(function(bk) {
            html += "<div style=\"height:" + (slotHeight - 6) + "px;border-left:3px solid " + (statusColors[bk.status]||"var(--g)") + ";background:rgba(0,0,0,.03);border-radius:0 4px 4px 0;margin:1px 0\"></div>";
          });
        }

        html += "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table></div>";

    // Legend
    html += "<div style=\"display:flex;gap:12px;margin-top:12px;font-size:11px;flex-wrap:wrap\">"
      + Object.keys(statusColors).map(function(s) {
          return "<span style=\"display:inline-flex;align-items:center;gap:4px\"><span style=\"width:12px;height:12px;border-radius:3px;background:" + statusColors[s] + ";display:inline-block\"></span>" + s.replace(/_/g," ") + "</span>";
        }).join("")
      + "<span style=\"display:inline-flex;align-items:center;gap:4px\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(126,34,206,.25);border-left:3px solid #7e22ce;display:inline-block\"></span>travel gap</span>"
      + "<span style=\"display:inline-flex;align-items:center;gap:4px\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(0,0,0,.06);display:inline-block\"></span>off hours</span>"
      + "</div>";

    timeline.innerHTML = html;
  } catch(e) {
    timeline.innerHTML = "<p style=\"color:#ef4444\">Error loading calendar: " + e.message + "</p>";
  }
}

// ══════════════════════════════════════════════════════════════
//  FEATURE 1: EMERGENCY KILL SWITCH
// ══════════════════════════════════════════════════════════════
function toggleKillSwitch(on) {
  if (on && !confirm("ACTIVATE KILL SWITCH?\n\nThis will immediately block ALL new bookings and show a red banner to every visitor.\n\nContinue?")) {
    var cb = ge("setKillSwitch"); if (cb) cb.checked = false;
    return;
  }
  saveSetting("kill_switch", on);
  var ksb = ge("killSwitchBanner");
  if (ksb) ksb.style.display = on ? "block" : "none";
}

// ══════════════════════════════════════════════════════════════
//  FEATURE 2: DYNAMIC SERVICE VISIBILITY
// ══════════════════════════════════════════════════════════════
async function toggleSvcVisibility(svcId, visible) {
  try {
    await sb.from("services").update({ visible: visible }).eq("id", svcId);
    toast(visible ? "Service visible" : "Service hidden", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ══════════════════════════════════════════════════════════════
//  FEATURE 3: CLIENT CRM
// ══════════════════════════════════════════════════════════════
var crmData = [];

async function loadCrm() {
  var body = ge("crmBody"); if (!body) return;
  body.innerHTML = "<tr><td colspan=\"8\" style=\"text-align:center;padding:18px;color:var(--mu)\">Loading...</td></tr>";
  try {
    var pRes = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    var profiles = pRes.data || [];
    var bRes = await sb.from("bookings").select("client_id,total,status");
    var bookings = bRes.data || [];
    var nRes = await sb.from("client_notes").select("*");
    var notes = nRes.data || [];
    var wRes = await sb.from("client_wallets").select("client_id,balance");
    var wallets = wRes.data || [];
    var noteMap = {}, walletMap = {};
    notes.forEach(function(n) { noteMap[n.client_id] = n; });
    wallets.forEach(function(w) { walletMap[w.client_id] = w.balance; });

    var clientStats = {};
    bookings.forEach(function(bk) {
      if (!bk.client_id) return;
      if (!clientStats[bk.client_id]) clientStats[bk.client_id] = { count: 0, spend: 0 };
      clientStats[bk.client_id].count++;
      if (bk.status !== "cancelled") clientStats[bk.client_id].spend += (bk.total || 0);
    });

    crmData = profiles.map(function(p) {
      var stats = clientStats[p.id] || { count: 0, spend: 0 };
      return { profile: p, bookings: stats.count, spend: stats.spend, note: noteMap[p.id], wallet: walletMap[p.id] || 0 };
    });
    renderCrmTable();
  } catch(e) { body.innerHTML = "<tr><td colspan=\"8\" style=\"text-align:center;padding:18px;color:#ef4444\">Error: " + e.message + "</td></tr>"; }
}

function renderCrmTable() {
  var body = ge("crmBody"); if (!body) return;
  var q = (ge("crmSearch") ? ge("crmSearch").value : "").toLowerCase();
  var filtered = crmData.filter(function(c) {
    return !q || (c.profile.full_name || "").toLowerCase().includes(q)
              || (c.profile.email || "").toLowerCase().includes(q)
              || (c.profile.phone || "").toLowerCase().includes(q);
  });
  if (!filtered.length) { body.innerHTML = "<tr><td colspan=\"8\" style=\"text-align:center;padding:18px;color:var(--mu)\">No clients found.</td></tr>"; return; }
  body.innerHTML = filtered.map(function(c) {
    var p = c.profile;
    var noteSnippet = c.note ? c.note.note.substring(0, 40) + (c.note.note.length > 40 ? "..." : "") : "<span style=\"color:var(--mu)\">--</span>";
    var blocked = p.blocked;
    var walBal = c.wallet || 0;
    var walStyle = walBal > 0 ? "color:#15803d;font-weight:600" : "color:var(--mu)";
    return "<tr>"
      + "<td><strong>" + (p.full_name || "--") + "</strong><div style=\"font-size:11px;color:var(--mu)\">" + (p.email || "") + "</div></td>"
      + "<td>" + (p.phone || "--") + "</td>"
      + "<td style=\"text-align:center\">" + c.bookings + "</td>"
      + "<td style=\"text-align:center;font-weight:600\">" + c.spend + "₾</td>"
      + "<td style=\"text-align:center\"><span style=\"" + walStyle + "\">" + walBal + "₾</span><br><button class=\"btn-sm btn-gh\" style=\"font-size:10px;margin-top:2px\" onclick=\"openWalletModal('" + p.id + "','" + (p.full_name || "").replace(/'/g, "\\'") + "'," + walBal + ")\">Adjust</button></td>"
      + "<td>" + (blocked ? "<span style=\"color:#ef4444;font-weight:600\">Blocked</span>" : "<span style=\"color:#10b981\">Active</span>") + "</td>"
      + "<td style=\"font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer\" onclick=\"openClientNote('" + p.id + "','" + (p.full_name || "").replace(/'/g, "\\'") + "')\">" + noteSnippet + "</td>"
      + "<td style=\"display:flex;gap:4px;flex-wrap:wrap\">"
      + "<button class=\"btn-sm btn-gh\" onclick=\"openClientNote('" + p.id + "','" + (p.full_name || "").replace(/'/g, "\\'") + "')\">Notes</button>"
      + "<button class=\"btn-sm " + (blocked ? "btn-gh" : "btn-no") + "\" onclick=\"toggleBlockClient('" + p.id + "'," + !blocked + ")\">" + (blocked ? "Unblock" : "Block") + "</button>"
      + "</td></tr>";
  }).join("");
}

function openClientNote(clientId, name) {
  ge("cnClientId").value = clientId;
  ge("cnClientName").textContent = name;
  var match = crmData.find(function(c) { return c.profile.id === clientId; });
  ge("cnNote").value = match && match.note ? match.note.note : "";
  openM("clientNote");
}

async function saveClientNote() {
  var clientId = ge("cnClientId").value;
  var note = ge("cnNote").value.trim();
  try {
    var existing = crmData.find(function(c) { return c.profile.id === clientId; });
    if (existing && existing.note) {
      await sb.from("client_notes").update({ note: note, updated_by: "admin" }).eq("client_id", clientId);
    } else {
      await sb.from("client_notes").insert({ client_id: clientId, note: note, updated_by: "admin" });
    }
    toast("Note saved!", "ok");
    closeM("clientNote");
    loadCrm();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function toggleBlockClient(clientId, block) {
  var msg = block ? "Block this client? They won't be able to make new bookings." : "Unblock this client?";
  if (!confirm(msg)) return;
  try {
    await sb.from("profiles").update({ blocked: block, block_reason: block ? "Blocked by admin" : null }).eq("id", clientId);
    toast(block ? "Client blocked." : "Client unblocked.", "ok");
    loadCrm();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ══════════════════════════════════════════════════════════════
//  FEATURE 4: DISPUTE / INCIDENT CENTER
// ══════════════════════════════════════════════════════════════
var incidentData = [];

async function loadIncidents() {
  var body = ge("incidentBody"); if (!body) return;
  body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">Loading...</td></tr>";
  try {
    var r = await sb.from("incidents").select("*").order("created_at", { ascending: false });
    incidentData = r.data || [];
    renderIncidents();
  } catch(e) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:#ef4444\">Error: " + e.message + ". Run setup SQL first.</td></tr>"; }
}

function renderIncidents() {
  var body = ge("incidentBody"); if (!body) return;
  if (!incidentData.length) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">No incidents logged.</td></tr>"; return; }
  var statusColors = { open: "#f59e0b", investigating: "#3b82f6", resolved: "#10b981", closed: "#6b7280" };
  body.innerHTML = incidentData.map(function(inc) {
    var col = statusColors[inc.status] || "#6b7280";
    var creditStr = inc.credit_amount ? inc.credit_amount + " GEL (" + (inc.credit_type || "").replace(/_/g, " ") + ")" : "--";
    var bkStr = inc.booking_id ? inc.booking_id.substring(0, 8) + "..." : "--";
    return "<tr>"
      + "<td style=\"font-size:12px;white-space:nowrap\">" + new Date(inc.created_at).toLocaleDateString() + "</td>"
      + "<td style=\"max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\" title=\"" + (inc.description || "").replace(/"/g, "&quot;") + "\">" + (inc.subject || "--") + "</td>"
      + "<td style=\"font-size:11px;font-family:monospace\" title=\"" + (inc.booking_id || "") + "\">" + bkStr + "</td>"
      + "<td>" + (inc.client_id ? inc.client_id.substring(0, 8) + "..." : "--") + "</td>"
      + "<td><span style=\"background:" + col + ";color:#fff;padding:2px 8px;border-radius:50px;font-size:11px;font-weight:600\">" + inc.status + "</span></td>"
      + "<td style=\"font-size:12px\">" + creditStr + "</td>"
      + "<td style=\"display:flex;gap:4px;flex-wrap:wrap\">"
      + (inc.status !== "resolved" ? "<button class=\"btn-sm btn-gh\" onclick=\"resolveIncident('" + inc.id + "')\">Resolve</button>" : "")
      + (inc.status !== "closed" ? "<button class=\"btn-sm btn-no\" onclick=\"closeIncident('" + inc.id + "')\">Close</button>" : "")
      + "<button class=\"btn-sm btn-gh\" onclick=\"editIncidentCredit('" + inc.id + "')\">Credit</button>"
      + "</td></tr>";
  }).join("");
}

function openIncidentModal() {
  ge("incBkId").value = "";
  ge("incSubject").value = "";
  ge("incDesc").value = "";
  ge("incCredit").value = "0";
  ge("incCreditType").value = "";
  openM("incident");
}

async function submitIncident() {
  var subject = (ge("incSubject").value || "").trim();
  if (!subject) { toast("Subject is required", "err"); return; }
  var bookingId = (ge("incBkId").value || "").trim() || null;
  var desc = (ge("incDesc").value || "").trim();
  var credit = parseInt(ge("incCredit").value) || 0;
  var creditType = ge("incCreditType").value || null;
  var clientId = null, proId = null;
  if (bookingId) {
    try {
      var bk = await sb.from("bookings").select("client_id,pro_id").eq("id", bookingId).single();
      if (bk.data) { clientId = bk.data.client_id; proId = bk.data.pro_id; }
    } catch(e) {}
  }
  try {
    var r = await sb.from("incidents").insert({
      booking_id: bookingId, client_id: clientId, pro_id: proId,
      subject: subject, description: desc,
      credit_amount: credit, credit_type: creditType, status: "open"
    });
    if (r.error) throw r.error;
    toast("Incident logged.", "ok");
    closeM("incident");
    loadIncidents();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function resolveIncident(id) {
  try {
    await sb.from("incidents").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    toast("Marked as resolved.", "ok");
    loadIncidents();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function closeIncident(id) {
  try {
    await sb.from("incidents").update({ status: "closed" }).eq("id", id);
    toast("Incident closed.", "ok");
    loadIncidents();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function editIncidentCredit(id) {
  var amount = prompt("Enter credit amount (GEL):");
  if (amount === null) return;
  amount = parseInt(amount) || 0;
  var type = prompt("Credit type: partial, full, or account_credit") || "partial";
  try {
    await sb.from("incidents").update({ credit_amount: amount, credit_type: type }).eq("id", id);
    toast("Credit updated.", "ok");
    loadIncidents();
  } catch(e) { toast("Error: " + e.message, "err"); }
}


// ══════════════════════════════════════════════════════════════
//  WALLET MANAGEMENT
// ══════════════════════════════════════════════════════════════
function openWalletModal(clientId, name, currentBalance) {
  ge("walClientId").value = clientId;
  ge("walClientName").textContent = name + " — Current balance: " + currentBalance + "₾";
  ge("walAmount").value = "";
  ge("walType").value = "add";
  ge("walDesc").value = "";
  openM("walletAdjust");
}

async function saveWalletAdjust() {
  var clientId = ge("walClientId").value;
  var amount = parseInt(ge("walAmount").value) || 0;
  var type = ge("walType").value;
  var desc = (ge("walDesc").value || "").trim() || (type === "add" ? "Admin credit" : "Admin debit");
  if (!amount || amount <= 0) { toast("Enter a valid amount", "err"); return; }

  var delta = type === "add" ? amount : -amount;

  try {
    // Get current balance
    var cur = await sb.from("client_wallets").select("balance").eq("client_id", clientId).single();
    var newBal = (cur.data ? cur.data.balance : 0) + delta;
    if (newBal < 0) { toast("Balance cannot go below 0", "err"); return; }

    if (cur.data) {
      await sb.from("client_wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("client_id", clientId);
    } else {
      await sb.from("client_wallets").insert({ client_id: clientId, balance: Math.max(0, delta), updated_at: new Date().toISOString() });
    }
    await sb.from("wallet_transactions").insert({
      client_id: clientId, amount: delta, type: type === "add" ? "admin_credit" : "admin_debit", description: desc
    });

    toast(type === "add" ? "+" + amount + "₾ added to wallet" : "-" + amount + "₾ removed from wallet", "ok");
    closeM("walletAdjust");
    loadCrm();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ══════════════════════════════════════════════════════════════
//  RETENTION QUEUE PROCESSOR
// ══════════════════════════════════════════════════════════════
async function processRetentionQueue() {
  if (!settings.twilio_enabled || settings.twilio_enabled === "false") {
    toast("Enable Twilio first in Settings", "err"); return;
  }
  var now = new Date().toISOString();
  try {
    var r = await sb.from("retention_queue")
      .select("*").eq("status", "pending").lte("send_at", now);
    var due = r.data || [];
    if (!due.length) { toast("No reminders due right now", "ok"); return; }

    var sent = 0, failed = 0;
    for (var i = 0; i < due.length; i++) {
      var item = due[i];
      try {
        var msg = "Hi " + (item.client_name || "there") + "! It's been a while since your last "
          + (item.service_name || "appointment") + " with " + (item.pro_name || "us")
          + ". Time to treat yourself again? Book at MODY 💅";
        await sendTwilioNotification(item.client_phone, "custom", item.client_name, msg);
        await sb.from("retention_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", item.id);
        sent++;
      } catch(e) {
        await sb.from("retention_queue").update({ status: "failed" }).eq("id", item.id);
        failed++;
      }
    }
    toast("Sent " + sent + " reminder" + (sent !== 1 ? "s" : "") + (failed ? " (" + failed + " failed)" : ""), sent ? "ok" : "err");
  } catch(e) { toast("Error: " + e.message, "err"); }
}
