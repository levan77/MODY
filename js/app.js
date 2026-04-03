// ═══════════════════════════════════════════════════════════════
//  MODY — Application Entry Point
//  Load order: 14 (last — depends on all other modules)
// ═══════════════════════════════════════════════════════════════

// ── MAIN INIT ─────────────────────────────────────────────────
async function init() {
  // Load saved translations from DB first
  await loadSavedTranslations();

  // Apply language (populates all text)
  applyLang();

  // Load platform settings (promo, nail colors, commission)
  await loadSettings();

  // Load DB-driven categories (falls back to hardcoded)
  await loadCategories();
  await loadSubCategories();

  // Load professionals from DB and merge with demos
  loadPros();

  // Check existing session
  try {
    var sess = await sb.auth.getSession();
    if (sess.data && sess.data.session && sess.data.session.user) {
      await loadProfile(sess.data.session.user);
      updateNav();
      showUidBadges();
      startTracker();
      subscribeRealtime();
      buildChatThreads();
      updateChatBadge();
    } else {
      updateNav();
    }
  } catch(e) {
    updateNav();
  }

  // Dismiss loading screen
  var ls = ge("loadingScreen");
  if (ls) { ls.style.opacity = "0"; setTimeout(function() { ls.remove(); }, 500); }

  // Listen for future auth changes
  sb.auth.onAuthStateChange(async function(event, session) {
    if (event === "SIGNED_IN" && session && session.user && !user) {
      await loadProfile(session.user);
      updateNav();
      routeByRole();
      subscribeRealtime();
      buildChatThreads();
      updateChatBadge();
    } else if (event === "SIGNED_OUT") {
      user = null; profile = null;
      if (ftInterval) { clearInterval(ftInterval); ftInterval = null; }
      var ft = ge("fTracker"); if (ft) ft.innerHTML = "";
      updateNav();
      show("home");
      renderPros();
    }
  });
}

// ── START ─────────────────────────────────────────────────────
init();
