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
          if (typeof loadProDash === "function") loadProDash();
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
        if (profile.role === "admin" && typeof loadAdminData === "function") {
          loadAdminData();
        }
      })
    .subscribe();

  // Messages channel — chat notifications
  sb.channel("messages-realtime")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
      function(payload) {
        var msg = payload.new || {};
        if (!msg.sender_id || msg.sender_id === user.id) return;

        // Update unread badge on chat float button
        updateChatBadge();

        // If chat window is open on this thread, just reload
        var win = ge("chatWin");
        if (win && win.classList.contains("on") && chatThread === msg.thread_id) return;

        // Show notification toast
        var senderName = msg.sender_name || "Someone";
        var preview = (msg.content || "").substring(0, 50) + (msg.content && msg.content.length > 50 ? "…" : "");
        toast("💬 " + senderName + ": " + preview, "ok");

        // Notify via browser notification if permitted
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("MODY — " + senderName, { body: preview, icon: "/favicon.ico" });
          } catch(e) {}
        }
      })
    .subscribe();

  // Request browser notification permission
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Pros channel — admin approval notifications
  if (profile.role === "admin") {
    sb.channel("pros-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "professionals" },
        function() { if (typeof loadApprovals === "function") loadApprovals(); })
      .subscribe();
  }
}

