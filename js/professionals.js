// ═══════════════════════════════════════════════════════════════
//  MODY — Professional Profile View
//  Load order: 7 (depends on: config.js, i18n.js, ui.js, categories.js)
// ═══════════════════════════════════════════════════════════════

async function viewPro(proId) {
  show("profile");
  // Reset cart when opening a new pro profile
  if (typeof selSvcs !== "undefined") { selSvcs = []; }
  var DEMO_IDS = ["d1","d2","d3","d4","d5","d6"];
  var isDemo   = DEMO_IDS.indexOf(proId) > -1;
  var pro       = allPros.find(function(p) { return p.id === proId; });
  var svcs      = [];
  var portfolio = [];
  var nailColors= [];
  var reviews   = [];

  if (isDemo && pro) {
    // Use hardcoded demo data
    svcs       = pro.services    || [];
    portfolio  = pro.portfolio   || [];
    nailColors = pro.nail_colors || [];
    // Still try to fetch real reviews for demo pros
    try {
      var demoRevRes = await sb.from("reviews").select("*").eq("pro_id", proId).eq("visible", true)
        .order("created_at", { ascending: false }).limit(8);
      reviews = demoRevRes.data || [];
    } catch(e) { reviews = []; }
  } else {
    // ALWAYS fetch from database for real professionals
    try {
      var res = await Promise.all([
        sb.from("professionals").select("*").eq("id", proId).single(),
        sb.from("services").select("*").eq("pro_id", proId).order("created_at"),
        sb.from("portfolio_images").select("*").eq("pro_id", proId).order("created_at"),
        sb.from("nail_colors").select("*").eq("pro_id", proId).order("created_at"),
        sb.from("reviews").select("*").eq("pro_id", proId).eq("visible", true)
          .order("created_at", { ascending: false }).limit(8)
      ]);
      if (res[0].error) { toast("Could not load professional: " + res[0].error.message, "err"); return; }
      pro        = res[0].data;
      svcs       = (res[1].data || []).filter(function(s) { return s.visible !== false; });
      portfolio  = (res[2].data || []).map(function(i) { return i.url; });
      nailColors = res[3].data || [];
      reviews    = res[4].data || [];
      if (res[1].error) console.warn("Services load error:", res[1].error);
    } catch(e) { toast("Error loading profile: " + e.message, "err"); return; }
  }
  if (!pro) { toast("Professional not found", "err"); return; }

  // Enrich ALL reviews (demo or real) with reviewer name & avatar
  if (reviews.length) {
    try {
      var rids = reviews.map(function(r) { return r.reviewer_id; }).filter(Boolean);
      if (rids.length) {
        var rp = await sb.from("profiles").select("id,full_name,avatar_url").in("id", rids);
        var profs = rp.data || [];
        reviews.forEach(function(rv) {
          var p = profs.find(function(x) { return x.id === rv.reviewer_id; });
          if (p) { rv._name = p.full_name; rv._avatar = p.avatar_url; }
        });
      }
    } catch(e) {}
  }

  // store images for lightbox
  lbImgs = portfolio;

  // Portfolio section
  var portHtml = "";
  if (portfolio.length > 0) {
    portHtml = "<div class=\"card\" style=\"margin-bottom:12px\">"
             + "<h3 style=\"font-size:16px;font-weight:400;margin-bottom:11px\">Portfolio</h3>"
             + "<div class=\"port-grid\">"
             + portfolio.slice(0, 9).map(function(url, i) {
                 return "<div class=\"port-thumb\" onclick=\"lbOpen(lbImgs," + i + ")\">"
                      + "<img src=\"" + url + "\" alt=\"\" loading=\"lazy\"></div>";
               }).join("")
             + "</div></div>";
  }

  // Nail colors section
  var nailHtml = "";
  if (nailColors.length > 0 && settings.nail_colors_enabled !== false) {
    nailHtml = "<div class=\"card\" style=\"margin-bottom:12px\">"
             + "<h3 style=\"font-size:16px;font-weight:400;margin-bottom:6px\">🌈 Nail Color Catalog</h3>"
             + "<p style=\"font-size:13px;color:var(--mu);margin-bottom:10px\">Select colors during booking.</p>"
             + "<div class=\"swatch-row\">"
             + nailColors.map(function(c) {
                 return "<div class=\"swatch\" style=\"background:" + c.hex_code + "\" title=\"" + c.name + "\"></div>";
               }).join("")
             + "</div></div>";
  }

  // Reviews section - always show
  var revHtml = "<div class=\"card\" style=\"margin-bottom:12px\">"
    + "<h3 style=\"font-size:16px;font-weight:400;margin-bottom:11px\">⭐ Reviews" + (reviews.length ? " (" + reviews.length + ")" : "") + "</h3>";
  if (reviews.length > 0) {
    revHtml += reviews.map(function(rv) {
                var stars = Array(5).fill(0).map(function(_, i) {
                  return "<span style=\"color:" + (i < rv.rating ? "#facc15" : "#ddd") + ";font-size:20px\">★</span>";
                }).join("");
                var rName = fmtReviewerName(rv._name);
                var ava = rv._avatar
                  ? "<img src=\"" + rv._avatar + "\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%\">"
                  : "<span style=\"font-size:14px\">👤</span>";
                return "<div class=\"rev-item\" style=\"cursor:pointer\" onclick=\"viewUserReviews('" + (rv.reviewer_id || "") + "','" + rName.replace(/'/g,"\\'") + "')\">"
                     + "<div style=\"display:flex;gap:10px;align-items:flex-start\">"
                     + "<div style=\"width:36px;height:36px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0\">" + ava + "</div>"
                     + "<div style=\"flex:1\">"
                     + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:3px\">"
                     + "<div style=\"font-weight:600;font-size:14px\">" + rName + "</div>"
                     + "<div style=\"font-size:11px;color:var(--mu)\">" + new Date(rv.created_at).toLocaleDateString() + "</div>"
                     + "</div>"
                     + "<div style=\"margin-bottom:4px\">" + stars + "</div>"
                     + (rv.comment ? "<p style=\"font-size:13px;color:var(--mu);line-height:1.5\">" + rv.comment + "</p>" : "")
                     + "</div></div></div>";
              }).join("");
  } else {
    revHtml += "<p style=\"color:var(--mu);font-size:14px\">No reviews yet. Be the first to book and review!</p>";
  }
  revHtml += "</div>";

  // Services list — multi-select (Add/Remove per service)
  // Special tariff markup
  var tariffOn = settings.special_tariff_enabled === true || settings.special_tariff_enabled === "true";
  var tariffPct = tariffOn ? (parseInt(settings.special_tariff_percent) || 20) : 0;

  var svcsHtml = svcs.length === 0
    ? "<p style=\"color:var(--mu);font-size:14px\">No services listed yet.</p>"
    : svcs.map(function(s) {
        var displayPrice = tariffOn ? Math.ceil(s.price * (1 + tariffPct / 100)) : s.price;
        var priceHtml = tariffOn
          ? "<span style=\"text-decoration:line-through;color:var(--mu);font-size:14px;margin-right:4px\">" + s.price + "₾</span><span style=\"color:#ef4444\">" + displayPrice + "₾</span>"
          : s.price + "₾";
        return "<div class=\"svc-item\">"
             + "<div>"
             + "<div style=\"font-size:14px;font-weight:500\">" + s.name + "</div>"
             + "<div style=\"font-size:12px;color:var(--mu)\">" + (s.description || "") + (s.duration ? " · " + s.duration + " min" : "") + "</div>"
             + "</div>"
             + "<div style=\"text-align:right\">"
             + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600\">" + priceHtml + "</div>"
             + "<button class=\"svc-btn\" onclick=\"selectService('" + s.id + "','" + s.name.replace(/'/g,"\\'") + "'," + displayPrice + ",'" + pro.id + "','" + pro.name.replace(/'/g,"\\'") + "','" + (pro.specialty || "") + "'," + (s.duration || 60) + ")\">Add</button>"
             + "</div></div>";
      }).join("");

  var ava = pro.avatar_url
    ? "<img src=\"" + pro.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">"
    : "<span style=\"font-size:38px\">" + (pro.emoji || "💅") + "</span>";

  ge("profileContent").innerHTML =
    "<div>"
    + "<div class=\"card\" style=\"margin-bottom:11px\">"
    + "<div style=\"display:flex;align-items:flex-end;gap:11px;margin-bottom:10px\">"
    + "<div style=\"width:74px;height:74px;border-radius:50%;border:4px solid var(--cd);display:flex;align-items:center;justify-content:center;background:var(--bg2);margin-top:-38px;box-shadow:0 4px 12px rgba(0,0,0,.12);overflow:hidden;flex-shrink:0\">" + ava + "</div>"
    + "<button class=\"btn btn-o\" onclick=\"show('list')\" style=\"font-size:12px;margin-bottom:1px\">← Back</button>"
    + "</div>"
    + "<h1 style=\"font-size:22px;font-weight:300;margin-bottom:3px\">" + pro.name + "</h1>"
    + "<p style=\"color:var(--mu);margin-bottom:8px\">" + pro.specialty + " · " + pro.area + "</p>"
    + "<div style=\"display:flex;gap:8px;flex-wrap:wrap;align-items:center\">"
    + "<span style=\"color:var(--g);font-size:13px\">★ " + pro.rating + " <span style=\"color:var(--mu)\">(" + pro.review_count + " reviews)</span></span>"
    + (pro.rating >= 4.9 ? "<span class=\"bdg bdg-g\">Top Rated</span>" : "")
    + (pro.verified ? "<span class=\"vbadge\">Verified</span>" : "")
    + (pro.years_experience ? "<span style=\"display:inline-flex;align-items:center;gap:3px;background:rgba(168,85,247,.1);color:#7e22ce;border:1px solid rgba(168,85,247,.25);padding:2px 8px;border-radius:50px;font-size:11px;font-weight:600\">" + pro.years_experience + " yr exp</span>" : "")
    + "<span class=\"bdg bdg-gr\">Available</span>"
    + "</div>"
    + (pro.bio ? "<p style=\"margin-top:8px;font-size:14px;line-height:1.7;color:var(--mu)\">" + pro.bio + "</p>" : "")
    + "</div>"
    + portHtml + nailHtml
    + "<div class=\"card\" style=\"margin-bottom:11px\"><h3 style=\"font-size:16px;font-weight:400;margin-bottom:11px\">Services & Pricing</h3>" + svcsHtml + "</div>"
    + revHtml
    + "</div>"
    + "<div><div class=\"book-card\">"
    + "<h3 style=\"font-size:16px;font-weight:400;margin-bottom:4px\">Book " + pro.name.split(" ")[0] + "</h3>"
    + "<p style=\"font-size:12px;color:var(--mu);margin-bottom:12px\">Select one or more services, then choose a time.</p>"
    // Service cart summary
    + "<div id=\"sbCartSummary\" class=\"hide\" style=\"background:var(--bg2);border-radius:var(--rs);padding:10px;margin-bottom:10px\">"
    + "<div style=\"font-size:11px;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px\">Selected Services</div>"
    + "<div id=\"sbCartRows\"></div>"
    + "<div style=\"display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--mu)\"><span>Platform fee</span><span>5₾</span></div>"
    + "<div id=\"sbWalletHint\" style=\"display:none;font-size:11px;color:#15803d;padding:3px 0\"></div>"
    + "<div style=\"display:flex;justify-content:space-between;font-size:14px;font-weight:600;padding:6px 0 2px;border-top:1px solid var(--br);margin-top:4px\"><span>Total</span><span style=\"font-family:'Cormorant Garamond',serif;font-size:18px\" id=\"sbT\">—</span></div>"
    + "</div>"
    // Time selection
    + "<div class=\"mtabs\"><div class=\"mtab on\" onclick=\"swMode(this,'asap')\">⚡ ASAP</div><div class=\"mtab\" onclick=\"swMode(this,'sched')\">📅 Schedule</div></div>"
    + "<div id=\"schedW\" class=\"hide fg\"><label class=\"fl\">Date</label><input type=\"date\" class=\"fi\" id=\"schedDate\"></div>"
    + "<div class=\"fg\"><label class=\"fl\">Time</label><div class=\"ts-grid\">"
    + ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map(function(tt, i) {
        return "<div class=\"ts" + (i === 2 ? " dis" : "") + "\" onclick=\"pickSbTs(this)\">" + tt + "</div>";
      }).join("")
    + "</div></div>"
    // Mobile sticky CTA (fixed at bottom on mobile, inline on desktop)
    + "<div class=\"mobile-sticky-cta\">"
    + "<button class=\"btn btn-g\" id=\"sbContinueBtn\" style=\"width:100%;justify-content:center;padding:13px;font-size:13px;opacity:.45;pointer-events:none\" onclick=\"gotoBooking()\">Select a service</button>"
    + "</div>"
    + "<p style=\"font-size:11px;color:var(--mu);text-align:center;margin-top:8px\">Free cancellation up to 2 hours before</p>"
    + "</div></div>";
}

function swMode(el, mode) {
  el.closest(".mtabs").querySelectorAll(".mtab").forEach(function(t) { t.classList.remove("on"); });
  el.classList.add("on");
  var sw = ge("schedW"); if (sw) sw.classList.toggle("hide", mode === "asap");
}

function pickSbTs(el) {
  if (el.classList.contains("dis")) return;
  document.querySelectorAll("#profileContent .ts").forEach(function(t) { t.classList.remove("on"); });
  el.classList.add("on");
}


