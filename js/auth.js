// ═══════════════════════════════════════════════════════════════
//  MODY — Authentication & User Management
//  Load order: 4 (depends on: config.js, i18n.js, ui.js)
// ═══════════════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────────────
var user        = null;
var profile     = null;

// ── PROFILE LOAD ──────────────────────────────────────────────
async function loadProfile(u) {
  user = u;
  try {
    var r = await sb.from("profiles").select("*").eq("id", u.id).single();
    if (r.data) {
      profile = r.data;
      // Auto-recover pro_id if profile is pro but pro_id is missing
      if (profile.role === "pro" && !profile.pro_id) {
        try {
          var pr = await sb.from("professionals").select("id").eq("user_id", u.id).single();
          if (pr.data && pr.data.id) {
            profile.pro_id = pr.data.id;
            await sb.from("profiles").update({ pro_id: pr.data.id }).eq("id", u.id);
          }
        } catch(e2) {}
      }
      return;
    }
  } catch(e) {}
  // Fallback: build from auth metadata
  var m = u.user_metadata || {};
  var role = m.role || "client";
  profile = {
    id: u.id, email: u.email,
    full_name: m.full_name || u.email.split("@")[0],
    role: role,
    phone: m.phone || "", pro_id: null, avatar_url: null
  };
  // If pro, try to find their pro record
  if (role === "pro") {
    try {
      var pr2 = await sb.from("professionals").select("id").eq("user_id", u.id).single();
      if (pr2.data) profile.pro_id = pr2.data.id;
    } catch(e3) {}
  }
  try {
    await sb.from("profiles").upsert(profile, { onConflict: "id" });
  } catch(e) {}
}

// ── DYNAMIC SCRIPT LOADER ─────────────────────────────────────
var _loadedScripts = {};
function loadScript(src) {
  if (_loadedScripts[src]) return _loadedScripts[src];
  // If script functions are already available (inlined build), skip loading
  if (src.indexOf("admin.js") > -1 && typeof loadAdminData === "function") {
    _loadedScripts[src] = Promise.resolve();
    return _loadedScripts[src];
  }
  if (src.indexOf("professional.js") > -1 && typeof loadProDash === "function") {
    _loadedScripts[src] = Promise.resolve();
    return _loadedScripts[src];
  }
  _loadedScripts[src] = new Promise(function(resolve, reject) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error("Failed to load " + src)); };
    document.head.appendChild(s);
  });
  return _loadedScripts[src];
}

// ── ROUTE BY ROLE ─────────────────────────────────────────────
async function routeByRole() {
  updateNav();
  if (!profile) return;
  showUidBadges();
  startTracker();
  if (profile.role === "admin") {
    await loadScript("js/dashboards/admin.js");
    show("admin");
    loadAdminData();
  } else {
    // All signed-in users (client & pro) land on homepage
    show("home");
  }
}

// ── SIGN IN ───────────────────────────────────────────────────
async function doSignIn() {
  var email = ge("siE").value.trim().toLowerCase();
  var pass  = ge("siP").value;
  var err   = ge("siErr");
  var btn   = ge("siBtnEl");
  err.textContent = "";
  if (!email || !pass) { err.textContent = "Enter email and password."; return; }
  btn.textContent = "⏳..."; btn.disabled = true;
  var attempt = 0;
  while (attempt < 3) {
    try {
      var r = await sb.auth.signInWithPassword({ email: email, password: pass });
      if (r.error) {
        var msg = r.error.message;
        if (msg.includes("Email not confirmed")) msg = "Please confirm your email first.";
        else if (msg.includes("Invalid login"))  msg = "Wrong email or password.";
        err.textContent = msg;
        btn.textContent = t("siBtnTxt"); btn.disabled = false;
        return;
      }
      closeM("auth");
      await loadProfile(r.data.user);
      updateNav();
      routeByRole();
      toast("Welcome back, " + (profile.full_name || email).split(" ")[0] + "!", "ok");
      return;
    } catch(e) {
      attempt++;
      if (attempt >= 3) {
        err.textContent = "Network error. Please try again.";
        btn.textContent = t("siBtnTxt"); btn.disabled = false;
        return;
      }
      await new Promise(function(resolve) { setTimeout(resolve, 700 * attempt); });
    }
  }
}

