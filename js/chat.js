// ═══════════════════════════════════════════════════════════════
//  MODY — Chat: Client ↔ Professional + Support Tickets
//  Load order: 5 (depends on: config.js, ui.js, auth.js)
// ═══════════════════════════════════════════════════════════════

var chatThread = null;
var chatSub = null;
var chatOtherName = "";
var chatBookings = [];

// ── UNREAD BADGE ON CHAT FLOAT BUTTON ──────────────────────
async function updateChatBadge() {
  if (!user) return;
  try {
    var r = await sb.from("messages").select("id", { count: "exact", head: true })
      .neq("sender_id", user.id).eq("is_read", false).eq("thread_type", "booking");
    var count = r.count || 0;
    var btn = document.querySelector(".chat-float");
    if (!btn) return;
    // Remove old badge
    var old = btn.querySelector(".chat-badge");
    if (old) old.remove();
    if (count > 0) {
      var badge = document.createElement("span");
      badge.className = "chat-badge";
      badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;font-size:10px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-weight:700;padding:0 4px";
      badge.textContent = count > 99 ? "99+" : count;
      btn.style.position = "relative";
      btn.appendChild(badge);
    }
  } catch(e) {}
}

// ── TOGGLE CHAT WINDOW ──────────────────────────────────────
function toggleChat() {
  var win = ge("chatWin");
  if (!win) return;
  var opening = !win.classList.contains("on");
  win.classList.toggle("on");
  if (opening && user) buildChatThreads();
  updateChatBadge();
}

// ── BUILD THREAD LIST FROM BOOKINGS ─────────────────────────
async function buildChatThreads() {
  var el = ge("chatThreads");
  if (!el || !user) return;
  el.innerHTML = "<div style=\"font-size:11px;color:var(--mu);padding:4px\">Loading...</div>";

  var role = profile ? profile.role : "client";
  var proId = profile ? profile.pro_id : null;

  try {
    var activeStatuses = ["pending","accepted","on_the_way","arrived","in_progress","completed"];
    var q;
    if (role === "pro" && proId) {
      q = sb.from("bookings").select("id,client_id,client_name,pro_id,pro_name,service_name,status,time_slot")
        .eq("pro_id", proId).in("status", activeStatuses).order("created_at", { ascending: false });
    } else {
      q = sb.from("bookings").select("id,client_id,client_name,pro_id,pro_name,service_name,status,time_slot")
        .eq("client_id", user.id).in("status", activeStatuses).order("created_at", { ascending: false });
    }
    var r = await q;
    chatBookings = r.data || [];
  } catch(e) { chatBookings = []; }

  if (!chatBookings.length) {
    el.innerHTML = "<div style=\"font-size:12px;color:var(--mu);padding:6px\">No active bookings to chat about.</div>";
    return;
  }

  var role2 = profile ? profile.role : "client";

  // Get unread counts for each thread
  var threadIds = chatBookings.map(function(b) { return "booking_" + b.id; });
  var unreadMap = {};
  try {
    var ur = await sb.from("messages").select("thread_id")
      .in("thread_id", threadIds).neq("sender_id", user.id).eq("is_read", false);
    (ur.data || []).forEach(function(m) {
      unreadMap[m.thread_id] = (unreadMap[m.thread_id] || 0) + 1;
    });
  } catch(e) { /* is_read column may not exist yet */ }

  el.innerHTML = chatBookings.map(function(bk) {
    var otherName = role2 === "pro" ? (bk.client_name || "Client") : (bk.pro_name || "Professional");
    var threadId = "booking_" + bk.id;
    var isActive = chatThread === threadId;
    var unread = unreadMap[threadId] || 0;
    var badge = unread > 0 ? " <span style=\"background:#ef4444;color:#fff;border-radius:50%;font-size:9px;padding:1px 5px;margin-left:3px\">" + unread + "</span>" : "";
    var timeStr = bk.time_slot ? bk.time_slot.substring(5, 16) : "";
    return "<button class=\"chat-tb" + (isActive ? " on" : "") + "\" onclick=\"openBookingChat('" + bk.id + "','" + otherName.replace(/'/g,"\\'") + "')\">"
      + otherName + "<div style=\"font-size:10px;opacity:.65\">" + (bk.service_name || "") + (timeStr ? " · " + timeStr : "") + "</div>" + badge + "</button>";
  }).join("");
}

// ── OPEN A BOOKING CHAT THREAD ──────────────────────────────
function openBookingChat(bookingId, otherName) {
  var threadId = "booking_" + bookingId;
  chatThread = threadId;
  chatOtherName = otherName;

  // Update header
  var hdrLabel = ge("chatHdrLabel");
  if (hdrLabel) hdrLabel.textContent = "💬 " + otherName;

  // Highlight active thread
  var el = ge("chatThreads");
  if (el) el.querySelectorAll(".chat-tb").forEach(function(b) {
    b.classList.toggle("on", b.onclick.toString().indexOf(bookingId) > -1);
  });

  loadChatMessages(threadId);

  // Mark messages as read
  markMessagesRead(threadId);

  // Subscribe realtime
  if (chatSub) sb.removeChannel(chatSub);
  chatSub = sb.channel("chat:" + threadId)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
      filter: "thread_id=eq." + threadId },
      function() {
        loadChatMessages(threadId);
        markMessagesRead(threadId);
      })
    .subscribe();
}

