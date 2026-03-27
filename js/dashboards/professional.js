// ═══════════════════════════════════════════════════════════════
//  MODY — Professional Dashboard
//  Load order: 10 (depends on: config.js, i18n.js, ui.js, auth.js, booking.js)
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
//  PRO DASHBOARD
// ──────────────────────────────────────────────────────────────
function pTab(tab) {
  ["bk","cal","earn","port","svcs","colors","rev","edit","sup"].forEach(function(x) {
    var el = ge("pTab-" + x), ni = ge("pN-" + x);
    if (el) el.classList.toggle("hide", x !== tab);
    if (ni) ni.classList.toggle("on",   x === tab);
  });
  // Mobile bottom nav highlight
  var mn = ge("pMobNav");
  if (mn) mn.querySelectorAll(".mob-tab").forEach(function(b, i) {
    var map = ["bk","cal","svcs","port","edit"];
    b.classList.toggle("on", map[i] === tab);
  });
  if (tab === "cal")    renderProCal();
  if (tab === "port")   loadProPortfolio();
  if (tab === "svcs")   loadProSvcs();
  if (tab === "colors") loadProColors();
  if (tab === "rev")    loadProRevs();
  if (tab === "sup")    loadTickets("pro");
}

async function loadProDash() {
  if (!user) return;
  var proId = profile ? profile.pro_id : null;

  // Auto-recover pro_id if missing
  if (!proId) {
    try {
      var pr = await sb.from("professionals").select("id").eq("user_id", user.id).single();
      if (pr.data && pr.data.id) {
        proId = pr.data.id;
        if (profile) profile.pro_id = proId;
        await sb.from("profiles").update({ pro_id: proId }).eq("id", user.id);
      }
    } catch(e) {}
  }

  var pro = null;
  if (proId) {
    try { var r = await sb.from("professionals").select("*").eq("id", proId).single(); pro = r.data; } catch(e) {}
  }

  var name = pro ? pro.name : (profile ? profile.full_name : user.email);
  var pw = ge("pWelcome"); if (pw) pw.textContent = t("welcomeBack") + ", " + name.split(" ")[0];
  var pn = ge("pName");    if (pn) pn.textContent = name;

  if (pro) {
    var ps = ge("pSpec"); if (ps) ps.textContent = pro.specialty;
    var badge = ge("pStatusBadge");
    if (badge) {
      if (pro.status === "approved") {
        badge.textContent = "✅ Active";
        badge.style.cssText = "background:rgba(34,197,94,.12);color:#15803d;border:1px solid rgba(34,197,94,.3);padding:4px 10px;border-radius:50px;font-size:12px;font-weight:500";
      } else if (pro.status === "rejected") {
        badge.textContent = "❌ Rejected";
        badge.style.cssText = "background:rgba(239,68,68,.12);color:#b91c1c;border:1px solid rgba(239,68,68,.3);padding:4px 10px;border-radius:50px;font-size:12px;font-weight:500";
      }
    }
    // Pre-fill edit profile
    if (ge("pEditName"))  ge("pEditName").value  = pro.name;
    if (ge("pEditSpec"))  ge("pEditSpec").value  = pro.specialty;
    if (ge("pEditBio"))   ge("pEditBio").value   = pro.bio || "";
    if (ge("pEditArea"))  ge("pEditArea").value  = pro.area || "Vake";
    if (ge("pEditPrice")) ge("pEditPrice").value = pro.price_from || "";
    if (ge("pEditYears")) ge("pEditYears").value = pro.years_experience || "";
    if (ge("pEditBuffer")) { ge("pEditBuffer").value = pro.travel_buffer || 60; var bv = ge("pBufferVal"); if (bv) bv.textContent = (pro.travel_buffer || 60) + " min"; }
    var pe = ge("pEditStatus");
    if (pe) pe.textContent = pro.status === "approved"
      ? "✅ Profile is live. Changes need re-approval."
      : "⏳ Awaiting admin approval.";
    // Avatar
    if (pro.avatar_url) {
      var pae = ge("pAvaEdit"); if (pae) pae.innerHTML = "<img src=\"" + pro.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">";
      var pad = ge("pAvaDisp"); if (pad) pad.innerHTML = "<img src=\"" + pro.avatar_url + "\" style=\"width:100%;height:100%;object-fit:cover\">";
    }
  }

  // Show current email/phone in account settings
  var pe2 = ge("pCurrentEmail"); if (pe2) pe2.textContent = "Current: " + (profile ? (profile.email || user.email) : user.email);
  var pp2 = ge("pCurrentPhone"); if (pp2) pp2.textContent = "Current: " + (profile && profile.phone ? profile.phone : "Not set");

  if (!proId) {
    var pb = ge("pBkBody");
    if (pb) pb.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center;padding:18px;color:var(--mu)\">Go to Edit Profile tab to set up your profile.</td></tr>";
    return;
  }

  var res  = await sb.from("bookings").select("*").eq("pro_id", proId).order("created_at", { ascending: false });
  var bks  = res.data || [];
  var pend = bks.filter(function(b) { return b.status === "pending"; });
  var done = bks.filter(function(b) { return b.status === "completed"; });
  var earned = done.reduce(function(s, b) { return s + Math.round((b.total || 0) * 0.95); }, 0);

  if (ge("pS1")) ge("pS1").textContent = earned + "₾";
  if (ge("pS2")) ge("pS2").textContent = bks.length;
  if (ge("pS4")) ge("pS4").textContent = pend.length;
  if (ge("pE1")) ge("pE1").textContent = earned + "₾";
  if (ge("pE2")) ge("pE2").textContent = earned + "₾";
  if (ge("pE4")) ge("pE4").textContent = done.length;
  var ppb = ge("pPendBadge"); if (ppb) ppb.textContent = pend.length + " pending";

  // ── Location Sharing Bar ──
  var locBar = ge("pLocBar");
  if (locBar) {
    var activeLoc = bks.filter(function(b) { return b.status === "on_the_way" || b.status === "arrived"; });
    if (activeLoc.length) {
      locBar.innerHTML = activeLoc.map(function(b) {
        var isSharing = proLocWatchId !== null && proLocBookingId === b.id;
        if (b.status === "on_the_way") {
          return "<div class=\"share-loc-bar\">"
            + "<div style=\"display:flex;align-items:center;gap:10px\">"
            + "<span style=\"font-size:20px\">📡</span>"
            + "<div>"
            + "<div style=\"font-weight:500;font-size:14px;color:#7e22ce\">" + (isSharing ? "<span class=\"track-pulse\"></span>Sharing live location" : "Share your location") + "</div>"
            + "<div style=\"font-size:12px;color:var(--mu)\">Client: " + (b.client_name || "—") + " — " + (b.service_name || "") + "</div>"
            + "</div></div>"
            + "<div style=\"display:flex;gap:6px;align-items:center\">"
            + (isSharing
              ? "<span style=\"font-size:12px;color:#15803d\">● Live</span><button class=\"btn btn-o\" style=\"font-size:12px\" onclick=\"stopLocSharing()\">Stop Sharing</button>"
              : "<button class=\"btn btn-g\" style=\"font-size:13px\" onclick=\"startLocSharing('" + b.id + "')\">📍 Start Sharing</button>")
            + "</div></div>";
        } else {
          return "<div class=\"share-loc-bar\" style=\"background:rgba(234,179,8,.1);border-color:rgba(234,179,8,.3)\">"
            + "<div style=\"display:flex;align-items:center;gap:10px\">"
            + "<span style=\"font-size:20px\">⏳</span>"
            + "<div>"
            + "<div style=\"font-weight:500;font-size:14px;color:#a16207\">Waiting for client to confirm arrival</div>"
            + "<div style=\"font-size:12px;color:var(--mu)\">Client: " + (b.client_name || "—") + " — " + (b.service_name || "") + "</div>"
            + "</div></div></div>";
        }
      }).join("");
    } else {
      locBar.innerHTML = "";
    }
  }

  // Incoming requests
  var inc = ge("pIncoming");
  if (inc) {
    if (!pend.length) {
      inc.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No pending requests.</p>";
    } else {
      // Fetch client profiles + booking history for trust signals
      var clientIds = pend.map(function(b) { return b.client_id; }).filter(Boolean);
      var clientData = {};
      if (clientIds.length) {
        // 1. Get client profiles
        try {
          var cProfiles = await sb.from("profiles").select("id,full_name,avatar_url").in("id", clientIds);
          if (cProfiles.data) cProfiles.data.forEach(function(p) {
            clientData[p.id] = { name: p.full_name, avatar: p.avatar_url, completedCount: 0, avgRating: 0, revCount: 0 };
          });
        } catch(e) {}

        // 2. Count completed bookings per client
        try {
          var cBks = await sb.from("bookings").select("client_id,status").in("client_id", clientIds).eq("status", "completed");
          if (cBks.data) cBks.data.forEach(function(b) {
            if (clientData[b.client_id]) clientData[b.client_id].completedCount++;
          });
        } catch(e) {}

        // 3. Get reviews given BY pros about these clients (reviewer_role=pro, booking links to client)
        try {
          var clientBks = await sb.from("bookings").select("id,client_id").in("client_id", clientIds);
          if (clientBks.data && clientBks.data.length) {
            var bkIds = clientBks.data.map(function(b) { return b.id; });
            var bkMap = {};
            clientBks.data.forEach(function(b) { bkMap[b.id] = b.client_id; });
            var revs = await sb.from("reviews").select("booking_id,rating").eq("reviewer_role", "pro").in("booking_id", bkIds);
            if (revs.data && revs.data.length) {
              var rData = {};
              revs.data.forEach(function(rv) {
                var cid = bkMap[rv.booking_id];
                if (cid) {
                  if (!rData[cid]) rData[cid] = { sum: 0, count: 0 };
                  rData[cid].sum += rv.rating;
                  rData[cid].count++;
                }
              });
              for (var k in rData) {
                if (clientData[k]) {
                  clientData[k].avgRating = (rData[k].sum / rData[k].count).toFixed(1);
                  clientData[k].revCount = rData[k].count;
                }
              }
            }
          }
        } catch(e) {}
      }

      inc.innerHTML = pend.map(function(b) {
        var safe = JSON.stringify(b).replace(/\\/g,"\\\\").replace(/"/g,"&quot;");
        var cd = clientData[b.client_id] || {};
        var cRating = parseFloat(cd.avgRating) || 0;
        var cRevCount = cd.revCount || 0;
        var cCompleted = cd.completedCount || 0;
        var cAva = cd.avatar
          ? "<img src=\"" + cd.avatar + "\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%\">"
          : "<span style=\"font-size:16px\">👤</span>";

        var ratingHtml = "";
        if (cRating > 0) {
          var yellowStars = Array(5).fill(0).map(function(_, i) {
            return "<span style=\"color:" + (i < Math.round(cRating) ? "#facc15" : "var(--bg3)") + ";font-size:16px\">★</span>";
          }).join("");
          ratingHtml = yellowStars + " <span style=\"font-size:13px;font-weight:600\">" + cRating + "</span>"
            + "<span style=\"font-size:11px;color:var(--mu);margin-left:3px\">(" + cRevCount + " reviews)</span>";
        } else if (cCompleted > 0) {
          ratingHtml = "<span style=\"font-size:12px;color:var(--mu)\">✅ " + cCompleted + " completed bookings · No reviews yet</span>";
        } else {
          ratingHtml = "<span style=\"font-size:12px;color:var(--mu)\">🆕 New client · No history</span>";
        }

        var nc = "";
        if (b.selected_nail_colors) {
          try {
            var c = typeof b.selected_nail_colors === "string" ? JSON.parse(b.selected_nail_colors) : b.selected_nail_colors;
            if (c && c.length) nc = "<div class=\"swatch-row\" style=\"margin-top:4px\">"
              + c.map(function(x) { return "<div class=\"swatch\" style=\"background:" + (x.hex_code || "#ccc") + "\" title=\"" + x.name + "\"></div>"; }).join("") + "</div>";
          } catch(e) {}
        }

        return "<div style=\"background:var(--bg2);border-radius:var(--r);padding:14px;margin-bottom:8px;border:1px solid var(--br)\">"
             + "<div style=\"display:flex;gap:12px;margin-bottom:10px\">"
             + "<div style=\"width:44px;height:44px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1.5px solid var(--br)\">" + cAva + "</div>"
             + "<div style=\"flex:1\">"
             + "<div style=\"font-weight:600;font-size:15px\">" + (b.client_name || "Client") + "</div>"
             + "<div style=\"margin-top:2px\">" + ratingHtml + "</div>"
             + "</div>"
             + "</div>"
             + "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px\">"
             + "<div>"
             + "<div style=\"font-weight:500;font-size:14px;color:var(--g)\">" + b.service_name + "</div>"
             + "<div style=\"font-size:13px;color:var(--mu);margin-top:2px\">" + (b.time_slot || "ASAP") + " · " + (b.district || "") + "</div>"
             + "</div>"
             + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700\">" + (b.service_price || 0) + "₾</div>"
             + "</div>"
             + nc
             + (b.design_url ? "<div style=\"margin-top:6px\"><img src=\"" + b.design_url + "\" style=\"width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid var(--br);cursor:pointer\" onclick=\"event.stopPropagation();lbOpen(['" + b.design_url + "'],0)\"> <span style=\"font-size:11px;color:var(--g)\">🎨 Design</span></div>" : "")
             + "<div style=\"display:flex;gap:6px;margin-top:10px\">"
             + "<button class=\"btn btn-g\" style=\"flex:1;justify-content:center;padding:10px;font-size:14px\" onclick=\"acceptBk('" + b.id + "')\">✓ Accept</button>"
             + "<button class=\"btn btn-red\" style=\"flex:1;justify-content:center;padding:10px;font-size:14px\" onclick=\"chBkStatus('" + b.id + "','cancelled','pro')\">✕ Decline</button>"
             + "<button class=\"btn btn-o\" style=\"padding:10px 14px;font-size:13px\" onclick=\"openBkDetail('" + safe + "','pro')\">Details</button>"
             + "</div></div>";
      }).join("");
    }
  }

  // All bookings table
  var pb2 = ge("pBkBody");
  if (pb2) {
    pb2.innerHTML = !bks.length
      ? "<tr><td colspan=\"6\" style=\"text-align:center;padding:18px;color:var(--mu)\">No bookings yet.</td></tr>"
      : bks.map(function(b) {
          var safe = JSON.stringify(b).replace(/\\/g,"\\\\").replace(/"/g,"&quot;");
          var statusCol = sBadge(b.status);
          if (b.status === "arrived") statusCol += "<div style=\"font-size:10px;color:#a16207;margin-top:2px\">⏳ Awaiting client</div>";
          return "<tr>"
               + "<td>" + (b.client_name || "—") + "</td>"
               + "<td>" + (b.service_name || "—") + "</td>"
               + "<td>" + (b.time_slot || "ASAP") + "</td>"
               + "<td>" + Math.round((b.total || 0) * 0.95) + "₾</td>"
               + "<td>" + statusCol + "</td>"
               + "<td><button class=\"btn-sm btn-gh\" style=\"font-size:11px\" onclick=\"openBkDetail('" + safe + "','pro')\">Details</button></td>"
               + "</tr>";
        }).join("");
  }
}

async function saveProProfile() {
  var name  = ge("pEditName").value.trim();
  var spec  = ge("pEditSpec").value;
  var bio   = ge("pEditBio").value.trim();
  var area  = ge("pEditArea").value;
  var price = parseInt(ge("pEditPrice").value) || 0;
  var years = parseInt(ge("pEditYears").value) || null;
  var buffer = parseInt(ge("pEditBuffer").value) || 60;
  if (buffer < 30) buffer = 30; if (buffer > 90) buffer = 90;
  if (!name) { toast("Name required", "err"); return; }
  var proId = profile ? profile.pro_id : null;

  // Auto-recover: check if a pro record already exists for this user
  if (!proId && user) {
    try {
      var check = await sb.from("professionals").select("id").eq("user_id", user.id).single();
      if (check.data && check.data.id) {
        proId = check.data.id;
        if (profile) profile.pro_id = proId;
        await sb.from("profiles").update({ pro_id: proId }).eq("id", user.id);
      }
    } catch(e) {}
  }

  try {
    var r;
    if (proId) {
      r = await sb.from("professionals").update({
        name: name, specialty: spec, bio: bio, area: area, price_from: price, years_experience: years, travel_buffer: buffer, status: "pending"
      }).eq("id", proId).select();
    } else {
      r = await sb.from("professionals").insert({
        user_id: user.id, name: name, specialty: spec, bio: bio, area: area, price_from: price, years_experience: years, travel_buffer: buffer, status: "pending"
      }).select().single();
      if (r.data && r.data.id) {
        proId = r.data.id;
        await sb.from("profiles").update({ pro_id: proId }).eq("id", user.id);
        if (profile) profile.pro_id = proId;
      }
    }
    if (r.error) {
      toast("Error: " + r.error.message, "err");
      return;
    }
    toast("Submitted for approval!", "ok");
    loadProDash();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function uploadProAvatar(input) {
  if (!input.files || !input.files[0] || !user) return;
  var url = await uploadAvatar(input.files[0], user.id, "pAvaEdit", "pAvaEditEmoji", "pAvaDisp");
  if (url && profile && profile.pro_id) {
    try { await sb.from("professionals").update({ avatar_url: url }).eq("id", profile.pro_id); } catch(e) {}
  }
}

// ── PORTFOLIO ─────────────────────────────────────────────────
async function uploadPortfolio(input) {
  if (!input.files || !input.files.length || !profile || !profile.pro_id) {
    toast("Save your profile first", "err"); return;
  }
  var files = Array.from(input.files).slice(0, 10);
  toast("Uploading " + files.length + " image(s)…");
  for (var i = 0; i < files.length; i++) {
    try {
      var ext  = files[i].name.split(".").pop();
      var path = "portfolio/" + profile.pro_id + "/" + Date.now() + "_" + i + "." + ext;
      var up   = await sb.storage.from("portfolio-images").upload(path, files[i], { upsert: true });
      if (up.error) throw up.error;
      var url  = sb.storage.from("portfolio-images").getPublicUrl(path).data.publicUrl;
      await sb.from("portfolio_images").insert({ pro_id: profile.pro_id, url: url });
    } catch(e) { toast("Upload failed: " + e.message, "err"); }
  }
  toast("Portfolio updated!", "ok");
  loadProPortfolio();
}

async function loadProPortfolio() {
  var grid = ge("proPortGrid");
  if (!grid || !profile || !profile.pro_id) return;
  try {
    var r = await sb.from("portfolio_images").select("*").eq("pro_id", profile.pro_id).order("created_at");
    var imgs = r.data || [];
    grid.innerHTML = imgs.map(function(img) {
      return "<div class=\"port-thumb\">"
           + "<img src=\"" + img.url + "\" alt=\"Portfolio\" loading=\"lazy\">"
           + "<button class=\"port-del\" onclick=\"deletePortImg('" + img.id + "','" + img.url + "')\">✕</button>"
           + "</div>";
    }).join("")
    + (imgs.length < 12 ? "<label class=\"port-add\"><input type=\"file\" accept=\"image/*\" multiple onchange=\"uploadPortfolio(this)\"><span style=\"font-size:22px\">+</span><span>Add Photo</span></label>" : "");
  } catch(e) {
    grid.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Run setup SQL to enable portfolio.</p>";
  }
}

async function deletePortImg(id, url) {
  if (!confirm("Remove this photo?")) return;
  try {
    await sb.from("portfolio_images").delete().eq("id", id);
    var m = url.match(/portfolio-images\/(.+)$/);
    if (m) await sb.storage.from("portfolio-images").remove([m[1]]);
    toast("Photo removed.");
    loadProPortfolio();
  } catch(e) { toast("Error removing photo", "err"); }
}

// ── SERVICES ──────────────────────────────────────────────────
async function loadProSvcs() {
  var el = ge("pSvcList"); if (!el) return;
  var proId = profile ? profile.pro_id : null;

  // Auto-recover pro_id if missing
  if (!proId && user) {
    try {
      var pr = await sb.from("professionals").select("id").eq("user_id", user.id).single();
      if (pr.data && pr.data.id) {
        proId = pr.data.id;
        if (profile) profile.pro_id = proId;
        await sb.from("profiles").update({ pro_id: proId }).eq("id", user.id);
      }
    } catch(e) {}
  }

  if (!proId) {
    el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No professional profile linked. Go to <strong>Edit Profile</strong>, fill in your details, and click <strong>Submit</strong>.</p>";
    return;
  }
  try {
    var r = await sb.from("services").select("*").eq("pro_id", proId).order("created_at");
    if (r.error) {
      el.innerHTML = "<p style=\"color:#ef4444;font-size:14px\">Error: " + r.error.message + "</p>"
        + "<p style=\"color:var(--mu);font-size:12px;margin-top:5px\">Make sure the setup SQL has been run in Supabase.</p>";
      return;
    }
    var svcs = r.data || [];
    el.innerHTML = !svcs.length
      ? "<p style=\"color:var(--mu);font-size:14px\">No services yet. Click <strong>+ Add</strong> above to create your first service.</p>"
      : svcs.map(function(s) {
          return "<div class=\"svc-item\">"
               + "<div><div style=\"font-size:14px;font-weight:500\">" + s.name + "</div>"
               + "<div style=\"font-size:12px;color:var(--mu)\">" + (s.description || "") + " · " + s.duration + " min</div></div>"
               + "<div style=\"text-align:right;display:flex;align-items:center;gap:7px\">"
               + "<div style=\"font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600\">" + s.price + "₾</div>"
               + "<button class=\"btn-sm btn-gh\" onclick=\"openSvcModal('" + s.id + "')\">Edit</button>"
               + "<button class=\"btn-sm btn-no\" onclick=\"deleteSvc('" + s.id + "')\">Del</button>"
               + "</div></div>";
        }).join("");
  } catch(e) {
    el.innerHTML = "<p style=\"color:#ef4444;font-size:14px\">Error: " + e.message + "</p>";
  }
}

async function openSvcModal(id) {
  ge("svcId").value = id || "";
  ge("svcModalTitle").textContent = id ? "Edit Service" : "Add Service";
  if (!id) {
    ge("sN").value = ""; ge("sD").value = ""; ge("sP").value = ""; ge("sDr").value = "60";
  } else {
    // Load existing service data for editing
    try {
      var r = await sb.from("services").select("*").eq("id", id).single();
      if (r.data) {
        ge("sN").value  = r.data.name || "";
        ge("sD").value  = r.data.description || "";
        ge("sP").value  = r.data.price || "";
        ge("sDr").value = r.data.duration || "60";
      }
    } catch(e) {
      ge("sN").value = ""; ge("sD").value = ""; ge("sP").value = ""; ge("sDr").value = "60";
    }
  }
  openM("svc");
}

async function saveSvc() {
  var id   = ge("svcId").value;
  var name = ge("sN").value.trim();
  var desc = ge("sD").value.trim();
  var price= parseInt(ge("sP").value) || 0;
  var dur  = parseInt(ge("sDr").value) || 60;
  if (!name) { toast("Service name is required", "err"); return; }
  if (!price) { toast("Price is required", "err"); return; }

  // Get pro_id — try profile first, then look it up
  var proId = profile ? profile.pro_id : null;
  if (!proId && user) {
    try {
      var pr = await sb.from("professionals").select("id").eq("user_id", user.id).single();
      if (pr.data && pr.data.id) {
        proId = pr.data.id;
        if (profile) profile.pro_id = proId;
        // Fix the profiles table too
        await sb.from("profiles").update({ pro_id: proId }).eq("id", user.id);
      }
    } catch(e) {}
  }
  if (!proId) {
    toast("No professional profile found. Go to Edit Profile and save first.", "err");
    return;
  }

  try {
    var r;
    if (id) {
      r = await sb.from("services").update({
        name: name, description: desc, price: price, duration: dur
      }).eq("id", id).select();
    } else {
      r = await sb.from("services").insert({
        pro_id: proId, name: name, description: desc, price: price, duration: dur
      }).select();
    }
    if (r.error) {
      toast("Error: " + r.error.message, "err");
      return;
    }
    toast("Service saved!", "ok");
    closeM("svc");
    loadProSvcs();
  } catch(e) {
    toast("Error saving service: " + e.message, "err");
  }
}

async function deleteSvc(id) {
  if (!confirm("Delete this service?")) return;
  try { await sb.from("services").delete().eq("id", id); toast("Deleted."); loadProSvcs(); }
  catch(e) { toast("Error", "err"); }
}

// ── NAIL COLORS ───────────────────────────────────────────────
async function loadProColors() {
  var el = ge("pColorList"); if (!el) return;
  var proId = profile ? profile.pro_id : null;
  if (!proId) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Set up profile first.</p>"; return; }
  if (settings.nail_colors_enabled === false) {
    el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Nail colors feature is disabled by admin.</p>"; return;
  }
  try {
    var r = await sb.from("nail_colors").select("*").eq("pro_id", proId).order("created_at");
    var colors = r.data || [];
    if (!colors.length) {
      el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No colors yet. Add your nail color catalog.</p>";
      return;
    }
    el.innerHTML = "<div class=\"swatch-row\" style=\"margin-bottom:14px\">"
      + colors.map(function(c) {
          return "<div class=\"swatch\" style=\"background:" + c.hex_code + "\" title=\"" + c.name + "\"></div>";
        }).join("")
      + "</div>"
      + "<div class=\"tw\"><table class=\"tbl\"><thead><tr><th>Swatch</th><th>Name</th><th>Brand</th><th>Code</th><th></th></tr></thead><tbody>"
      + colors.map(function(c) {
          return "<tr>"
               + "<td><div class=\"swatch\" style=\"background:" + c.hex_code + ";cursor:default\"></div></td>"
               + "<td>" + c.name + "</td>"
               + "<td>" + (c.brand || "—") + "</td>"
               + "<td>" + (c.code || "—") + "</td>"
               + "<td style=\"display:flex;gap:5px\">"
               + "<button class=\"btn-sm btn-gh\" onclick=\"openColorModal('" + c.id + "')\">Edit</button>"
               + "<button class=\"btn-sm btn-no\" onclick=\"deleteColor('" + c.id + "')\">Del</button>"
               + "</td></tr>";
        }).join("")
      + "</tbody></table></div>";
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Run setup SQL first.</p>"; }
}

async function openColorModal(id) {
  ge("colorId").value = id || "";
  ge("colorModalTitle").textContent = id ? "Edit Nail Color" : "Add Nail Color";
  if (!id) {
    ge("colorName").value = ""; ge("colorHex").value = "#D4AF37"; ge("colorBrand").value = ""; ge("colorCode").value = "";
  } else {
    try {
      var r = await sb.from("nail_colors").select("*").eq("id", id).single();
      if (r.data) {
        ge("colorName").value  = r.data.name || "";
        ge("colorHex").value   = r.data.hex_code || "#D4AF37";
        ge("colorBrand").value = r.data.brand || "";
        ge("colorCode").value  = r.data.code || "";
      }
    } catch(e) {
      ge("colorName").value = ""; ge("colorHex").value = "#D4AF37"; ge("colorBrand").value = ""; ge("colorCode").value = "";
    }
  }
  openM("color");
}

async function saveColor() {
  var id    = ge("colorId").value;
  var name  = ge("colorName").value.trim();
  var hex   = ge("colorHex").value;
  var brand = ge("colorBrand").value.trim() || null;
  var code  = ge("colorCode").value.trim() || null;
  if (!name) { toast("Color name required", "err"); return; }
  var proId = profile ? profile.pro_id : null;
  if (!proId && user) {
    try {
      var pr = await sb.from("professionals").select("id").eq("user_id", user.id).single();
      if (pr.data) { proId = pr.data.id; if (profile) profile.pro_id = proId; }
    } catch(e) {}
  }
  if (!proId) { toast("Save profile first in Edit Profile tab", "err"); return; }
  try {
    var r;
    if (id) r = await sb.from("nail_colors").update({ name: name, hex_code: hex, brand: brand, code: code }).eq("id", id).select();
    else    r = await sb.from("nail_colors").insert({ pro_id: proId, name: name, hex_code: hex, brand: brand, code: code }).select();
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast("Color saved!", "ok");
    closeM("color");
    loadProColors();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deleteColor(id) {
  if (!confirm("Remove this color?")) return;
  try { await sb.from("nail_colors").delete().eq("id", id); toast("Removed."); loadProColors(); }
  catch(e) { toast("Error", "err"); }
}

// ── PRO REVIEWS ───────────────────────────────────────────────
async function loadProRevs() {
  var el = ge("pRevList"); if (!el) return;
  var proId = profile ? profile.pro_id : null;
  if (!proId) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No professional profile.</p>"; return; }
  try {
    var r = await sb.from("reviews").select("*").eq("pro_id", proId).eq("visible", true).order("created_at", { ascending: false });
    var revs = r.data || [];
    if (!revs.length) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No reviews yet.</p>"; return; }
    el.innerHTML = revs.map(function(rv) {
      var stars = Array(5).fill(0).map(function(_, i) {
        return "<span style=\"color:" + (i < rv.rating ? "#facc15" : "var(--bg3)") + "\">★</span>";
      }).join("");
      return "<div class=\"rev-item\">"
           + "<div style=\"display:flex;justify-content:space-between;margin-bottom:3px\">"
           + "<div>" + stars + "</div>"
           + "<div style=\"font-size:11px;color:var(--mu)\">" + new Date(rv.created_at).toLocaleDateString() + "</div>"
           + "</div>"
           + (rv.comment ? "<p style=\"font-size:13px;color:var(--mu)\">" + rv.comment + "</p>" : "<p style=\"font-size:13px;color:var(--mu);font-style:italic\">No comment</p>")
           + "</div>";
    }).join("");
  } catch(e) { el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Could not load reviews.</p>"; }
}



// ── PRO CALENDAR ─────────────────────────────────────────────
// ── PRO CALENDAR ─────────────────────────────────────────────
var proCalDate = new Date();
var proCalSelDate = null;
var proCalBookings = [];
var proCalTasks = [];
var proCalDaysOff = [];
var proCalHoursOff = [];

function proCalNav(dir) {
  proCalDate.setMonth(proCalDate.getMonth() + dir);
  renderProCal();
}

async function renderProCal() {
  var proId = profile ? profile.pro_id : null;
  if (!proId) return;

  var now = new Date();
  var y = proCalDate.getFullYear(), m = proCalDate.getMonth();
  var monthEl = ge("proCalMonth");
  if (monthEl) monthEl.textContent = proCalDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Fetch bookings for this month
  var start = new Date(y, m, 1).toISOString();
  var end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  try {
    var br = await sb.from("bookings").select("*").eq("pro_id", proId).gte("created_at", start).lte("created_at", end);
    proCalBookings = br.data || [];
  } catch(e) { proCalBookings = []; }

  // Fetch private tasks
  try {
    var tr = await sb.from("pro_tasks").select("*").eq("pro_id", proId).gte("task_date", y + "-" + String(m+1).padStart(2,"0") + "-01").lte("task_date", y + "-" + String(m+1).padStart(2,"0") + "-31");
    proCalTasks = tr.data || [];
  } catch(e) { proCalTasks = []; }

  // Fetch days off
  try {
    var dr = await sb.from("pro_days_off").select("*").eq("pro_id", proId).gte("off_date", y + "-" + String(m+1).padStart(2,"0") + "-01").lte("off_date", y + "-" + String(m+1).padStart(2,"0") + "-31");
    proCalDaysOff = (dr.data || []).map(function(d) { return d.off_date; });
  } catch(e) { proCalDaysOff = []; }

  // Fetch hours off
  try {
    var hr = await sb.from("pro_hours_off").select("*").eq("pro_id", proId).gte("off_date", y + "-" + String(m+1).padStart(2,"0") + "-01").lte("off_date", y + "-" + String(m+1).padStart(2,"0") + "-31");
    proCalHoursOff = hr.data || [];
  } catch(e) { proCalHoursOff = []; }

  renderCalGrid("proCalGrid", y, m, now, proCalBookings, proCalTasks, proCalDaysOff, "onProCalSelect");
  if (proCalSelDate) renderProCalEvents(proCalSelDate);
}

function onProCalSelect(dateStr) {
  proCalSelDate = dateStr;
  renderProCal();
  renderProCalEvents(dateStr);
}

function renderCalGrid(gridId, y, m, now, bookings, tasks, daysOff, callbackName) {
  var grid = ge(gridId); if (!grid) return;
  var firstDay = new Date(y, m, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var today = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");

  var html = "";
  for (var i = 0; i < firstDay; i++) html += "<div></div>";
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = y + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
    var isPast = ds < today;
    var isToday = ds === today;
    var isSel = ds === proCalSelDate;
    var isOff = daysOff.indexOf(ds) > -1;
    var hasBk = bookings.some(function(b) { return (b.time_slot || "").indexOf(ds) > -1 || (b.created_at || "").substring(0,10) === ds; });
    var hasTask = tasks.some(function(t) { return t.task_date === ds; });
    var cls = "cal-day";
    if (isPast) cls += " past";
    if (isToday) cls += " today";
    if (isSel) cls += " sel";
    if (isOff) cls += " off";
    if (hasBk) cls += " has-bk";
    if (hasTask) cls += " has-task";
    html += "<div class=\"" + cls + "\" onclick=\"" + callbackName + "('" + ds + "')\">" + d + "</div>";
  }
  grid.innerHTML = html;
}

function renderProCalEvents(dateStr) {
  var el = ge("proCalEvents"); if (!el) return;
  var title = ge("proCalDateTitle");
  if (title) title.textContent = new Date(dateStr + "T00:00:00").toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });

  var isDayOff = proCalDaysOff.indexOf(dateStr) > -1;
  var hoursOffForDate = proCalHoursOff.filter(function(h) { return h.off_date === dateStr; }).map(function(h) { return h.off_hour; });

  // Hour grid for availability
  var hours = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
  var hourGrid = "<div style=\"margin-bottom:12px\">"
    + "<div style=\"font-size:12px;font-weight:600;margin-bottom:6px;color:var(--tx)\">Hourly Availability <span style=\"font-weight:400;color:var(--mu)\">(tap to toggle)</span></div>"
    + "<div class=\"ts-grid\">";
  hours.forEach(function(h) {
    var isOff = isDayOff || hoursOffForDate.indexOf(h) > -1;
    // Check if there's a booking at this hour
    var hasBooking = proCalBookings.some(function(b) {
      var bkDate = (b.time_slot || "").substring(0, 10);
      var bkTime = (b.time_slot || "").substring(11, 16);
      return bkDate === dateStr && bkTime === h;
    });
    var cls = "ts";
    var style = "padding:7px 4px;font-size:12px;";
    if (hasBooking) {
      cls += " booked";
      style += "background:var(--g);color:#1a1a1a;border-color:var(--g);opacity:.7;cursor:default;";
    } else if (isOff) {
      cls += " off";
      style += "background:#ef4444;color:#fff;border-color:#ef4444;";
    }
    var onclick = hasBooking ? "" : "onclick=\"toggleHourOff('" + dateStr + "','" + h + "')\"";
    hourGrid += "<div class=\"" + cls + "\" style=\"" + style + "\" " + onclick + ">" + h + "</div>";
  });
  hourGrid += "</div></div>";

  // Events list
  var evs = [];
  proCalBookings.forEach(function(b) {
    var bkDate = (b.time_slot || b.created_at || "").substring(0, 10);
    if (bkDate === dateStr || (b.created_at || "").substring(0, 10) === dateStr) {
      evs.push({ color: "var(--g)", text: (b.time_slot || "ASAP") + " — " + (b.client_name || "Client") + " · " + (b.service_name || ""), type: "booking" });
    }
  });
  proCalTasks.forEach(function(t) {
    if (t.task_date === dateStr) {
      evs.push({ color: "#7e22ce", text: (t.task_time || "") + " " + t.title + (t.notes ? " — " + t.notes : ""), type: "task", id: t.id });
    }
  });
  if (isDayOff) {
    evs.unshift({ color: "#ef4444", text: "Entire day marked unavailable", type: "off" });
  } else if (hoursOffForDate.length) {
    evs.unshift({ color: "#ef4444", text: hoursOffForDate.length + " hour(s) blocked", type: "info" });
  }

  var evHtml = evs.length ? evs.map(function(ev) {
    var del = ev.type === "task" ? " <button class=\"btn-sm btn-no\" style=\"margin-left:auto;font-size:10px\" onclick=\"deleteProTask('" + ev.id + "')\">✕</button>" : "";
    return "<div class=\"cal-ev\"><div class=\"cal-ev-dot\" style=\"background:" + ev.color + "\"></div><span style=\"flex:1\">" + ev.text + "</span>" + del + "</div>";
  }).join("") : "<p style=\"color:var(--mu);font-size:13px\">No events on this day.</p>";

  el.innerHTML = hourGrid + evHtml;
}

// ── PRO TASKS ────────────────────────────────────────────────
function openProTaskModal() {
  if (!proCalSelDate) { toast("Select a date on the calendar first", "err"); return; }
  ge("taskDate").value = proCalSelDate;
  ge("taskTime").value = "";
  ge("taskTitle").value = "";
  ge("taskNotes").value = "";
  openM("protask");
}

async function saveProTask() {
  var title = ge("taskTitle").value.trim();
  var date = ge("taskDate").value;
  var time = ge("taskTime").value || null;
  var notes = ge("taskNotes").value.trim() || null;
  if (!title || !date) { toast("Title and date required", "err"); return; }
  var proId = profile ? profile.pro_id : null;
  if (!proId) { toast("Profile not set up", "err"); return; }
  try {
    var r = await sb.from("pro_tasks").insert({ pro_id: proId, title: title, task_date: date, task_time: time, notes: notes });
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast("Task added!", "ok");
    closeM("protask");
    renderProCal();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function deleteProTask(id) {
  if (!confirm("Delete this task?")) return;
  try { await sb.from("pro_tasks").delete().eq("id", id); toast("Deleted."); renderProCal(); }
  catch(e) { toast("Error", "err"); }
}

// ── PRO DAYS OFF ─────────────────────────────────────────────
async function toggleProDayOff() {
  if (!proCalSelDate) { toast("Select a date first", "err"); return; }
  var proId = profile ? profile.pro_id : null;
  if (!proId) return;
  var isOff = proCalDaysOff.indexOf(proCalSelDate) > -1;
  try {
    if (isOff) {
      await sb.from("pro_days_off").delete().eq("pro_id", proId).eq("off_date", proCalSelDate);
      toast("Marked as available.");
    } else {
      await sb.from("pro_days_off").insert({ pro_id: proId, off_date: proCalSelDate });
      toast("Marked as unavailable.");
    }
    renderProCal();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── PRO HOURS OFF ─────────────────────────────────────────────
async function toggleHourOff(dateStr, hour) {
  var proId = profile ? profile.pro_id : null;
  if (!proId) return;

  // If whole day is off, toggling individual hours removes the day-off and sets all OTHER hours as off
  var isDayOff = proCalDaysOff.indexOf(dateStr) > -1;
  if (isDayOff) {
    // Remove day off
    await sb.from("pro_days_off").delete().eq("pro_id", proId).eq("off_date", dateStr);
    // Add all hours except the tapped one
    var allHours = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
    var rows = allHours.filter(function(h) { return h !== hour; }).map(function(h) {
      return { pro_id: proId, off_date: dateStr, off_hour: h };
    });
    if (rows.length) await sb.from("pro_hours_off").insert(rows);
    toast(hour + " marked available.");
    renderProCal();
    return;
  }

  var isOff = proCalHoursOff.some(function(h) { return h.off_date === dateStr && h.off_hour === hour; });
  try {
    if (isOff) {
      await sb.from("pro_hours_off").delete().eq("pro_id", proId).eq("off_date", dateStr).eq("off_hour", hour);
      toast(hour + " marked available.");
    } else {
      await sb.from("pro_hours_off").insert({ pro_id: proId, off_date: dateStr, off_hour: hour });
      toast(hour + " marked unavailable.");
    }
    renderProCal();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── ADMIN CALENDAR VIEWER ────────────────────────────────────