// ── CLIENT SIGN UP ────────────────────────────────────────────
async function doSignUpClient() {
  var first = ge("scF").value.trim();
  var last  = ge("scL").value.trim();
  var email = ge("scE").value.trim().toLowerCase();
  var phone = ge("scPh").value.trim();
  var gender = ge("scGender").value;
  var pass  = ge("scP").value;
  var err   = ge("scErr");
  var btn   = ge("scBtnEl");
  err.textContent = "";
  if (!first || !last || !email || !pass) { err.textContent = "Please fill all fields."; return; }
  if (!phone || phone.length < 9) { err.textContent = "Phone number is required."; return; }
  if (!gender) { err.textContent = "Please select gender."; return; }
  if (pass.length < 6) { err.textContent = "Password must be 6+ characters."; return; }
  btn.textContent = "⏳..."; btn.disabled = true;
  var fn = first + " " + last;
  var r = await sb.auth.signUp({
    email: email, password: pass,
    options: { data: { full_name: fn, phone: phone, role: "client", gender: gender } }
  });
  if (r.error) {
    err.textContent = r.error.message;
    btn.textContent = t("scBtnTxt"); btn.disabled = false;
    return;
  }
  var uid = r.data.user.id;
  try {
    await sb.from("profiles").upsert(
      { id: uid, full_name: fn, email: email, phone: phone, gender: gender, role: "client" },
      { onConflict: "id" }
    );
  } catch(e) {}
  user    = r.data.user;
  profile = { id: uid, full_name: fn, email: email, phone: phone, gender: gender, role: "client" };
  closeM("auth");
  updateNav();
  routeByRole();
  toast("Welcome, " + first + "!", "ok");
}

// ── PRO SIGN UP ───────────────────────────────────────────────
async function doSignUpPro() {
  var first = ge("spF").value.trim();
  var last  = ge("spL").value.trim();
  var email = ge("spE").value.trim().toLowerCase();
  var phone = ge("spPh").value.trim();
  var gender = ge("spGender").value;
  var spec  = ge("spSp").value;
  var area  = ge("spAr").value;
  var pass  = ge("spP").value;
  var err   = ge("spErr");
  var btn   = ge("spBtnEl");
  err.textContent = "";
  if (!first || !last || !email || !pass) { err.textContent = "Please fill all fields."; return; }
  if (!phone || phone.length < 9) { err.textContent = "Phone number is required."; return; }
  if (!gender) { err.textContent = "Please select gender."; return; }
  if (pass.length < 6) { err.textContent = "Password must be 6+ characters."; return; }
  btn.textContent = "⏳..."; btn.disabled = true;
  var fn = first + " " + last;
  var r = await sb.auth.signUp({
    email: email, password: pass,
    options: { data: { full_name: fn, role: "pro", specialty: spec, area: area, phone: phone, gender: gender } }
  });
  if (r.error) {
    err.textContent = r.error.message;
    btn.textContent = t("spBtnTxt"); btn.disabled = false;
    return;
  }
  var uid = r.data.user.id;
  var proId = null;
  try {
    var pr = await sb.from("professionals")
      .insert({ user_id: uid, name: fn, specialty: spec, area: area, status: "pending" })
      .select().single();
    proId = pr.data ? pr.data.id : null;
    await sb.from("profiles").upsert(
      { id: uid, full_name: fn, email: email, phone: phone, gender: gender, role: "pro", pro_id: proId },
      { onConflict: "id" }
    );
  } catch(e) {
    err.textContent = "Account created but DB error: " + e.message + ". Run setup SQL first.";
    btn.textContent = t("spBtnTxt"); btn.disabled = false;
    return;
  }
  user    = r.data.user;
  profile = { id: uid, full_name: fn, email: email, gender: gender, role: "pro", pro_id: proId };
  closeM("auth");
  updateNav();
  routeByRole();
  toast("Application submitted! Awaiting admin approval.", "ok");
}

// ── SIGN OUT ──────────────────────────────────────────────────
async function signOut() {
  if (chatSub) sb.removeChannel(chatSub);
  stopLocSharing();
  cleanupClientMaps();
  await sb.auth.signOut();
  user = null; profile = null;
  updateNav();
  show("home");
  renderPros();
  toast(t("signOutMsg"));
}