// ── OPEN CHAT FROM BOOKING DETAIL ───────────────────────────
function openChatFromBooking(bookingId, otherName) {
  var win = ge("chatWin");
  if (win && !win.classList.contains("on")) win.classList.add("on");
  buildChatThreads().then(function() {
    openBookingChat(bookingId, otherName);
  });
}

// ── LOAD MESSAGES ───────────────────────────────────────────
async function loadChatMessages(threadId) {
  var el = ge("chatMsgs"); if (!el) return;
  try {
    var r = await sb.from("messages").select("*").eq("thread_id", threadId).order("created_at");
    var msgs = r.data || [];
    if (!msgs.length) {
      el.innerHTML = "<div class=\"msg msg-sys\">No messages yet. Say hello! 👋</div>";
      el.scrollTop = el.scrollHeight;
      return;
    }
    el.innerHTML = msgs.map(function(m) {
      var isMe = user && m.sender_id === user.id;
      var time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      var date = m.created_at ? new Date(m.created_at).toLocaleDateString() : "";
      var senderLabel = isMe ? "" : "<div style=\"font-size:10px;font-weight:600;opacity:.7;margin-bottom:2px\">" + (m.sender_name || "Unknown") + " <span style=\"font-weight:400\">· " + (m.sender_role || "") + "</span></div>";
      var readIcon = isMe && m.is_read ? " <span style=\"font-size:9px;opacity:.5\">✓✓</span>" : "";
      return "<div class=\"msg " + (isMe ? "msg-out" : "msg-in") + "\">"
        + senderLabel
        + "<div>" + escapeHtml(m.content) + "</div>"
        + "<div style=\"font-size:9px;opacity:.5;margin-top:2px;text-align:" + (isMe ? "right" : "left") + "\">" + time + readIcon + "</div>"
        + "</div>";
    }).join("");
    el.scrollTop = el.scrollHeight;
  } catch(e) {
    el.innerHTML = "<div class=\"msg msg-sys\">Could not load messages. Run setup SQL first.</div>";
  }
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── MARK AS READ ────────────────────────────────────────────
async function markMessagesRead(threadId) {
  if (!user) return;
  try {
    await sb.from("messages").update({ is_read: true })
      .eq("thread_id", threadId).neq("sender_id", user.id).eq("is_read", false);
    updateChatBadge();
  } catch(e) { /* is_read column may not exist */ }
}

// ── SEND MESSAGE ────────────────────────────────────────────
async function sendChatMsg() {
  var inp = ge("chatInp");
  var txt = inp ? inp.value.trim() : "";
  if (!txt || !chatThread || !user) return;
  inp.value = "";

  // Determine thread_type
  var threadType = chatThread.startsWith("booking_") ? "booking"
    : chatThread.startsWith("ticket_") ? "support" : "support";

  try {
    await sb.from("messages").insert({
      thread_id: chatThread,
      thread_type: threadType,
      sender_id: user.id,
      sender_name: profile ? profile.full_name : user.email,
      sender_role: profile ? profile.role : "client",
      content: txt,
      is_read: false
    });
    loadChatMessages(chatThread);
  } catch(e) { toast("Could not send message", "err"); }
}

// ── SUPPORT TICKETS ─────────────────────────────────────────
var currentTicketId = null;

async function createTicket() {
  var subject  = ge("newTkSubject").value.trim();
  var priority = ge("newTkPriority").value;
  var msg      = ge("newTkMsg").value.trim();
  if (!subject || !msg) { toast("Please fill all fields", "err"); return; }
  if (!user) { toast("Please sign in first", "err"); openM("auth"); return; }
  try {
    var r = await sb.from("support_tickets").insert({
      user_id: user.id,
      user_name: profile ? profile.full_name : user.email,
      user_role: profile ? profile.role : "client",
      subject: subject, priority: priority, status: "open"
    }).select().single();
    if (r.error) throw r.error;
    await sb.from("messages").insert({
      thread_id: "ticket_" + r.data.id, thread_type: "support",
      sender_id: user.id,
      sender_name: profile ? profile.full_name : user.email,
      sender_role: profile ? profile.role : "client",
      content: msg,
      is_read: false
    });
    toast("Ticket submitted!", "ok");
    closeM("newticket");
    ge("newTkSubject").value = "";
    ge("newTkMsg").value = "";
    loadTickets();
  } catch(e) { toast("Error: " + e.message, "err"); }
}

async function openTicketModal(id, subject) {
  currentTicketId = id;
  ge("ticketModalTitle").textContent = "Ticket";
  ge("ticketModalSub").textContent   = subject;
  await loadTicketMessages(id);
  openM("ticket");
}

async function loadTicketMessages(id) {
  var el = ge("ticketMsgs"); if (!el) return;
  try {
    var r = await sb.from("messages").select("*")
      .eq("thread_id", "ticket_" + id).order("created_at");
    var msgs = r.data || [];
    el.innerHTML = msgs.map(function(m) {
      var isMe = user && m.sender_id === user.id;
      var time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return "<div class=\"msg " + (isMe ? "msg-out" : "msg-in") + "\">"
           + (isMe ? "" : "<div style=\"font-size:10px;opacity:.6;margin-bottom:2px\">" + (m.sender_name || "Support") + " · " + (m.sender_role || "") + "</div>")
           + "<div>" + escapeHtml(m.content) + "</div>"
           + "<div style=\"font-size:9px;opacity:.5;margin-top:2px\">" + time + "</div>"
           + "</div>";
    }).join("");
    el.scrollTop = el.scrollHeight;
  } catch(e) {}
}

async function sendTicketReply() {
  if (!currentTicketId || !user) return;
  var inp = ge("ticketReply");
  var txt = inp ? inp.value.trim() : "";
  if (!txt) return;
  inp.value = "";
  try {
    await sb.from("messages").insert({
      thread_id: "ticket_" + currentTicketId, thread_type: "support",
      sender_id: user.id,
      sender_name: profile ? profile.full_name : user.email,
      sender_role: profile ? profile.role : "client",
      content: txt,
      is_read: false
    });
    await loadTicketMessages(currentTicketId);
  } catch(e) { toast("Could not send message", "err"); }
}

async function loadTickets(targetRole) {
  if (!user) return;
  var role = targetRole || (profile ? profile.role : "client");
  var listId = role === "pro" ? "pTicketList" : "cTicketList";
  var el = ge(listId); if (!el) return;
  try {
    var r = await sb.from("support_tickets")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    var tickets = r.data || [];
    if (!tickets.length) {
      el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">" + t("noTicketTxt") + "</p>";
      return;
    }
    var colorMap = { open:"var(--g)", in_progress:"#a16207", resolved:"#15803d", closed:"var(--mu)" };
    el.innerHTML = tickets.map(function(tk) {
      return "<div class=\"ticket-row\" onclick=\"openTicketModal('" + tk.id + "','" + tk.subject.replace(/'/g, "\\'") + "')\">"
           + "<div style=\"display:flex;justify-content:space-between;align-items:center\">"
           + "<div style=\"font-weight:500;font-size:14px\">" + tk.subject + "</div>"
           + "<span style=\"font-size:11px;color:" + (colorMap[tk.status] || "var(--mu)") + ";font-weight:500\">" + tk.status.toUpperCase() + "</span>"
           + "</div>"
           + "<div style=\"font-size:12px;color:var(--mu);margin-top:2px\">" + tk.priority + " priority · " + new Date(tk.created_at).toLocaleDateString() + "</div>"
           + "</div>";
    }).join("");
  } catch(e) {
    el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">Run setup SQL to enable tickets.</p>";
  }
}

// ── ADMIN: VIEW ALL BOOKING CHATS ───────────────────────────
async function loadAdminChats() {
  var el = ge("aChatsContainer"); if (!el) return;
  el.innerHTML = "<p style=\"color:var(--mu);font-size:13px\">Loading conversations...</p>";

  try {
    // Get all booking threads that have messages
    var r = await sb.from("messages").select("thread_id,thread_type").eq("thread_type", "booking").order("created_at", { ascending: false });
    var msgs = r.data || [];

    // Unique thread ids
    var seen = {};
    var threadIds = [];
    msgs.forEach(function(m) {
      if (!seen[m.thread_id]) { seen[m.thread_id] = true; threadIds.push(m.thread_id); }
    });

    if (!threadIds.length) {
      el.innerHTML = "<p style=\"color:var(--mu);font-size:14px\">No client–pro conversations yet.</p>";
      return;
    }

    // Get booking info for each thread
    var bookingIds = threadIds.map(function(tid) { return tid.replace("booking_", ""); });
    var bkRes = await sb.from("bookings").select("id,client_name,pro_name,service_name,time_slot,status").in("id", bookingIds);
    var bkMap = {};
    (bkRes.data || []).forEach(function(bk) { bkMap[bk.id] = bk; });

    // Get message counts
    var countRes = await sb.from("messages").select("thread_id").eq("thread_type", "booking").in("thread_id", threadIds);
    var countMap = {};
    (countRes.data || []).forEach(function(m) { countMap[m.thread_id] = (countMap[m.thread_id] || 0) + 1; });

    el.innerHTML = threadIds.map(function(tid) {
      var bkId = tid.replace("booking_", "");
      var bk = bkMap[bkId] || {};
      var count = countMap[tid] || 0;
      return "<div class=\"ticket-row\" onclick=\"adminOpenChat('" + tid + "','" + (bk.client_name || "Client").replace(/'/g,"\\'") + "','" + (bk.pro_name || "Pro").replace(/'/g,"\\'") + "')\">"
        + "<div style=\"display:flex;justify-content:space-between;align-items:center\">"
        + "<div style=\"font-weight:500;font-size:14px\">" + (bk.client_name || "Client") + " ↔ " + (bk.pro_name || "Pro") + "</div>"
        + "<span style=\"font-size:11px;color:var(--g);font-weight:500\">" + count + " msgs</span>"
        + "</div>"
        + "<div style=\"font-size:12px;color:var(--mu);margin-top:2px\">"
        + (bk.service_name || "—") + " · " + (bk.time_slot || "—") + " · " + (bk.status || "—").replace(/_/g, " ")
        + "</div></div>";
    }).join("");
  } catch(e) {
    el.innerHTML = "<p style=\"color:#ef4444;font-size:14px\">Error: " + e.message + "</p>";
  }
}

// Admin view a specific booking chat
async function adminOpenChat(threadId, clientName, proName) {
  var el = ge("aChatViewer"); if (!el) return;
  el.style.display = "block";
  ge("aChatTitle").textContent = clientName + " ↔ " + proName;
  var msgsEl = ge("aChatMsgs");
  msgsEl.innerHTML = "<div style=\"color:var(--mu);font-size:13px\">Loading...</div>";

  try {
    var r = await sb.from("messages").select("*").eq("thread_id", threadId).order("created_at");
    var msgs = r.data || [];
    if (!msgs.length) {
      msgsEl.innerHTML = "<div class=\"msg msg-sys\">No messages in this conversation.</div>";
      return;
    }
    msgsEl.innerHTML = msgs.map(function(m) {
      var isClient = m.sender_role === "client";
      var time = m.created_at ? new Date(m.created_at).toLocaleString() : "";
      var roleBadge = m.sender_role === "pro"
        ? "<span style=\"background:rgba(234,184,183,.15);color:var(--gd);padding:1px 6px;border-radius:50px;font-size:9px;font-weight:600\">PRO</span>"
        : "<span style=\"background:rgba(59,130,246,.12);color:#3b82f6;padding:1px 6px;border-radius:50px;font-size:9px;font-weight:600\">CLIENT</span>";
      return "<div class=\"msg " + (isClient ? "msg-in" : "msg-out") + "\" style=\"max-width:90%\">"
        + "<div style=\"font-size:10px;margin-bottom:3px;display:flex;align-items:center;gap:4px\">"
        + "<strong>" + (m.sender_name || "Unknown") + "</strong> " + roleBadge
        + "</div>"
        + "<div>" + escapeHtml(m.content) + "</div>"
        + "<div style=\"font-size:9px;opacity:.5;margin-top:2px\">" + time + "</div>"
        + "</div>";
    }).join("");
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch(e) {
    msgsEl.innerHTML = "<p style=\"color:#ef4444\">Error loading chat.</p>";
  }
}
