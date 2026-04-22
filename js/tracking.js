// ═══════════════════════════════════════════════════════════════
//  MODY — Floating Tracker & Live Location
//  Load order: 12 (depends on: config.js, ui.js)
// ═══════════════════════════════════════════════════════════════

var trackerMinimized = false;

function toggleTrackerMin() {
  trackerMinimized = !trackerMinimized;
  var el = ge("fTracker");
  if (el) {
    var body = el.querySelector(".ft-body");
    var toggle = el.querySelector(".ft-toggle");
    if (trackerMinimized) {
      if (body) body.style.display = "none";
      if (toggle) toggle.style.display = "none";
      el.innerHTML = "<div onclick=\"toggleTrackerMin()\" style=\"cursor:pointer;padding:6px 14px;font-size:13px;display:flex;align-items:center;gap:6px;color:var(--mu)\">📋 <span style=\"font-weight:600\">" + (el.querySelectorAll(".ft-pill").length || "0") + "</span> active ▲</div>" + el.innerHTML;
    } else {
      renderTracker();
    }
  }
}

function startTracker() {
  renderTracker();
  if (ftInterval) clearInterval(ftInterval);
  ftInterval = setInterval(renderTracker, 3000);
}

function toggleTracker() {
  ftCollapsed = !ftCollapsed;
  var body = document.querySelector(".ft-body");
  if (body) body.classList.toggle("collapsed", ftCollapsed);
  var arrow = ge("ftArrow");
  if (arrow) arrow.textContent = ftCollapsed ? "▲" : "▼";
}