// ── AVATAR UPLOAD ─────────────────────────────────────────────
async function uploadAvatar(file, uid, ringId, emojiId, sideId) {
  var ext  = file.name.split(".").pop();
  var path = "avatars/" + uid + "." + ext;
  try {
    var r = await sb.storage.from("profile-pictures").upload(path, file, { upsert: true });
    if (r.error) throw r.error;
    var url = sb.storage.from("profile-pictures").getPublicUrl(path).data.publicUrl;
    await sb.from("profiles").update({ avatar_url: url }).eq("id", uid);
    if (profile) profile.avatar_url = url;
    if (ringId)  { var ring = ge(ringId); if (ring) ring.innerHTML = "<img src=\"" + url + "\" style=\"width:100%;height:100%;object-fit:cover\">"; }
    if (sideId)  { var side = ge(sideId); if (side) side.innerHTML = "<img src=\"" + url + "\" style=\"width:100%;height:100%;object-fit:cover\">"; }
    toast("Photo updated!", "ok");
    return url;
  } catch(e) {
    toast("Upload failed: " + e.message, "err");
    return null;
  }
}

async function uploadClientAvatar(input) {
  if (!input.files || !input.files[0] || !user) return;
  await uploadAvatar(input.files[0], user.id, "cAvaRing", "cAvaEmoji", "cdAva");
}


// ── UNIQUE ID GENERATION ─────────────────────────────────────
function genUid(prefix, uuid) {
  if (!uuid) return prefix + "0000";
  var hex = uuid.replace(/-/g, "").substring(0, 8);
  var num = parseInt(hex, 16) % 100000;
  return prefix + String(num).padStart(5, "0");
}

// ── FORGOT PASSWORD ──────────────────────────────────────────
async function forgotPassword() {
  var email = ge("siE").value.trim().toLowerCase();
  if (!email) { ge("siErr").textContent = "Enter your email first."; return; }
  try {
    var r = await sb.auth.resetPasswordForEmail(email);
    if (r.error) { ge("siErr").textContent = r.error.message; return; }
    toast("Password reset email sent! Check your inbox.", "ok");
  } catch(e) { ge("siErr").textContent = "Error: " + e.message; }
}

// ── CHANGE PASSWORD / EMAIL / PHONE ──────────────────────────
async function changePassword(inputId) {
  var pw = ge(inputId).value;
  if (!pw || pw.length < 6) { toast("Password must be 6+ characters", "err"); return; }
  try {
    var r = await sb.auth.updateUser({ password: pw });
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    ge(inputId).value = "";
    toast("Password updated!", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function changeEmail(inputId) {
  var email = ge(inputId).value.trim().toLowerCase();
  if (!email) { toast("Enter new email", "err"); return; }
  try {
    var r = await sb.auth.updateUser({ email: email });
    if (r.error) { toast("Error: " + r.error.message, "err"); return; }
    toast("Confirmation sent to new email.", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function changePhone(inputId) {
  var phone = ge(inputId).value.trim();
  if (!phone) { toast("Enter phone number", "err"); return; }
  try {
    await sb.from("profiles").update({ phone: phone }).eq("id", user.id);
    if (profile) profile.phone = phone;
    ge(inputId).value = "";
    toast("Phone updated!", "ok");
  } catch(e) { toast("Error: " + e.message, "err"); }
}

// ── PHONE VALIDATION ON SIGNUP ───────────────────────────────
var _origSignUpClient = null;
function validatePhone(phone, errEl) {
  if (!phone || phone.length < 9) {
    if (errEl) errEl.textContent = "Phone number is required.";
    return false;
  }
  return true;
}

// ── PRO CALENDAR ─────────────────────────────────────────────
var proCalDate = new Date();

// ── UNIQUE ID DISPLAY ────────────────────────────────────────
function showUidBadges() {
  if (!profile || !user) return;
  var prefix = profile.role === "pro" ? "P" : "C";
  var uid = genUid(prefix, user.id);
  var cBadge = ge("cUidBadge"); if (cBadge) cBadge.textContent = uid;
  var pBadge = ge("pUidBadge"); if (pBadge) pBadge.textContent = genUid("P", profile.pro_id || user.id);
}

