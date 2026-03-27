// ═══════════════════════════════════════════════════════════════
//  MODY — Configuration, Constants & Platform Settings
//  Load order: 1 (no dependencies)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//  PART 3: TRANSLATIONS + DEMO DATA
// ═══════════════════════════════════════════════════════════════

var SB_URL = "https://fjlmzaecjxxbukrbohyy.supabase.co";
var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbG16YWVjanh4YnVrcmJvaHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDEyNzcsImV4cCI6MjA4OTUxNzI3N30.fFRoDehr5eAZ693EEXUNv9zTQVXwubXptQ9U89efg38";
var sb = window.supabase.createClient(SB_URL, SB_KEY);

// ── DEMO PROFESSIONALS ────────────────────────────────────────
var DEMOS = [
  {
    id:"d1", name:"Nino Beridze", specialty:"Nails", area:"Vake",
    rating:4.9, review_count:128, price_from:45, emoji:"\uD83D\uDC85", status:"approved",
    bio:"5+ years in gel and acrylic nail art. Certified by Georgian Beauty Academy.",
    nail_colors_enabled:true,
    services:[
      {id:"ds1",name:"Classic Gel Manicure",price:55,duration:60,description:"Soak-off gel, long lasting"},
      {id:"ds2",name:"Nail Art Design",price:75,duration:90,description:"Custom patterns and designs"},
      {id:"ds3",name:"Acrylic Full Set",price:90,duration:120,description:"Full acrylic extensions"},
      {id:"ds4",name:"Pedicure Deluxe",price:65,duration:75,description:"Relaxing spa pedicure"}
    ],
    nail_colors:[
      {id:"nc1",name:"Cherry Red",hex_code:"#DC143C"},
      {id:"nc2",name:"Blush Pink",hex_code:"#FFB6C1"},
      {id:"nc3",name:"Nude Beige",hex_code:"#D4B896"},
      {id:"nc4",name:"Gold Shimmer",hex_code:"#D4AF37"},
      {id:"nc5",name:"Deep Purple",hex_code:"#6B3FA0"},
      {id:"nc6",name:"Classic White",hex_code:"#F8F8FF"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400",
      "https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400",
      "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400",
      "https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=400"
    ]
  },
  {
    id:"d2", name:"Mariam Kiknadze", specialty:"Makeup", area:"Saburtalo",
    rating:4.8, review_count:94, price_from:60, emoji:"\uD83D\uDC84", status:"approved",
    bio:"Bridal and editorial makeup specialist. 200+ brides served across Georgia.",
    services:[
      {id:"ds5",name:"Bridal Makeup",price:180,duration:120,description:"Full glam bridal look"},
      {id:"ds6",name:"Evening Glam",price:90,duration:60,description:"Party-ready glamour"},
      {id:"ds7",name:"Natural Day Look",price:65,duration:45,description:"Fresh everyday makeup"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
      "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400"
    ]
  },
  {
    id:"d3", name:"Tamar Jibladze", specialty:"Hair", area:"Isani",
    rating:4.7, review_count:67, price_from:40, emoji:"\uD83D\uDC87", status:"approved",
    bio:"Hair styling expert — blowouts, braids, and color treatments.",
    services:[
      {id:"ds8",name:"Blowout & Style",price:55,duration:60,description:"Professional blowout"},
      {id:"ds9",name:"Hair Braiding",price:70,duration:90,description:"All types of braids"},
      {id:"ds10",name:"Color Treatment",price:120,duration:150,description:"Full color or highlights"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400"
    ]
  },
  {
    id:"d4", name:"Keti Lomidze", specialty:"Lashes", area:"Didi Dighomi",
    rating:5.0, review_count:210, price_from:70, emoji:"\uD83D\uDC41", status:"approved",
    bio:"Master lash technician. 5-star rating maintained for 3 years.",
    services:[
      {id:"ds11",name:"Classic Lash Set",price:80,duration:90,description:"Natural-looking lashes"},
      {id:"ds12",name:"Volume Lash Set",price:110,duration:120,description:"Full dramatic volume"},
      {id:"ds13",name:"Lash Lift & Tint",price:75,duration:60,description:"Lift natural lashes"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400"
    ]
  },
  {
    id:"d5", name:"Lika Mgeladze", specialty:"Brows", area:"Vera",
    rating:4.9, review_count:51, price_from:35, emoji:"\u2728", status:"approved",
    bio:"Brow design: threading, waxing, lamination, microblading.",
    services:[
      {id:"ds14",name:"Brow Lamination",price:65,duration:60,description:"Fluffy brushed-up brows"},
      {id:"ds15",name:"Microblading",price:250,duration:180,description:"Semi-permanent tattooing"},
      {id:"ds16",name:"Threading & Tint",price:40,duration:30,description:"Shape + color"}
    ],
    portfolio:[]
  },
  {
    id:"d6", name:"Ana Kvariani", specialty:"Makeup", area:"Mtatsminda",
    rating:4.9, review_count:88, price_from:70, emoji:"\uD83C\uDF1F", status:"approved",
    bio:"Film and TV makeup artist available for private bookings.",
    services:[
      {id:"ds17",name:"Special FX Makeup",price:200,duration:120,description:"Film-grade effects"},
      {id:"ds18",name:"Airbrush Makeup",price:120,duration:75,description:"Flawless airbrush application"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400"
    ]
  }
];


// ── SHORTHAND ─────────────────────────────────────────────────
function ge(id) { return document.getElementById(id); }


// ── STATUS SYSTEM ─────────────────────────────────────────────
var BK_FLOW = ["pending","accepted","on_the_way","arrived","in_progress","completed"];

var ST_LABEL = {
  pending:     function() { return t("stPending");   },
  accepted:    function() { return t("stAccepted");  },
  on_the_way:  function() { return t("stOnWay");     },
  arrived:     function() { return t("stArrived");   },
  in_progress: function() { return t("stInProg");    },
  completed:   function() { return t("stCompleted"); },
  cancelled:   function() { return t("stCancelled"); },
  no_show:     function() { return t("stNoShow");    },
  late:        function() { return t("stLate");      },
  refunded:    function() { return t("stRefunded");  }
};

var ST_CSS = {
  pending:"s-pen", accepted:"s-acc", on_the_way:"s-way",
  arrived:"s-arr", in_progress:"s-pro", completed:"s-don",
  cancelled:"s-can", no_show:"s-nos", late:"s-lat", refunded:"s-ref"
};

function sBadge(s) {
  var lbl = ST_LABEL[s] ? ST_LABEL[s]() : s.replace(/_/g, " ");
  var css = ST_CSS[s] || "s-pen";
  return "<span class=\"s " + css + "\">" + lbl + "</span>";
}

function buildFlowBar(s) {
  var ci = BK_FLOW.indexOf(s);
  if (ci < 0) return "";
  var h = "<div class=\"bk-flow\">";
  BK_FLOW.forEach(function(st, i) {
    var dc = i < ci ? "bk-dot-done" : i === ci ? "bk-dot-now" : "bk-dot-next";
    var lbl = ST_LABEL[st] ? ST_LABEL[st]() : st;
    h += "<div class=\"bk-step\">";
    h += "<div class=\"bk-dot " + dc + "\">" + (i < ci ? "✓" : (i + 1)) + "</div>";
    h += "<div class=\"bk-step-lbl\">" + lbl + "</div>";
    h += "</div>";
    if (i < BK_FLOW.length - 1) {
      h += "<div class=\"bk-conn" + (i < ci ? " done" : "") + "\"></div>";
    }
  });
  return h + "</div>";
}


// ── PLATFORM SETTINGS ─────────────────────────────────────────
var settings = { promo_enabled: true, nail_colors_enabled: true, commission: 5, platform_fee: 5, chat_enabled: true, pro_registration_enabled: true, reviews_enabled: true, auto_accept: false, min_order: 0, cancel_hours: 2, brand_name: "MODY", open_time: "10:00", close_time: "20:00", advance_days: 30, email_notifications: true, sms_notifications: false };

// District management
var districts = ["Vake","Saburtalo","Isani","Didi Dighomi","Vera","Mtatsminda","Gldani"];

async function loadSettings() {
  try {
    var r = await sb.from("platform_settings").select("*");
    if (r.data) {
      r.data.forEach(function(row) {
        settings[row.key] = row.value === "true" ? true : row.value === "false" ? false : row.value;
      });
    }
  } catch(e) {}
  // Load districts
  if (settings.districts) {
    try { districts = JSON.parse(settings.districts); } catch(e) {}
  }
  // Sync all settings UI elements
  var pg = ge("promoGlobal"); if (pg) pg.checked = settings.promo_enabled !== false;
  var sp = ge("setPromo");    if (sp) sp.checked = settings.promo_enabled !== false;
  var sn = ge("setNail");     if (sn) sn.checked = settings.nail_colors_enabled !== false;
  var sc = ge("setComm");     if (sc) sc.value   = settings.commission || 5;
  var sf = ge("setPlatformFee"); if (sf) sf.value = settings.platform_fee || 5;
  var sce = ge("setChatEnabled"); if (sce) sce.checked = settings.chat_enabled !== false;
  var spr = ge("setProReg");     if (spr) spr.checked = settings.pro_registration_enabled !== false;
  var srv = ge("setReviews");    if (srv) srv.checked = settings.reviews_enabled !== false;
  var saa = ge("setAutoAccept"); if (saa) saa.checked = settings.auto_accept === true || settings.auto_accept === "true";
  var smo = ge("setMinOrder");   if (smo) smo.value = settings.min_order || 0;
  var sch = ge("setCancelHrs");  if (sch) sch.value = settings.cancel_hours || 2;
  var sbn = ge("setBrandName");  if (sbn) sbn.value = settings.brand_name || "MODY";
  var sot = ge("setOpenTime");   if (sot) sot.value = settings.open_time || "10:00";
  var sct = ge("setCloseTime");  if (sct) sct.value = settings.close_time || "20:00";
  var sad = ge("setAdvDays");    if (sad) sad.value = settings.advance_days || 30;
  var sen = ge("setEmailNotif"); if (sen) sen.checked = settings.email_notifications !== false;
  var ssn = ge("setSmsNotif");   if (ssn) ssn.checked = settings.sms_notifications === true || settings.sms_notifications === "true";
  var sae = ge("setAlertEmail"); if (sae) sae.value = settings.alert_email || "";
  var sht = ge("setHeroTag");    if (sht) sht.value = settings.hero_tagline || "";
  var sft = ge("setFooterTxt");  if (sft) sft.value = settings.footer_text || "";
  // Apply accent color if saved
  if (settings.accent_color) {
    var sac = ge("setAccentColor"); if (sac) sac.value = settings.accent_color;
    applyAccentColor(settings.accent_color, true);
  }
  // Render districts
  renderDistricts();
  // Toggle chat widget visibility
  var cw = document.querySelector(".chat-wrap");
  if (cw) cw.style.display = settings.chat_enabled === false ? "none" : "";
  // Toggle pro registration
  updateProRegVisibility();
}

async function saveSetting(key, value) {
  settings[key] = value;
  try {
    await sb.from("platform_settings").upsert({ key: key, value: String(value) }, { onConflict: "key" });
    toast("Setting saved!", "ok");
  } catch(e) {
    toast("Failed to save setting", "err");
  }
}

// ── ACCENT COLOR ─────────────────────────────────────────────
function applyAccentColor(hex, silent) {
  document.documentElement.style.setProperty("--g", hex);
  // Darken for hover
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  var dark = "#" + [r,g,b].map(function(c) { return Math.max(0, Math.round(c * 0.8)).toString(16).padStart(2,"0"); }).join("");
  document.documentElement.style.setProperty("--gd", dark);
  if (!silent) saveSetting("accent_color", hex);
}


// ── SQL HELPER ────────────────────────────────────────────────
var SETUP_SQL = [
  "-- MODY Production Schema",
  "-- Run in Supabase → SQL Editor → New Query → Run",
  "",
  "create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, email text, phone text, gender text, role text not null default 'client', pro_id uuid, avatar_url text, suspended boolean default false, created_at timestamptz default now());",
  "create table if not exists public.categories (id uuid default gen_random_uuid() primary key, name_en text not null, name_ka text, name_ru text, emoji text default '💅', icon_url text, subcategories text, show_home boolean default true, show_filter boolean default true, show_signup boolean default true, sort_order int default 0, visible boolean default true, created_at timestamptz default now());",
  "create table if not exists public.subcategories (id uuid default gen_random_uuid() primary key, category_id uuid references public.categories(id) on delete cascade, name_en text not null, name_ka text, name_ru text, emoji text, sort_order int default 0, visible boolean default true, created_at timestamptz default now());",
  "create table if not exists public.professionals (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users(id) on delete cascade, name text not null, specialty text, area text, bio text, price_from int default 50, rating numeric default 5.0, review_count int default 0, emoji text default '💅', avatar_url text, status text not null default 'pending', verified boolean default false, featured boolean default false, years_experience int, created_at timestamptz default now());",
  "create table if not exists public.services (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, name text not null, description text, price int not null default 0, duration int default 60, sort_order int default 0, created_at timestamptz default now());",
  "create table if not exists public.portfolio_images (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, url text not null, sort_order int default 0, created_at timestamptz default now());",
  "create table if not exists public.nail_colors (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, name text not null, hex_code text not null, brand text, code text, sort_order int default 0, created_at timestamptz default now());",
  "create table if not exists public.promo_codes (id uuid default gen_random_uuid() primary key, code text unique not null, discount_type text not null default 'percent', discount_value numeric not null, min_order int default 0, max_uses int, used_count int default 0, expires_at timestamptz, active boolean default true, created_at timestamptz default now());",
  "create table if not exists public.bookings (id uuid default gen_random_uuid() primary key, client_id uuid references auth.users(id), pro_id uuid references public.professionals(id), client_name text, client_phone text, pro_name text, pro_phone text, service_name text, service_price int, promo_code text, discount_amount int default 0, total int, address text, district text, time_slot text, notes text, selected_nail_colors jsonb, design_url text, status text not null default 'pending', created_at timestamptz default now());",
  "create table if not exists public.reviews (id uuid default gen_random_uuid() primary key, booking_id uuid, reviewer_id uuid references auth.users(id), reviewee_id uuid, pro_id uuid references public.professionals(id), reviewer_role text not null, rating int check (rating between 1 and 5), comment text, visible boolean default true, created_at timestamptz default now());",
  "create table if not exists public.messages (id uuid default gen_random_uuid() primary key, thread_id text not null, thread_type text default 'booking', sender_id uuid references auth.users(id), sender_name text, sender_role text, content text not null, created_at timestamptz default now());",
  "create table if not exists public.support_tickets (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users(id), user_name text, user_role text, subject text not null, status text default 'open', priority text default 'normal', created_at timestamptz default now());",
  "create table if not exists public.platform_settings (key text primary key, value text);",
  "create table if not exists public.pro_locations (booking_id uuid primary key, pro_id uuid references public.professionals(id) on delete cascade, lat numeric not null, lng numeric not null, updated_at timestamptz default now());",
  "",
  "alter table public.profiles disable row level security;",
  "alter table public.categories disable row level security;",
  "alter table public.subcategories disable row level security;",
  "alter table public.professionals disable row level security;",
  "alter table public.services disable row level security;",
  "alter table public.portfolio_images disable row level security;",
  "alter table public.nail_colors disable row level security;",
  "alter table public.promo_codes disable row level security;",
  "alter table public.bookings disable row level security;",
  "alter table public.reviews disable row level security;",
  "alter table public.messages disable row level security;",
  "alter table public.support_tickets disable row level security;",
  "alter table public.platform_settings disable row level security;",
  "alter table public.pro_locations disable row level security;",
  "",
  "grant usage on schema public to anon, authenticated;",
  "grant all on all tables in schema public to anon, authenticated;",
  "grant all on all sequences in schema public to anon, authenticated;",
  "",
  "-- Enable realtime for live tracking and booking updates",
  "drop publication if exists supabase_realtime;",
  "create publication supabase_realtime for table public.bookings, public.professionals, public.pro_locations, public.messages;",
  "",
  "insert into public.platform_settings (key,value) values ('promo_enabled','true'),('nail_colors_enabled','true'),('commission','5') on conflict do nothing;",
  "",
  "insert into public.categories (name_en,name_ka,name_ru,emoji,sort_order) values",
  "  ('Nails','ფრჩხილები','Ногти','💅',1),",
  "  ('Makeup','მაკიაჟი','Макияж','💄',2),",
  "  ('Hair','თმა','Волосы','💇',3),",
  "  ('Lashes','წამწამები','Ресницы','👁️',4),",
  "  ('Brows','წარბები','Брови','✨',5)",
  "on conflict do nothing;",
  "",
  "insert into storage.buckets (id,name,public) values",
  "  ('profile-pictures','profile-pictures',true),",
  "  ('portfolio-images','portfolio-images',true)",
  "on conflict do nothing;",
  "",
  "-- Pro calendar tables",
  "create table if not exists public.pro_tasks (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, title text not null, task_date date not null, task_time text, notes text, created_at timestamptz default now());",
  "create table if not exists public.pro_days_off (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, off_date date not null, created_at timestamptz default now());",
  "alter table public.pro_tasks disable row level security;",
  "alter table public.pro_days_off disable row level security;",
  "grant all on public.pro_tasks to anon, authenticated;",
  "grant all on public.pro_days_off to anon, authenticated;",
  "",
  "create table if not exists public.blog_posts (id uuid default gen_random_uuid() primary key, title text not null, content text not null, cover_url text, tags text, published boolean default true, created_at timestamptz default now());",
  "create table if not exists public.static_pages (id uuid default gen_random_uuid() primary key, title text not null, slug text unique not null, content text not null, published boolean default true, created_at timestamptz default now());",
  "alter table public.blog_posts disable row level security;",
  "alter table public.static_pages disable row level security;",
  "grant all on public.blog_posts to anon, authenticated;",
  "grant all on public.static_pages to anon, authenticated;",
  "",
  "-- Make yourself admin (replace YOUR_EMAIL):",
  "-- update public.profiles set role='admin' where email='YOUR_EMAIL';"
].join("\n");

function copySQL() {
  var el = ge("sqlBlock");
  if (el) el.textContent = SETUP_SQL;
  navigator.clipboard.writeText(SETUP_SQL).then(function() {
    toast("SQL copied to clipboard!", "ok");
  }).catch(function() {
    toast("Copy the text from the box above", "ok");
  });
}



// ── SQL for new tables ───────────────────────────────────────
var EXTRA_SQL = [
  "create table if not exists public.pro_tasks (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, title text not null, task_date date not null, task_time text, notes text, created_at timestamptz default now());",
  "create table if not exists public.pro_days_off (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, off_date date not null, created_at timestamptz default now());",
  "alter table public.pro_tasks disable row level security;",
  "alter table public.pro_days_off disable row level security;",
  "grant all on public.pro_tasks to anon, authenticated;",
  "grant all on public.pro_days_off to anon, authenticated;",
  "",
  "-- Hourly availability blocking",
  "create table if not exists public.pro_hours_off (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, off_date date not null, off_hour text not null, created_at timestamptz default now());",
  "alter table public.pro_hours_off disable row level security;",
  "grant all on public.pro_hours_off to anon, authenticated;",
  "create unique index if not exists pro_hours_off_uniq on public.pro_hours_off(pro_id, off_date, off_hour);",
  "",
  "-- Travel buffer column for professionals",
  "alter table public.professionals add column if not exists travel_buffer integer default 60;",
  "",
  "-- Read status for chat messages",
  "alter table public.messages add column if not exists is_read boolean default false;"
].join("\n");

