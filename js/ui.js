// ═══════════════════════════════════════════════════════════════
//  MODY — UI Utilities (dark mode, pages, modals, toast, etc.)
//  Load order: 3 (depends on: config.js, i18n.js)
// ═══════════════════════════════════════════════════════════════

// ── DARK MODE ─────────────────────────────────────────────────
if (localStorage.getItem("mody-dark") === "1") {
  document.documentElement.classList.add("dark");
  document.querySelector(".dm-btn") && (document.querySelector(".dm-btn").textContent = "☀️");
}

function toggleDark() {
  var d = document.documentElement.classList.toggle("dark");
  var btn = document.querySelector(".dm-btn");
  if (btn) btn.textContent = d ? "☀️" : "🌙";
  localStorage.setItem("mody-dark", d ? "1" : "0");
}

// ── HOW IT WORKS INTERACTIVE ─────────────────────────────────
var hiwCurrent = 0;
var hiwTimer = null;

function hiwGo(idx) {
  hiwCurrent = idx;
  document.querySelectorAll(".hiw-tab").forEach(function(t, i) { t.classList.toggle("on", i === idx); });
  document.querySelectorAll(".hiw-card").forEach(function(c, i) { c.classList.toggle("on", i === idx); });
  hiwResetTimer();
}

function hiwResetTimer() {
  if (hiwTimer) clearInterval(hiwTimer);
  hiwTimer = setInterval(function() {
    hiwGo((hiwCurrent + 1) % 3);
  }, 5000);
}

// Start auto-rotation
hiwResetTimer();

// ── TOAST ─────────────────────────────────────────────────────
var _toastTimer;
function toast(msg, type) {
  var el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "on" + (type === "err" ? " err" : type === "ok" ? " ok" : "");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.classList.remove("on"); }, 3400);
}

// ── PAGES ─────────────────────────────────────────────────────
var pageHistory = ["home"];

