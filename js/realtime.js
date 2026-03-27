// ═══════════════════════════════════════════════════════════════
//  MODY — Supabase Realtime Subscriptions
//  Load order: 13 (depends on: config.js, dashboards)
// ═══════════════════════════════════════════════════════════════

function subscribeRealtime() {
  if (!user || !profile) return;

  // Bookings channel — notify based on role
  sb.channel("bookings-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "bookings" },
      function(payload) {
        var bk = payload.new || {};
        // Always refresh tracker for any booking change
        renderTracker();

        if (profile.role === "pro" && profile.pro_id && bk.pro_id === profile.pro_id) {
          if (bk.status === "completed" && bk.client_id) {
            toast("Service completed! Rate the client.", "ok");
            setTimeout(function() { openRevModal(bk.id, bk.client_id, "pro"); }, 1000);
          } else {
            toast("Booking update: " + (bk.status || "").replace(/_/g," "));
          }
          loadProDash();
        }
        if (profile.role === "client" && bk.client_id === user.id) {
          if (bk.status === "arrived") {
            toast("📍 Your professional has arrived! Please confirm.", "ok");
          } else if (bk.status === "on_the_way") {
            toast("🚗 Your professional is on the way!");
          } else if (bk.status === "completed" && bk.pro_id) {
            toast("Service completed! Please leave a review.", "ok");
            setTimeout(function() { openRevModal(bk.id, bk.pro_id, "client"); }, 1000);
          } else {
            toast("Booking update: " + (bk.status || "").replace(/_/g," "));
          }
          loadClientDash();
        }
        if (profile.role === "admin") {
          loadAdminData();
        }
      })
    .subscribe();

  // Pros channel — admin approval notifications
  if (profile.role === "admin") {
    sb.channel("pros-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "professionals" },
        function() { loadApprovals(); })
      .subscribe();
  }
}

