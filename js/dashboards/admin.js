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
  ["ov","app","bks","pros","usr","cats","promo","rev","sup","set","tr","analytics","blog","mcal"].forEach(function(x) {
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
  if (tab === "sup")   loadAdminSupport();
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
  if (!bks.length) { body.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:18px;color:var(--mu)\">No bookings found.</td></tr>"; return; }
  var opts = ["pending","accepted","on_the_way","arrived","in_progress","completed","cancelled","no_show","late","refunded"];
  body.innerHTML = bks.map(function(b) {
    return "<tr>"
         + "<td>" + (b.client_name || "—") + "</td>"
         + "<td>" + (b.pro_name || "—") + "</td>"
         + "<td>" + (b.service_name || "—") + "</td>"
         + "<td>" + (b.time_slot || "ASAP") + "</td>"
         + "<td>" + (b.total || 0) + "₾</td>"
         + "<td>" + sBadge(b.status) + "</td>"
         + "<td><select class=\"fi\" style=\"font-size:12px;padding:3px 6px\" onchange=\"chBkStatus('" + b.id + "',this.value,'admin')\">"
         + "<option value=\"\">Change…</option>"
         + opts.map(function(s) { return "<option value=\"" + s + "\">" + s.replace(/_/g," ") + "</option>"; }).join("")
         + "</select></td></tr>";
  }).join("");
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
           + (p.featured ? " <span style=\"display:inline-flex;align-items:center;gap:2px;background:rgba(234,179,8,.12);color:#a16207;border:1px solid rgba(234,179,8,.25);padding:2px 7px;border-radius:50px;font-size:10px;font-weight:600\">★ Featured</span>" : "")
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

var allSubCats = [];

function catIcon(c, size) {
  size = size || 28;
  if (c.icon_url) return "<img src=\"" + c.icon_url + "\" style=\"width:" + size + "px;height:" + size + "px;object-fit:contain;display:block;border-radius:6px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.15))\">";
  return "<span style=\"font-size:" + size + "px;line-height:1\">" + (c.emoji || "💅") + "</span>";
}

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

async function loadSubCategories() {
  try {
    var r = await sb.from("subcategories").select("*").order("sort_order");
    if (r.error) r = await sb.from("subcategories").select("*");
    allSubCats = r.data || [];
  } catch(e) { allSubCats = []; }
}

function getSubsForCat(catId) {
  return allSubCats.filter(function(s) { return s.category_id === catId && s.visible !== false; });
}

function subCatName(sc) {
  if (lang === "ka" && sc.name_ka) return sc.name_ka;
  if (lang === "ru" && sc.name_ru) return sc.name_ru;
  return sc.name_en;
}

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

async function loadSavedTranslations() {
  try {
    var r = await sb.from("platform_settings").select("*").like("key", "translations_%");
    if (r.data) {
      r.data.forEach(function(row) {
        var lg = row.key.replace("translations_", "");
        if (TR[lg]) {
          try {
            var saved = JSON.parse(row.value);
            for (var k in saved) { TR[lg][k] = saved[k]; }
          } catch(e) {}
        }
      });
    }
  } catch(e) {}
}


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
            + "<td><span style=\"background:rgba(212,175,55,.12);color:var(--gd);padding:2px 8px;border-radius:50px;font-size:12px;font-weight:600\">" + s.d.commRate + "%</span></td>"
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
            + "<td><span style=\"background:rgba(212,175,55,.12);color:var(--gd);padding:2px 8px;border-radius:50px;font-size:12px;font-weight:600\">" + p.commRate + "%</span></td>"
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
      return "<div style=\"background:var(--cd);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);margin-bottom:14px;cursor:pointer;transition:all .2s;border:1.5px solid transparent\" onclick=\"viewPost('" + p.id + "')\" onmouseover=\"this.style.borderColor='rgba(212,175,55,.4)'\" onmouseout=\"this.style.borderColor='transparent'\">"
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

// ── MASTER CALENDAR ─────────────────────────────────────────
function gotoMasterCal() {
  aTab("mcal");
}

async function renderMasterCal() {
  var dateEl = ge("mcalDate");
  var timeline = ge("mcalTimeline");
  if (!dateEl || !timeline) return;

  // Default to today if no date selected
  if (!dateEl.value) dateEl.value = fmtDate(new Date());
  var selDate = dateEl.value;

  timeline.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Loading...</p>";

  try {
    // Fetch all approved professionals
    var pRes = await sb.from("professionals").select("id,name,avatar_url,emoji,travel_buffer,specialty").eq("approved", true);
    var pros = pRes.data || [];
    if (!pros.length) { timeline.innerHTML = "<p style=\"color:var(--mu)\">No approved professionals found.</p>"; return; }

    // Fetch all bookings for this date
    var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress","completed"];
    var bRes = await sb.from("bookings").select("*").in("status", activeStatuses).like("time_slot", selDate + "%");
    var allBookings = bRes.data || [];

    // Fetch all services for duration lookup
    var sRes = await sb.from("services").select("pro_id,name,duration");
    var svcDurMap = {};
    (sRes.data || []).forEach(function(s) {
      if (!svcDurMap[s.pro_id]) svcDurMap[s.pro_id] = {};
      svcDurMap[s.pro_id][s.name] = s.duration || 60;
    });

    // Timeline config: 8:00 to 22:00 (14 hours)
    var startHr = 8, endHr = 22, totalMin = (endHr - startHr) * 60;

    // Build header with hour markers
    var html = "<div class=\"mcal-wrap\">";
    html += "<div class=\"mcal-header\">";
    html += "<div class=\"mcal-label\">Professional</div>";
    html += "<div class=\"mcal-hours\">";
    for (var h = startHr; h <= endHr; h++) {
      var pct = ((h - startHr) * 60 / totalMin * 100);
      html += "<span class=\"mcal-hr\" style=\"left:" + pct + "%\">" + String(h).padStart(2, "0") + ":00</span>";
    }
    html += "</div></div>";

    // Render each pro row
    pros.forEach(function(pro) {
      var buffer = pro.travel_buffer || 60;
      var arrivalBuf = 60;
      var proBks = allBookings.filter(function(b) { return b.pro_id === pro.id; });
      var proSvcMap = svcDurMap[pro.id] || {};

      var avatar = pro.avatar_url
        ? "<img src=\"" + pro.avatar_url + "\" class=\"mcal-avatar\">"
        : "<span class=\"mcal-avatar-emoji\">" + (pro.emoji || "💅") + "</span>";

      html += "<div class=\"mcal-row\">";
      html += "<div class=\"mcal-label\">" + avatar + "<span class=\"mcal-name\">" + pro.name + "</span></div>";
      html += "<div class=\"mcal-track\">";

      if (!proBks.length) {
        html += "<span class=\"mcal-empty\">No bookings</span>";
      }

      proBks.forEach(function(bk) {
        var parts = bk.time_slot.split(" ");
        if (parts.length < 2) return;
        var tp = parts[1].split(":");
        var bkStartMin = parseInt(tp[0]) * 60 + parseInt(tp[1]);
        var svcDuration = proSvcMap[bk.service_name] || 60;
        var bkEndMin = bkStartMin + svcDuration;

        // Travel buffer before (arrival buffer)
        var bufBeforeStart = bkStartMin - arrivalBuf;
        if (bufBeforeStart < startHr * 60) bufBeforeStart = startHr * 60;
        var bufBeforeLeft = (bufBeforeStart - startHr * 60) / totalMin * 100;
        var bufBeforeWidth = (bkStartMin - bufBeforeStart) / totalMin * 100;

        // Working time block
        var workLeft = (bkStartMin - startHr * 60) / totalMin * 100;
        var workWidth = svcDuration / totalMin * 100;

        // Travel buffer after
        var bufAfterEnd = bkEndMin + buffer;
        if (bufAfterEnd > endHr * 60) bufAfterEnd = endHr * 60;
        var bufAfterLeft = (bkEndMin - startHr * 60) / totalMin * 100;
        var bufAfterWidth = (bufAfterEnd - bkEndMin) / totalMin * 100;

        var startTime = parts[1];
        var endH = Math.floor(bkEndMin / 60), endM = bkEndMin % 60;
        var endTime = String(endH).padStart(2, "0") + ":" + String(endM).padStart(2, "0");

        // Arrival buffer block (purple)
        if (bufBeforeWidth > 0) {
          html += "<div class=\"mcal-block mcal-buf\" style=\"left:" + bufBeforeLeft + "%;width:" + bufBeforeWidth + "%\" title=\"Arrival buffer: " + arrivalBuf + " min before\">"
            + "<span class=\"mcal-blk-txt\">🚗</span></div>";
        }

        // Working time block (gold)
        html += "<div class=\"mcal-block mcal-work\" style=\"left:" + workLeft + "%;width:" + workWidth + "%\" title=\"" + bk.service_name + " — " + startTime + " to " + endTime + "\">"
          + "<span class=\"mcal-blk-txt\">" + (bk.client_name || "Client") + " · " + bk.service_name + "<br>" + startTime + "–" + endTime
          + (bk.address ? "<br>📍 " + bk.address : "") + "</span></div>";

        // Travel buffer after block (purple)
        if (bufAfterWidth > 0) {
          html += "<div class=\"mcal-block mcal-buf\" style=\"left:" + bufAfterLeft + "%;width:" + bufAfterWidth + "%\" title=\"Travel buffer: " + buffer + " min after\">"
            + "<span class=\"mcal-blk-txt\">🚗</span></div>";
        }
      });

      html += "</div></div>";
    });

    html += "</div>";

    // Legend
    html += "<div style=\"display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--mu)\">"
      + "<span><span style=\"display:inline-block;width:14px;height:14px;background:var(--g);border-radius:3px;vertical-align:middle;margin-right:4px\"></span> Working Time</span>"
      + "<span><span style=\"display:inline-block;width:14px;height:14px;background:#7e22ce;border-radius:3px;vertical-align:middle;margin-right:4px\"></span> Travel / Gap Buffer</span>"
      + "</div>";

    timeline.innerHTML = html;
  } catch(e) {
    timeline.innerHTML = "<p style=\"color:#ef4444\">Error loading calendar: " + e.message + "</p>";
  }
}