function show(p) {
  var current = document.querySelector(".pg.on");
  var currentId = current ? current.id.replace("pg-","") : "home";
  document.querySelectorAll(".pg").forEach(function(x) { x.classList.remove("on"); });
  var el = document.getElementById("pg-" + p);
  if (el) { el.classList.add("on"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  // Push to browser history so back button works
  if (currentId !== p) {
    try { history.pushState({ page: p }, "", "#" + p); } catch(e) {}
  }
  // Show/hide correct mobile bottom nav
  ["cMobNav","pMobNav","aMobNav"].forEach(function(id) {
    var mn = document.getElementById(id); if (mn) mn.style.display = "none";
  });
  var navMap = {"dash-client":"cMobNav","dash-pro":"pMobNav","admin":"aMobNav"};
  var targetNav = navMap[p];
  if (targetNav) {
    var mn = document.getElementById(targetNav);
    if (mn && window.innerWidth <= 1024) mn.style.display = "";
  }
  var sheet = document.getElementById("aMobSheet"); if (sheet) sheet.remove();
  // Toggle back button
  var bb = ge("navBackBtn"); if (bb) bb.style.display = p === "home" ? "none" : "";
}

// Browser back/forward button
window.addEventListener("popstate", function(e) {
  var p = (e.state && e.state.page) ? e.state.page : "home";
  document.querySelectorAll(".pg").forEach(function(x) { x.classList.remove("on"); });
  var el = document.getElementById("pg-" + p);
  if (el) el.classList.add("on");
  var bb = ge("navBackBtn"); if (bb) bb.style.display = p === "home" ? "none" : "";
  if (p === "dash-client") loadClientDash();
  if (p === "dash-pro" && typeof loadProDash === "function") loadProDash();
  if (p === "admin" && typeof loadAdminData === "function") loadAdminData();
});

function goBack() {
  history.back();
}

// Mobile swipe right to go back
var touchStartX = 0;
document.addEventListener("touchstart", function(e) {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.addEventListener("touchend", function(e) {
  var dx = e.changedTouches[0].clientX - touchStartX;
  if (touchStartX < 40 && dx > 80) { goBack(); }
}, { passive: true });

function goHome() { show("home"); renderPros(); }

// ── MODALS ────────────────────────────────────────────────────
function openM(id) {
  var m = document.getElementById("modal-" + id);
  if (m) m.classList.add("on");
}
function closeM(id) {
  var m = document.getElementById("modal-" + id);
  if (m) m.classList.remove("on");
}
document.addEventListener("click", function(e) {
  if (e.target.classList.contains("mbg")) e.target.classList.remove("on");
});

// ── AUTH MODAL TABS ───────────────────────────────────────────
function setAuthTab(tab) {
  ["in","client","pro"].forEach(function(x) {
    var f = document.getElementById("aForm-" + x);
    var a = document.getElementById("atab-" + x);
    if (f) f.classList.toggle("hide", x !== tab);
    if (a) a.classList.toggle("on", x === tab);
  });
}

// ── SHORTHAND ─────────────────────────────────────────────────

// ── NAV ───────────────────────────────────────────────────────
function updateNav() {
  var nb = ge("navBtns");
  if (!nb) return;
  var mob = window.innerWidth <= 768;
  if (!profile) {
    if (mob) {
      // Mobile: single compact Sign In button
      nb.innerHTML = "<button class=\"btn btn-g\" style=\"padding:8px 16px;font-size:12px;min-height:36px\" onclick=\"openM('auth')\">" + t("tabIn") + "</button>";
    } else {
      nb.innerHTML =
        "<button class=\"btn btn-o\" onclick=\"openM('auth')\">" + t("tabIn") + "</button>" +
        "<button class=\"btn btn-g\" onclick=\"openM('auth');setAuthTab('client')\">" + t("joinPro") + "</button>";
    }
    return;
  }
  var nm = (profile.full_name || "").split(" ")[0];
  var rl = profile.role === "admin" ? "⚙️ Admin"
         : profile.role === "pro"   ? "💅 Pro"
         : "👤 " + t("cdRoleLbl");
  var dst = profile.role === "admin" ? "loadScript('js/dashboards/admin.js').then(function(){show('admin');loadAdminData();})"
           : profile.role === "pro"   ? "loadScript('js/dashboards/professional.js').then(function(){show('dash-pro');loadProDash();})"
           : "show('dash-client');loadClientDash()";
  if (mob) {
    // Mobile: only notification bell — bottom nav handles Dashboard/Sign Out
    nb.innerHTML =
      "<button id=\"navNotif\" class=\"btn btn-o\" style=\"padding:8px 12px;min-height:36px\" onclick=\"toggleChat()\" title=\"Messages\">🔔</button>" +
      "<button class=\"btn btn-g\" style=\"padding:8px 12px;font-size:12px;min-height:36px\" onclick=\"" + dst + "\">⊞</button>";
  } else {
    nb.innerHTML =
      "<span style=\"font-size:13px;color:var(--mu)\">Hi, " + nm + "</span>" +
      "<span style=\"background:rgba(234,184,183,.15);color:var(--gd);padding:3px 10px;border-radius:50px;font-size:12px;font-weight:500\">" + rl + "</span>" +
      "<button id=\"navNotif\" class=\"btn btn-o\" style=\"position:relative\" onclick=\"toggleChat()\" title=\"Messages\">🔔</button>" +
      "<button class=\"btn btn-g\" onclick=\"" + dst + "\">Dashboard</button>" +
      "<button class=\"btn btn-o\" onclick=\"signOut()\">" + t("cmOutLbl") + "</button>";
  }
  if (typeof updateChatBadge === "function") updateChatBadge();
}


// ── ADMIN MORE MENU (mobile) ─────────────────────────────────
function aMobMore() {
  var items = [
    {icon:"👤", label:"Users",      tab:"usr"},
    {icon:"🏷", label:"Categories", tab:"cats"},
    {icon:"🎟", label:"Promos",     tab:"promo"},
    {icon:"⭐", label:"Reviews",    tab:"rev"},
    {icon:"💬", label:"Support",    tab:"sup"},
    {icon:"⚙️", label:"Settings",   tab:"set"},
    {icon:"🌐", label:"Translations", tab:"tr"},
    {icon:"📈", label:"Analytics", tab:"analytics"},
    {icon:"📝", label:"Blog", tab:"blog"}
  ];
  var existing = ge("aMobSheet");
  if (existing) { existing.remove(); return; }
  var sheet = document.createElement("div");
  sheet.id = "aMobSheet";
  sheet.style.cssText = "position:fixed;bottom:52px;left:0;right:0;z-index:360;background:var(--cd);border-top:1px solid var(--br);box-shadow:0 -4px 24px rgba(0,0,0,.15);padding:12px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px";
  sheet.innerHTML = items.map(function(it) {
    return "<button style=\"display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 4px;border:1px solid var(--br);border-radius:var(--rs);background:var(--bg2);color:var(--tx);cursor:pointer;font-size:12px;transition:all .2s\" onclick=\"aTab('" + it.tab + "');var s=document.getElementById('aMobSheet');if(s)s.remove()\">"
         + "<span style=\"font-size:18px\">" + it.icon + "</span>" + it.label + "</button>";
  }).join("");
  document.body.appendChild(sheet);
  // Close on outside click
  setTimeout(function() {
    document.addEventListener("click", function closeSheet(e) {
      if (!sheet.contains(e.target) && !e.target.closest(".mob-tab")) {
        sheet.remove();
        document.removeEventListener("click", closeSheet);
      }
    });
  }, 50);
}

// ── DISTRICT MANAGEMENT ──────────────────────────────────────
function renderDistricts() {
  var el = ge("aDistrictList"); if (!el) return;
  el.innerHTML = districts.map(function(d, i) {
    return "<div style=\"display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg2);border-radius:var(--rs);margin-bottom:5px\">"
         + "<span style=\"flex:1;font-size:14px\">" + d + "</span>"
         + "<button class=\"btn-sm btn-no\" onclick=\"removeDistrict(" + i + ")\">✕</button>"
         + "</div>";
  }).join("");
  // Update all district dropdowns
  updateDistrictSelects();
}

function addDistrict() {
  var inp = ge("newDistrictInp");
  var name = inp ? inp.value.trim() : "";
  if (!name) { toast("Enter a district name", "err"); return; }
  if (districts.includes(name)) { toast("District already exists", "err"); return; }
  districts.push(name);
  saveSetting("districts", JSON.stringify(districts));
  inp.value = "";
  renderDistricts();
}

function removeDistrict(idx) {
  if (!confirm("Remove " + districts[idx] + "?")) return;
  districts.splice(idx, 1);
  saveSetting("districts", JSON.stringify(districts));
  renderDistricts();
}

function updateDistrictSelects() {
  ["bkDist","spAr","pEditArea"].forEach(function(sid) {
    var el = ge(sid); if (!el) return;
    var cur = el.value;
    el.innerHTML = districts.map(function(d) {
      return "<option" + (d === cur ? " selected" : "") + ">" + d + "</option>";
    }).join("");
  });
}

function updateProRegVisibility() {
  var joinBtns = document.querySelectorAll("[onclick*=\"setAuthTab('pro')\"]");
  if (settings.pro_registration_enabled === false) {
    joinBtns.forEach(function(b) { if (!b.closest("#modal-auth")) b.style.display = "none"; });
  }
}

// ── LIGHTBOX ──────────────────────────────────────────────────
var lbImgs = [], lbIdx = 0;

function lbOpen(images, idx) {
  lbImgs = images;
  lbIdx  = idx;
  lbUpdate();
  ge("lbOv").classList.add("on");
}
function lbClose()  { ge("lbOv").classList.remove("on"); }
function lbNav(d)   { lbIdx = (lbIdx + d + lbImgs.length) % lbImgs.length; lbUpdate(); }
function lbUpdate() {
  var img = ge("lbImg"); if (img) img.src = lbImgs[lbIdx] || "";
  var ctr = ge("lbCtr"); if (ctr) ctr.textContent = (lbIdx + 1) + " / " + lbImgs.length;
}

document.addEventListener("keydown", function(e) {
  var lb = ge("lbOv");
  if (!lb || !lb.classList.contains("on")) return;
  if (e.key === "ArrowLeft")  lbNav(-1);
  if (e.key === "ArrowRight") lbNav(1);
  if (e.key === "Escape")     lbClose();
});

// ── STAR RATING ───────────────────────────────────────────────
var starRating = 0;
function setRating(n) { starRating = n; renderStars(n); }
function renderStars(n) {
  var row = ge("starRow");
  if (!row) return;
  row.querySelectorAll(".star").forEach(function(s, i) {
    s.classList.toggle("lit", i < n);
  });
}

// ── SHARED HELPERS ────────────────────────────────────────────
// ── PHONE VISIBILITY ─────────────────────────────────────────

function fmtReviewerName(name) {
  if (!name) return "Anonymous";
  var parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
}

async function viewUserReviews(userId, userName) {
  try {
    var r = await sb.from("reviews").select("*").eq("reviewer_id", userId).order("created_at", { ascending: false });
    var revs = r.data || [];
    // Fetch reviewer profile for avatar
    var avatarUrl = "";
    var displayName = userName || "User";
    try {
      var prof = await sb.from("profiles").select("full_name,avatar_url").eq("id", userId).single();
      if (prof.data) {
        if (prof.data.full_name) displayName = fmtReviewerName(prof.data.full_name);
        if (prof.data.avatar_url) avatarUrl = prof.data.avatar_url;
      }
    } catch(e) {}
    var ava = avatarUrl
      ? "<img src=\"" + avatarUrl + "\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%\">"
      : "<span style=\"font-size:18px\">👤</span>";
    var html = "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:16px\">"
      + "<div style=\"width:44px;height:44px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0\">" + ava + "</div>"
      + "<h2 style=\"font-size:18px;font-weight:300;margin:0\">Reviews by " + displayName + "</h2>"
      + "</div>";
    if (!revs.length) { html += "<p style=\"color:var(--mu)\">No reviews yet.</p>"; }
    else {
      html += revs.map(function(rv) {
        var stars = Array(5).fill(0).map(function(_, i) {
          return "<span style=\"color:" + (i < rv.rating ? "#facc15" : "#ddd") + ";font-size:20px\">★</span>";
        }).join("");
        return "<div style=\"background:var(--bg2);border-radius:var(--rs);padding:14px;margin-bottom:10px\">"
          + "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\">"
          + "<div>" + stars + "</div>"
          + "<span style=\"font-size:14px;font-weight:600;color:var(--tx)\">" + rv.rating.toFixed(1) + "</span>"
          + "</div>"
          + (rv.comment ? "<p style=\"font-size:14px;color:var(--mu);line-height:1.6;margin-bottom:8px;font-style:italic\">\"" + rv.comment + "\"</p>" : "")
          + "<div style=\"font-size:11px;color:var(--mu)\">" + new Date(rv.created_at).toLocaleDateString() + "</div>"
          + "</div>";
      }).join("");
    }
    ge("bkdTitle").textContent = "Reviews by " + displayName;
    ge("bkdContent").innerHTML = html;
    openM("bkd");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

function canSeePhone(bk) {
  if (!bk) return false;
  var ok = ["accepted","on_the_way","arrived","in_progress","completed"];
  if (ok.indexOf(bk.status) === -1) return false;
  if (bk.status === "completed") {
    try {
      var t = new Date(bk.created_at);
      if ((Date.now() - t.getTime()) > 7200000) return false; // 2 hours
    } catch(e) { return false; }
  }
  return true;
}

// ── ADMIN CHANGE ANY STATUS ──────────────────────────────────