async function renderTracker() {
  var el = ge("fTracker"); if (!el || !user || !profile) { if (el) el.innerHTML = ""; return; }

  var bks = [];
  try {
    var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress"];
    if (profile.role === "client") {
      var r = await sb.from("bookings").select("*").eq("client_id", user.id).in("status", activeStatuses).order("created_at", { ascending: false }).limit(5);
      bks = r.data || [];
    } else if (profile.role === "pro" && profile.pro_id) {
      var r2 = await sb.from("bookings").select("*").eq("pro_id", profile.pro_id).in("status", activeStatuses).order("created_at", { ascending: false }).limit(5);
      bks = r2.data || [];
    }
  } catch(e) { bks = []; }

  if (!bks.length) { el.innerHTML = ""; return; }

  var dotColors = { pending:"#a16207", accepted:"#15803d", on_the_way:"#7e22ce", arrived:"#22c55e", in_progress:"#3b82f6" };

  var pills = bks.map(function(b) {
    var safe = JSON.stringify(b).replace(/\\/g,"\\\\").replace(/"/g,"&quot;");
    var role = profile.role === "pro" ? "pro" : "client";
    var who = profile.role === "client" ? (b.pro_name || "Pro") : (b.client_name || "Client");
    var statusText = ST_LABEL[b.status] ? ST_LABEL[b.status]() : b.status.replace(/_/g," ");
    var time = b.time_slot || "ASAP";

    var actions = "";
    if (profile.role === "pro") {
      if (b.status === "pending")
        actions = "<div class=\"ft-actions\">"
          + "<button class=\"ft-act-green\" onclick=\"event.stopPropagation();acceptBk('" + b.id + "')\">✓ Accept</button>"
          + "<button class=\"ft-act-red\" onclick=\"event.stopPropagation();chBkStatus('" + b.id + "','cancelled','pro')\">✕ Decline</button>"
          + "</div>";
      if (b.status === "accepted")
        actions = "<div class=\"ft-actions\"><button class=\"ft-act-purple\" onclick=\"event.stopPropagation();chBkStatus('" + b.id + "','on_the_way','pro')\">🚗 On the Way</button></div>";
      if (b.status === "on_the_way")
        actions = "<div class=\"ft-actions\"><button class=\"ft-act-blue\" onclick=\"event.stopPropagation();chBkStatus('" + b.id + "','arrived','pro')\">📍 I've Arrived</button></div>";
      if (b.status === "in_progress")
        actions = "<div class=\"ft-actions\"><button class=\"ft-act-green\" onclick=\"event.stopPropagation();chBkStatus('" + b.id + "','completed','pro')\">✓ Complete</button></div>";
    }
    if (profile.role === "client") {
      if (b.status === "arrived")
        actions = "<div class=\"ft-actions\"><button class=\"ft-act-green\" onclick=\"event.stopPropagation();confirmArrival('" + b.id + "')\">✓ Confirm Arrival</button></div>";
    }

    return "<div class=\"ft-pill\" onclick=\"openBkDetail('" + safe + "','" + role + "')\">"
      + "<div class=\"ft-top\">"
      + "<div class=\"ft-dot\" style=\"background:" + (dotColors[b.status] || "var(--g)") + "\"></div>"
      + "<div style=\"flex:1;min-width:0\">"
      + "<div class=\"ft-name\">" + who + " — " + (b.service_name || "") + "</div>"
      + "<div class=\"ft-status\">" + statusText + " · " + time + "</div>"
      + "</div>"
      + "<div style=\"font-size:11px;color:var(--mu)\">▸</div>"
      + "</div>" + actions + "</div>";
  }).join("");

  if (trackerMinimized) {
    el.innerHTML = "<div onclick=\"toggleTrackerMin()\" style=\"cursor:pointer;padding:6px 14px;font-size:13px;display:flex;align-items:center;gap:6px;color:var(--mu)\">📋 <span style=\"font-weight:600\">" + bks.length + "</span> active ▲</div>";
    return;
  }

  el.innerHTML = "<div class=\"ft-toggle\" onclick=\"toggleTracker()\">"
    + "<span>📋 Active Bookings</span>"
    + "<div style=\"display:flex;align-items:center;gap:8px\">"
    + "<span class=\"ft-count\">" + bks.length + "</span>"
    + "<span id=\"ftArrow\" style=\"font-size:10px\">" + (ftCollapsed ? "▲" : "▼") + "</span>"
    + "<span onclick=\"event.stopPropagation();toggleTrackerMin()\" style=\"cursor:pointer;font-size:12px;margin-left:4px\" title=\"Minimize\">─</span>"
    + "</div></div>"
    + "<div class=\"ft-body" + (ftCollapsed ? " collapsed" : "") + "\">" + pills + "</div>";
}

// ── UNIQUE ID DISPLAY ────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
//  PART 10: LIVE MAP TRACKING
// ═══════════════════════════════════════════════════════════════

// ── TBILISI CENTER (fallback) ────────────────────────────────
var TBILISI = [41.7151, 44.8271];

// ── PRO LOCATION SHARING ─────────────────────────────────────
var proLocWatchId   = null;
var proLocBookingId = null;
var proLocInterval  = null;
var proLocLatest    = null;

function startLocSharing(bookingId) {
  if (!navigator.geolocation) {
    toast("Geolocation not supported by your browser", "err"); return;
  }
  proLocBookingId = bookingId;
  toast("Starting location sharing…");

  // Watch position
  proLocWatchId = navigator.geolocation.watchPosition(
    function(pos) {
      proLocLatest = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    },
    function(err) {
      toast("Location error: " + err.message, "err");
      stopLocSharing();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  // Push to Supabase every 5 seconds
  proLocInterval = setInterval(function() {
    if (proLocLatest && proLocBookingId && profile && profile.pro_id) {
      sb.from("pro_locations").upsert({
        booking_id: proLocBookingId,
        pro_id: profile.pro_id,
        lat: proLocLatest.lat,
        lng: proLocLatest.lng,
        updated_at: new Date().toISOString()
      }, { onConflict: "booking_id" }).then(function() {}).catch(function() {});
    }
  }, 5000);

  if (typeof loadProDash === "function") loadProDash(); // refresh UI to show "sharing" state
}

function stopLocSharing() {
  if (proLocWatchId !== null) {
    navigator.geolocation.clearWatch(proLocWatchId);
    proLocWatchId = null;
  }
  if (proLocInterval) {
    clearInterval(proLocInterval);
    proLocInterval = null;
  }
  // Delete location record
  if (proLocBookingId) {
    sb.from("pro_locations").delete().eq("booking_id", proLocBookingId).then(function() {}).catch(function() {});
  }
  proLocBookingId = null;
  proLocLatest = null;
  if (typeof loadProDash === "function") loadProDash();
}

// ── CLIENT MAP TRACKING ──────────────────────────────────────
var clientMaps   = {};
var clientMapSub = {};

function initClientTrackMap(containerId, bookingId, proId) {
  var el = ge(containerId);
  if (!el || !el.offsetParent) return; // not visible

  // Destroy previous map on same container
  if (clientMaps[containerId]) {
    clientMaps[containerId].remove();
    delete clientMaps[containerId];
  }

  var map = L.map(containerId, { zoomControl: false }).setView(TBILISI, 13);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OSM"
  }).addTo(map);

  clientMaps[containerId] = map;

  // Custom pro marker
  var proIcon = L.divIcon({
    html: "<div style=\"background:#7e22ce;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(126,34,206,.5);border:2px solid #fff\">🚗</div>",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: ""
  });

  var proMarker = null;

  // Try to load initial position
  sb.from("pro_locations").select("*").eq("booking_id", bookingId).maybeSingle()
    .then(function(r) {
      if (r.data && r.data.lat && r.data.lng) {
        var pos = [r.data.lat, r.data.lng];
        proMarker = L.marker(pos, { icon: proIcon }).addTo(map).bindPopup("Your professional");
        map.setView(pos, 15);
      } else {
        // No location yet — show Tbilisi with a note
        L.marker(TBILISI).addTo(map).bindPopup("Waiting for location…").openPopup();
      }
    })
    .catch(function() {});

  // Subscribe to realtime updates
  if (clientMapSub[containerId]) {
    sb.removeChannel(clientMapSub[containerId]);
  }
  clientMapSub[containerId] = sb.channel("track:" + bookingId)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "pro_locations",
      filter: "booking_id=eq." + bookingId
    }, function(payload) {
      var loc = payload.new;
      if (!loc || !loc.lat || !loc.lng) return;
      var pos = [loc.lat, loc.lng];
      if (proMarker) {
        proMarker.setLatLng(pos);
      } else {
        proMarker = L.marker(pos, { icon: proIcon }).addTo(map).bindPopup("Your professional");
      }
      map.panTo(pos);
    })
    .subscribe();

  // Fix Leaflet render issue inside hidden/dynamic containers
  setTimeout(function() { map.invalidateSize(); }, 200);
}

function cleanupClientMaps() {
  for (var key in clientMaps) {
    if (clientMaps[key]) clientMaps[key].remove();
  }
  clientMaps = {};
  for (var key2 in clientMapSub) {
    if (clientMapSub[key2]) sb.removeChannel(clientMapSub[key2]);
  }
  clientMapSub = {};
}

