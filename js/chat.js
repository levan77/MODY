// ═══════════════════════════════════════════════════════════════
//  MODY — Chat Widget & Support Tickets
//  Load order: 5 (depends on: config.js, ui.js)
// ═══════════════════════════════════════════════════════════════

// ── CHAT ──────────────────────────────────────────────────────
var chatThread = null, chatSub = null;

function toggleChat() { ge("chatWin").classList.toggle("on"); }

function buildChatThreads() {
  var el = ge("chatThreads");
  if (!el || !user) return;
  el.innerHTML = "";
  // Support thread always available
  var btn = document.createElement("button");
  btn.className = "chat-tb";
  btn.textContent = "💬 Support";
  btn.onclick = function() { openChatThread("support_" + user.id, "Support"); };
  el.appendChild(btn);
}

function openChatThread(threadId, label) {
  chatThread = threadId;
  ge("chatThreads").querySelectorAll(".chat-tb").forEach(function(b) {
    b.classList.toggle("on", b.textContent.indexOf(label) > -1);
  });
  loadChatMessages(threadId);
  // Subscribe realtime
  if (chatSub) sb.removeChannel(chatSub);
  chatSub = sb.channel("chat:" + threadId)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
      filter: "thread_id=eq." + threadId },
      function() { loadChatMessages(threadId); })
    .subscribe();
}

async function loadChatMessages(threadId) {
  var el = ge("chatMsgs"); if (!el) return;
  try {
    var r = await sb.from("messages").select("*").eq("thread_id", threadId).order("created_at");
    var msgs = r.data || [];
    el.innerHTML = msgs.length === 0
      ? "<div class=\"msg msg-sys\">No messages yet. Say hello!</div>"
      : msgs.map(function(m) {
          var isMe = m.sender_id === user.id;
          return "<div class=\"msg " + (isMe ? "msg-out" : "msg-in") + "\">" + m.content + "</div>";
        }).join("");
    el.scrollTop = el.scrollHeight;
  } catch(e) {
    el.innerHTML = "<div class=\"msg msg-sys\">Run setup SQL to enable chat.</div>";
  }
}

async function sendChatMsg() {
  var inp = ge("chatInp");
  var txt = inp ? inp.value.trim() : "";
  if (!txt || !chatThread || !user) return;
  inp.value = "";
  try {
    await sb.from("messages").insert({
      thread_id: chatThread, thread_type: "support",
      sender_id: user.id,
      sender_name: profile ? profile.full_name : user.email,
      sender_role: profile ? profile.role : "client",
      content: txt
    });
    loadChatMessages(chatThread);
  } catch(e) { toast("Could not send message", "err"); }
}

// ── SUPPORT TICKETS ───────────────────────────────────────────
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
      content: msg
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
      return "<div class=\"msg " + (isMe ? "msg-out" : "msg-in") + "\">"
           + (isMe ? "" : "<div style=\"font-size:10px;opacity:.6;margin-bottom:2px\">" + (m.sender_name || "Support") + "</div>")
           + m.content + "</div>";
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
      content: txt
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

