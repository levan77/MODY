// ═══════════════════════════════════════════════════════════════
//  MODY — Categories, Professionals List & Filtering
//  Load order: 6 (depends on: config.js, i18n.js, ui.js)
// ═══════════════════════════════════════════════════════════════

var allPros     = [].concat(DEMOS);
var categories  = [];
var activeFilter = "All";
var allSubCats  = [];

// ── CATEGORY ICON HELPER (shared) ────────────────────────────
function catIcon(c, size) {
  size = size || 28;
  if (c.icon_url) return "<img src=\"" + c.icon_url + "\" style=\"width:" + size + "px;height:" + size + "px;object-fit:contain;display:block;border-radius:6px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.15))\">";
  return "<span style=\"font-size:" + size + "px;line-height:1\">" + (c.emoji || "💅") + "</span>";
}

// ── SUBCATEGORY LOAD (shared) ────────────────────────────────
async function loadSubCategories() {
  try {
    var r = await sb.from("subcategories").select("*").order("sort_order");
    if (r.error) r = await sb.from("subcategories").select("*");
    allSubCats = r.data || [];
  } catch(e) { allSubCats = []; }
}

// ── SUBCATEGORY HELPERS (shared, used by both public pages and admin) ──
function getSubsForCat(catId) {
  return allSubCats.filter(function(s) { return s.category_id === catId && s.visible !== false; });
}

function subCatName(sc) {
  if (lang === "ka" && sc.name_ka) return sc.name_ka;
  if (lang === "ru" && sc.name_ru) return sc.name_ru;
  return sc.name_en;
}

// ── PROFILE LOAD ──────────────────────────────────────────────
async function loadCategories() {
  try {
    var r = await sb.from("categories").select("*").order("sort_order");
    if (r.error) {
      // sort_order column might not exist, try without ordering
      r = await sb.from("categories").select("*");
    }
    if (r.data && r.data.length > 0) categories = r.data;
  } catch(e) {}
  // Fallback hardcoded categories
  if (!categories.length) {
    categories = [
      { id:"c1", name_en:"Nails",  name_ka:"\u10e4\u10e0\u10e9\u10ee\u10d8\u10da\u10d4\u10d1\u10d8", name_ru:"\u041d\u043e\u0433\u10e2\u0438", emoji:"💅", sort_order:1, visible:true },
      { id:"c2", name_en:"Makeup", name_ka:"\u10db\u10d0\u10d9\u10d8\u10d0\u10df\u10d8",              name_ru:"\u041c\u0430\u043a\u0438\u044f\u0436",  emoji:"💄", sort_order:2, visible:true },
      { id:"c3", name_en:"Hair",   name_ka:"\u10d7\u10db\u10d0",                                      name_ru:"\u0412\u043e\u043b\u043e\u0441\u044b",  emoji:"💇", sort_order:3, visible:true },
      { id:"c4", name_en:"Lashes", name_ka:"\u10ec\u10d0\u10db\u10ec\u10d0\u10db\u10d4\u10d1\u10d8",  name_ru:"\u0420\u0435\u0441\u043d\u0438\u0446\u044b", emoji:"👁️", sort_order:4, visible:true },
      { id:"c5", name_en:"Brows",  name_ka:"\u10ec\u10d0\u10e0\u10d1\u10d4\u10d1\u10d8",              name_ru:"\u0411\u0440\u043e\u0432\u0438",         emoji:"✨", sort_order:5, visible:true }
    ];
  }
  renderCatGrid();
  renderFilterChips();
  renderFooterSvcs();
  populateSpecSelects();
}

function catName(c) {
  if (lang === "ka" && c.name_ka) return c.name_ka;
  if (lang === "ru" && c.name_ru) return c.name_ru;
  return c.name_en;
}

function visibleCats() { return categories.filter(function(c) { return c.visible !== false; }); }

function renderCatGrid() {
  var el = ge("catGrid"); if (!el) return;
  var vis = visibleCats().filter(function(c) { return c.show_home !== false; });
  if (!vis.length) { el.innerHTML = "<p style=\"color:var(--mu);padding:14px\">No categories yet.</p>"; return; }
  el.innerHTML = vis.map(function(c) {
    var cnt = allPros.filter(function(p) { return p.specialty === c.name_en; }).length;
    var subs = getSubsForCat(c.id);
    var subsHtml = "";
    if (subs.length) {
      subsHtml = "<div class=\"cat-subs\">"
        + subs.map(function(sc) {
            return "<div class=\"cat-sub-item\" onclick=\"event.stopPropagation();filterGoSub('" + c.name_en + "','" + subCatName(sc).replace(/'/g,"\\'") + "')\">" + (sc.emoji ? sc.emoji + " " : "") + subCatName(sc) + "</div>";
          }).join("")
        + "<div style=\"border-top:2px solid rgba(0,0,0,.1);margin:6px 0\"></div>"
        + "<div class=\"cat-sub-item\" onclick=\"event.stopPropagation();filterGo('" + c.name_en + "')\" style=\"opacity:.7\">View all " + catName(c) + " →</div>"
        + "</div>";
    }
    return "<div class=\"cat-card\" onclick=\"filterGo('" + c.name_en + "')\">"
         + (c.icon_url ? "<div class=\"cat-card-bg\" style=\"background-image:url('" + c.icon_url + "')\"></div>" : "")
         + subsHtml
         + "<div class=\"cat-card-content\">"
         + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#fff\">" + catName(c) + "</div>"
         + "<div style=\"font-size:12px;color:rgba(255,255,255,.7);margin-top:2px\">" + cnt + " " + t("pros") + "</div>"
         + "</div></div>";
  }).join("");
}

function renderFilterChips() {
  var el = ge("filterChips"); if (!el) return;
  var vis = visibleCats();
  el.innerHTML = "<button class=\"btn-sm btn-g\" style=\"font-size:16px;padding:10px 20px\" onclick=\"setFilter('All')\">" + t("viewAll") + "</button>"
    + vis.map(function(c) {
        return "<button class=\"btn-sm btn-gh\" onclick=\"setFilter('" + c.name_en + "')\" style=\"display:inline-flex;align-items:center;gap:8px;font-size:16px;padding:10px 18px\">" + catIcon(c, 42) + " " + catName(c) + "</button>";
      }).join("");
}

function renderFooterSvcs() {
  var el = ge("footerSvcs"); if (!el) return;
  el.innerHTML = visibleCats().slice(0, 5).map(function(c) {
    return "<a onclick=\"filterGo('" + c.name_en + "')\">" + catName(c) + "</a>";
  }).join("");
}

function populateSpecSelects() {
  var vis = visibleCats();
  ["spSp", "pEditSpec"].forEach(function(sid) {
    var el = ge(sid); if (!el) return;
    el.innerHTML = vis.map(function(c) {
      return "<option value=\"" + c.name_en + "\">" + c.emoji + " " + catName(c) + "</option>";
    }).join("");
  });
}

// ── PROFESSIONALS ─────────────────────────────────────────────
async function loadPros() {
  try {
    var r = await sb.from("professionals").select("*")
      .eq("status", "approved").order("rating", { ascending: false });
    if (r.data && r.data.length) {
      r.data.forEach(function(p) {
        // Avoid duplicating if already in allPros (check by id, not name)
        if (!allPros.find(function(d) { return d.id === p.id; })) allPros.push(p);
      });
    }
  } catch(e) {}
  renderPros();
}

function setFilter(cat)   { activeFilter = cat; document.body.classList.toggle("viewing-category", cat !== "All"); renderPros(); }
function filterGo(cat)    { activeFilter = cat; document.body.classList.toggle("viewing-category", cat !== "All"); show("list"); renderPros(); }
function filterGoSub(cat, sub) { activeFilter = cat; document.body.classList.toggle("viewing-category", cat !== "All"); show("list"); renderPros(); toast("Showing: " + sub); }

var unavailableProIds = [];
var availFilterActive = false;

async function filterByAvailability() {
  var dateEl = ge("availDate");
  var timeEl = ge("availTime");
  var statusEl = ge("availStatus");
  var date = dateEl ? dateEl.value : "";
  var time = timeEl ? timeEl.value : "";

  if (!date) { unavailableProIds = []; availFilterActive = false; renderPros(); if (statusEl) statusEl.textContent = ""; return; }

  availFilterActive = true;
  if (statusEl) statusEl.textContent = "Checking...";

  try {
    var unavail = [];

    // 1. Get pros with day off
    var doff = await sb.from("pro_days_off").select("pro_id").eq("off_date", date);
    if (doff.data) doff.data.forEach(function(d) { if (unavail.indexOf(d.pro_id) === -1) unavail.push(d.pro_id); });

    // 2. Get pros with this specific hour blocked
    if (time) {
      var hoff = await sb.from("pro_hours_off").select("pro_id").eq("off_date", date).eq("off_hour", time);
      if (hoff.data) hoff.data.forEach(function(h) { if (unavail.indexOf(h.pro_id) === -1) unavail.push(h.pro_id); });
    }

    // 3. Check bookings with buffer overlap
    var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
    var bkRes = await sb.from("bookings").select("pro_id,time_slot,service_name,status").in("status", activeStatuses).like("time_slot", date + "%");

    if (bkRes.data && bkRes.data.length && time) {
      // Get all services for duration lookup
      var svcRes = await sb.from("services").select("pro_id,name,duration");
      var svcDurMap = {};
      (svcRes.data || []).forEach(function(s) {
        if (!svcDurMap[s.pro_id]) svcDurMap[s.pro_id] = {};
        svcDurMap[s.pro_id][s.name] = s.duration || 60;
      });

      // Get all pro buffers
      var proRes = await sb.from("professionals").select("id,travel_buffer").eq("status", "approved");
      var bufMap = {};
      (proRes.data || []).forEach(function(p) { bufMap[p.id] = p.travel_buffer || 60; });

      var reqParts = time.split(":");
      var reqMin = parseInt(reqParts[0]) * 60 + parseInt(reqParts[1] || 0);

      bkRes.data.forEach(function(b) {
        if (!b.pro_id || unavail.indexOf(b.pro_id) > -1) return;
        var parts = (b.time_slot || "").split(" ");
        if (parts.length < 2) return;
        var tp = parts[1].split(":");
        var bkStart = parseInt(tp[0]) * 60 + parseInt(tp[1] || 0);
        var bkDur = (svcDurMap[b.pro_id] && svcDurMap[b.pro_id][b.service_name]) || 60;
        var bkEnd = bkStart + bkDur;
        var buf = bufMap[b.pro_id] || 60;
        var arrBuf = 60;
        // Blocked zone: [bkStart - arrBuf, bkEnd + buf]
        if (reqMin >= bkStart - arrBuf && reqMin < bkEnd + buf) {
          unavail.push(b.pro_id);
        }
      });
    } else if (bkRes.data && !time) {
      // No time selected — mark any pro with any booking on this date
      bkRes.data.forEach(function(b) {
        if (b.pro_id && unavail.indexOf(b.pro_id) === -1) unavail.push(b.pro_id);
      });
    }

    unavailableProIds = unavail;
    renderPros();

    var totalPros = allPros.filter(function(p) { return p.status === "approved" || ["d1","d2","d3","d4","d5","d6"].indexOf(p.id) > -1; }).length;
    var avail = totalPros - unavail.length;
    if (statusEl) statusEl.textContent = avail + " available" + (time ? " at " + time : " on " + date);
  } catch(e) {
    if (statusEl) statusEl.textContent = "Error checking availability";
    unavailableProIds = [];
    renderPros();
  }
}

function clearAvailFilter() {
  var dateEl = ge("availDate"); if (dateEl) dateEl.value = "";
  var timeEl = ge("availTime"); if (timeEl) timeEl.value = "";
  var statusEl = ge("availStatus"); if (statusEl) statusEl.textContent = "";
  unavailableProIds = [];
  availFilterActive = false;
  renderPros();
}

function renderPros() {
  var filtered = activeFilter === "All"
    ? allPros
    : allPros.filter(function(p) { return p.specialty === activeFilter; });

  // Apply availability filter
  if (availFilterActive && unavailableProIds.length) {
    filtered = filtered.filter(function(p) { return unavailableProIds.indexOf(p.id) === -1; });
  }

  // Featured section on home
  var fe = ge("featuredPros");
  if (fe) {
    var feat = allPros.filter(function(p) { return p.featured; });
    if (!feat.length) feat = allPros.slice(0, 3);
    fe.innerHTML = feat.map(proCard).join("");
  }

  // List page
  var le = ge("prosList");
  if (le) {
    if (!filtered.length) {
      le.innerHTML = "<p style=\"color:var(--mu);padding:20px\">" + (availFilterActive ? "No professionals available at this time. Try a different date/time." : "No professionals found.") + "</p>";
    } else {
      le.innerHTML = "<div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:11px\">"
                   + filtered.map(proListCard).join("") + "</div>";
    }
  }
  renderCatGrid();
}

function proCard(p) {
  var img = p.avatar_url ? "<img src=\"" + p.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">" : "";
  var emo = p.avatar_url ? "" : p.emoji || "💅";
  var vBadge = p.verified
    ? "<div style=\"position:absolute;top:10px;left:10px;background:rgba(59,130,246,.9);color:#fff;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:3px;backdrop-filter:blur(4px)\">✓ " + t("pcVerified") + "</div>"
    : "<div style=\"position:absolute;top:10px;left:10px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.7);padding:3px 10px;border-radius:50px;font-size:11px;font-weight:500;backdrop-filter:blur(4px)\">" + t("pcUnverified") + "</div>";
  return "<div class=\"pro-card\" onclick=\"viewPro('" + p.id + "')\">"
       + "<div class=\"pro-img\" style=\"position:relative\">" + img + emo + vBadge + "</div>"
       + "<div style=\"padding:16px\">"
       + "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px\">"
       + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;line-height:1.15\">" + proName(p) + "</div>"
       + "<span class=\"bdg bdg-g\" style=\"font-size:15px;padding:4px 10px\">★ " + p.rating + "</span></div>"
       + "<div style=\"font-size:18px;color:var(--mu);margin-bottom:10px;font-weight:500\">" + proSpec(p) + " · " + proArea(p) + "</div>"
       + "<div style=\"display:flex;justify-content:space-between;font-size:17px\">"
       + "<span style=\"color:var(--mu)\">" + p.review_count + " " + t("pcReviews") + "</span>"
       + "<span style=\"font-size:20px\">" + t("pcFrom") + " <strong>" + p.price_from + "₾</strong></span></div>"
       + "</div></div>";
}

function proListCard(p) {
  var img = p.avatar_url ? "<img src=\"" + p.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">" : "";
  var emo = p.avatar_url ? "" : p.emoji || "💅";
  var vTag = p.verified
    ? "<span class=\"vbadge\" style=\"font-size:12px;padding:3px 9px\">" + t("pcVerified") + "</span>"
    : "<span style=\"display:inline-flex;align-items:center;gap:3px;background:rgba(150,150,150,.1);color:var(--mu);border:1px solid rgba(150,150,150,.25);padding:2px 8px;border-radius:50px;font-size:11px\">" + t("pcUnverified") + "</span>";
  return "<div style=\"background:var(--cd);border-radius:var(--r);padding:16px;display:grid;grid-template-columns:80px 1fr auto;gap:11px;align-items:center;box-shadow:var(--sh);cursor:pointer;transition:all .25s;border:1.5px solid transparent\""
       + " onclick=\"viewPro('" + p.id + "')\""
       + " onmouseover=\"this.style.borderColor='rgba(234,184,183,.4)'\""
       + " onmouseout=\"this.style.borderColor='transparent'\">"
       + "<div style=\"width:80px;height:80px;background:var(--bg2);border-radius:var(--rs);display:flex;align-items:center;justify-content:center;font-size:36px;overflow:hidden;position:relative\">" + img + emo + "</div>"
       + "<div>"
       + "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:3px\">"
       + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:700;line-height:1.2\">" + proName(p) + "</div>"
       + vTag + "</div>"
       + "<div style=\"font-size:14px;color:var(--mu);margin-bottom:5px;font-weight:500\">" + proSpec(p) + " · " + proArea(p) + "</div>"
       + "<span style=\"color:#facc15;font-size:14px;font-weight:600\">★ " + p.rating + "</span>"
       + (p.rating >= 4.9 ? "<span class=\"bdg bdg-g\" style=\"margin-left:4px\">" + t("pcTopRated") + "</span>" : "")
       + "</div>"
       + "<div style=\"text-align:right\">"
       + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700\">" + p.price_from + "₾</div>"
       + "<button class=\"btn btn-g\" style=\"margin-top:8px;font-size:16px;padding:10px 22px\" onclick=\"event.stopPropagation();viewPro('" + p.id + "')\">" + t("pcBook") + "</button>"
       + "</div></div>";
}

// ── PROFESSIONAL PROFILE ──────────────────────────────────────
