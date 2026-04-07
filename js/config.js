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
    id:"d1", name:"Nino Beridze", name_ka:"ნინო ბერიძე", name_ru:"Нино Беридзе",
    specialty:"Nails", specialty_ka:"ფრჩხილები", specialty_ru:"Ногти",
    area:"Vake", area_ka:"ვაკე", area_ru:"Ваке",
    rating:4.9, review_count:128, price_from:45, emoji:"\uD83D\uDC85", status:"approved",
    bio:"5+ years in gel and acrylic nail art. Certified by Georgian Beauty Academy.",
    bio_ka:"5+ წლიანი გამოცდილება გელ და აკრილის ფრჩხილის ხელოვნებაში.",
    bio_ru:"5+ лет опыта в гелевом и акриловом нейл-арте.",
    nail_colors_enabled:true,
    services:[
      {id:"ds1",name:"Classic Gel Manicure",name_ka:"კლასიკური გელ მანიკური",name_ru:"Классический гель маникюр",price:55,duration:60,description:"Soak-off gel, long lasting",description_ka:"გელ-ლაქი, დიდხანს ძლებს",description_ru:"Гель-лак, долговечный"},
      {id:"ds2",name:"Nail Art Design",name_ka:"ფრჩხილის დიზაინი",name_ru:"Дизайн ногтей",price:75,duration:90,description:"Custom patterns and designs",description_ka:"ინდივიდუალური ნიმუშები და დიზაინი",description_ru:"Индивидуальные узоры и дизайн"},
      {id:"ds3",name:"Acrylic Full Set",name_ka:"აკრილის სრული ნაკრები",name_ru:"Полный набор акрила",price:90,duration:120,description:"Full acrylic extensions",description_ka:"სრული აკრილის გაფართოება",description_ru:"Полное акриловое наращивание"},
      {id:"ds4",name:"Pedicure Deluxe",name_ka:"პედიკური დელუქსი",name_ru:"Педикюр Делюкс",price:65,duration:75,description:"Relaxing spa pedicure",description_ka:"რელაქსის სპა პედიკური",description_ru:"Расслабляющий спа педикюр"}
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
    id:"d2", name:"Mariam Kiknadze", name_ka:"მარიამ კიკნაძე", name_ru:"Мариам Кикнадзе",
    specialty:"Makeup", specialty_ka:"მაკიაჟი", specialty_ru:"Макияж",
    area:"Saburtalo", area_ka:"საბურთალო", area_ru:"Сабуртало",
    rating:4.8, review_count:94, price_from:60, emoji:"\uD83D\uDC84", status:"approved",
    bio:"Bridal and editorial makeup specialist. 200+ brides served across Georgia.",
    bio_ka:"საქორწილო და სარედაქციო მაკიაჟის სპეციალისტი. 200+ პატარძალი მთელ საქართველოში.",
    bio_ru:"Специалист по свадебному и редакционному макияжу. 200+ невест по всей Грузии.",
    services:[
      {id:"ds5",name:"Bridal Makeup",name_ka:"საქორწილო მაკიაჟი",name_ru:"Свадебный макияж",price:180,duration:120,description:"Full glam bridal look",description_ka:"სრული გლამურული საქორწილო იერი",description_ru:"Полный гламурный свадебный образ"},
      {id:"ds6",name:"Evening Glam",name_ka:"საღამოს გლამური",name_ru:"Вечерний гламур",price:90,duration:60,description:"Party-ready glamour",description_ka:"წვეულებისთვის მზა გლამური",description_ru:"Гламур для вечеринки"},
      {id:"ds7",name:"Natural Day Look",name_ka:"ბუნებრივი დღის მაკიაჟი",name_ru:"Натуральный дневной макияж",price:65,duration:45,description:"Fresh everyday makeup",description_ka:"ყოველდღიური ნატურალური მაკიაჟი",description_ru:"Свежий повседневный макияж"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
      "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400"
    ]
  },
  {
    id:"d3", name:"Tamar Jibladze", name_ka:"თამარ ჯიბლაძე", name_ru:"Тамар Джибладзе",
    specialty:"Hair", specialty_ka:"თმა", specialty_ru:"Волосы",
    area:"Isani", area_ka:"ისანი", area_ru:"Исани",
    rating:4.7, review_count:67, price_from:40, emoji:"\uD83D\uDC87", status:"approved",
    bio:"Hair styling expert — blowouts, braids, and color treatments.",
    bio_ka:"თმის სტილისტი — უტყუარი, წნული და ფერის მკურნალობა.",
    bio_ru:"Эксперт по укладке волос — укладки, косы и окрашивание.",
    services:[
      {id:"ds8",name:"Blowout & Style",name_ka:"უტყუარი და სტილი",name_ru:"Укладка и стиль",price:55,duration:60,description:"Professional blowout",description_ka:"პროფესიონალური უტყუარი",description_ru:"Профессиональная укладка"},
      {id:"ds9",name:"Hair Braiding",name_ka:"თმის წნულები",name_ru:"Плетение волос",price:70,duration:90,description:"All types of braids",description_ka:"ყველა ტიპის წნული",description_ru:"Все виды кос"},
      {id:"ds10",name:"Color Treatment",name_ka:"ფერის მკურნალობა",name_ru:"Окрашивание",price:120,duration:150,description:"Full color or highlights",description_ka:"სრული ფერი ან ჰაილაითები",description_ru:"Полное окрашивание или мелирование"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400"
    ]
  },
  {
    id:"d4", name:"Keti Lomidze", name_ka:"ქეთი ლომიძე", name_ru:"Кети Ломидзе",
    specialty:"Lashes", specialty_ka:"წამწამები", specialty_ru:"Ресницы",
    area:"Didi Dighomi", area_ka:"დიდი დიღომი", area_ru:"Диди Дигоми",
    rating:5.0, review_count:210, price_from:70, emoji:"\uD83D\uDC41", status:"approved",
    bio:"Master lash technician. 5-star rating maintained for 3 years.",
    bio_ka:"მაღალი კლასის წამწამების ტექნიკოსი. 5-ვარსკვლავიანი რეიტინგი 3 წელია.",
    bio_ru:"Мастер-технолог по ресницам. 5-звёздочный рейтинг 3 года подряд.",
    services:[
      {id:"ds11",name:"Classic Lash Set",name_ka:"კლასიკური წამწამები",name_ru:"Классические ресницы",price:80,duration:90,description:"Natural-looking lashes",description_ka:"ბუნებრივი იერის წამწამები",description_ru:"Натуральные ресницы"},
      {id:"ds12",name:"Volume Lash Set",name_ka:"მოცულობითი წამწამები",name_ru:"Объёмные ресницы",price:110,duration:120,description:"Full dramatic volume",description_ka:"სრული დრამატული მოცულობა",description_ru:"Полный драматический объём"},
      {id:"ds13",name:"Lash Lift & Tint",name_ka:"წამწამის აწევა და შეღებვა",name_ru:"Ламинирование и окрашивание ресниц",price:75,duration:60,description:"Lift natural lashes",description_ka:"ბუნებრივი წამწამების აწევა",description_ru:"Подъём натуральных ресниц"}
    ],
    portfolio:[
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400"
    ]
  },
  {
    id:"d5", name:"Lika Mgeladze", name_ka:"ლიკა მგელაძე", name_ru:"Лика Мгеладзе",
    specialty:"Brows", specialty_ka:"წარბები", specialty_ru:"Брови",
    area:"Vera", area_ka:"ვერა", area_ru:"Вера",
    rating:4.9, review_count:51, price_from:35, emoji:"\u2728", status:"approved",
    bio:"Brow design: threading, waxing, lamination, microblading.",
    bio_ka:"წარბების დიზაინი: თრედინგი, ვაქსი, ლამინირება, მიკრობლეიდინგი.",
    bio_ru:"Дизайн бровей: тридинг, воск, ламинирование, микроблейдинг.",
    services:[
      {id:"ds14",name:"Brow Lamination",name_ka:"წარბების ლამინირება",name_ru:"Ламинирование бровей",price:65,duration:60,description:"Fluffy brushed-up brows",description_ka:"პუფიანი აწეული წარბები",description_ru:"Пушистые приподнятые брови"},
      {id:"ds15",name:"Microblading",name_ka:"მიკრობლეიდინგი",name_ru:"Микроблейдинг",price:250,duration:180,description:"Semi-permanent tattooing",description_ka:"ნახევრად მუდმივი ტატუირება",description_ru:"Полуперманентная татуировка"},
      {id:"ds16",name:"Threading & Tint",name_ka:"თრედინგი და შეღებვა",name_ru:"Тридинг и окрашивание",price:40,duration:30,description:"Shape + color",description_ka:"ფორმა + ფერი",description_ru:"Форма + цвет"}
    ],
    portfolio:[]
  },
  {
    id:"d6", name:"Ana Kvariani", name_ka:"ანა კვარიანი", name_ru:"Ана Квариани",
    specialty:"Makeup", specialty_ka:"მაკიაჟი", specialty_ru:"Макияж",
    area:"Mtatsminda", area_ka:"მთაწმინდა", area_ru:"Мтацминда",
    rating:4.9, review_count:88, price_from:70, emoji:"\uD83C\uDF1F", status:"approved",
    bio:"Film and TV makeup artist available for private bookings.",
    bio_ka:"კინო და ტელე მაკიაჟის არტისტი, ხელმისაწვდომია პირადი ჯავშნისთვის.",
    bio_ru:"Визажист кино и ТВ, доступен для частных бронирований.",
    services:[
      {id:"ds17",name:"Special FX Makeup",name_ka:"სპეციალური ეფექტების მაკიაჟი",name_ru:"Спецэффекты макияж",price:200,duration:120,description:"Film-grade effects",description_ka:"კინო დონის ეფექტები",description_ru:"Эффекты киноуровня"},
      {id:"ds18",name:"Airbrush Makeup",name_ka:"ეარბრაშ მაკიაჟი",name_ru:"Аэрограф макияж",price:120,duration:75,description:"Flawless airbrush application",description_ka:"უნაკლო ეარბრაშ აპლიკაცია",description_ru:"Безупречное нанесение аэрографом"}
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

// ── MULTILINGUAL HELPERS (pro/service names) ─────────────────
function proName(p) {
  if (lang === "ka" && p.name_ka) return p.name_ka;
  if (lang === "ru" && p.name_ru) return p.name_ru;
  return p.name;
}
function proSpec(p) {
  if (lang === "ka" && p.specialty_ka) return p.specialty_ka;
  if (lang === "ru" && p.specialty_ru) return p.specialty_ru;
  // fallback: try matching category translation
  var cat = categories.find(function(c) { return c.name_en === p.specialty; });
  if (cat) {
    if (lang === "ka" && cat.name_ka) return cat.name_ka;
    if (lang === "ru" && cat.name_ru) return cat.name_ru;
  }
  return p.specialty || "";
}
function proArea(p) {
  if (lang === "ka" && p.area_ka) return p.area_ka;
  if (lang === "ru" && p.area_ru) return p.area_ru;
  return p.area || "";
}
function proBio(p) {
  if (lang === "ka" && p.bio_ka) return p.bio_ka;
  if (lang === "ru" && p.bio_ru) return p.bio_ru;
  return p.bio || "";
}
function svcName(s) {
  if (lang === "ka" && s.name_ka) return s.name_ka;
  if (lang === "ru" && s.name_ru) return s.name_ru;
  return s.name;
}
function svcDesc(s) {
  if (lang === "ka" && s.description_ka) return s.description_ka;
  if (lang === "ru" && s.description_ru) return s.description_ru;
  return s.description || "";
}


// ── PLATFORM SETTINGS ─────────────────────────────────────────
var settings = { promo_enabled: true, nail_colors_enabled: true, commission: 5, platform_fee: 5, chat_enabled: true, pro_registration_enabled: true, reviews_enabled: true, auto_accept: false, min_order: 0, cancel_hours: 2, brand_name: "Le' mody", open_time: "10:00", close_time: "20:00", advance_days: 30, email_notifications: true, sms_notifications: false };

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
  var sbn = ge("setBrandName");  if (sbn) sbn.value = settings.brand_name || "Le' mody";
  var sot = ge("setOpenTime");   if (sot) sot.value = settings.open_time || "10:00";
  var sct = ge("setCloseTime");  if (sct) sct.value = settings.close_time || "20:00";
  var sad = ge("setAdvDays");    if (sad) sad.value = settings.advance_days || 30;
  var sen = ge("setEmailNotif"); if (sen) sen.checked = settings.email_notifications !== false;
  var ssn = ge("setSmsNotif");   if (ssn) ssn.checked = settings.sms_notifications === true || settings.sms_notifications === "true";
  var sae = ge("setAlertEmail"); if (sae) sae.value = settings.alert_email || "";
  var sht = ge("setHeroTag");    if (sht) sht.value = settings.hero_tagline || "";
  var sft = ge("setFooterTxt");  if (sft) sft.value = settings.footer_text || "";
  // Twilio settings
  var ste = ge("setTwilioEnabled"); if (ste) ste.checked = settings.twilio_enabled === true || settings.twilio_enabled === "true";
  var sts = ge("setTwilioSid");     if (sts) sts.value = settings.twilio_account_sid || "";
  var stt = ge("setTwilioToken");   if (stt) stt.value = settings.twilio_auth_token || "";
  var stf = ge("setTwilioFrom");    if (stf) stf.value = settings.twilio_from_number || "";
  var stc = ge("setTwilioChannel"); if (stc) stc.value = settings.twilio_channel || "sms";
  var sap = ge("setAdminPhone");    if (sap) sap.value = settings.admin_phone || "";
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
  // Kill switch
  var sks = ge("setKillSwitch"); if (sks) sks.checked = settings.kill_switch === true || settings.kill_switch === "true";
  // Distance / travel fee
  var sdfe = ge("setDistFeeEnabled"); if (sdfe) sdfe.checked = settings.distance_fee_enabled === true || settings.distance_fee_enabled === "true";
  // Special tariff
  var stt2 = ge("setTariffEnabled"); if (stt2) stt2.checked = settings.special_tariff_enabled === true || settings.special_tariff_enabled === "true";
  var stpct = ge("setTariffPercent"); if (stpct) stpct.value = settings.special_tariff_percent || 20;
  // Retention
  var sret = ge("setRetentionEnabled"); if (sret) sret.checked = settings.retention_enabled === true || settings.retention_enabled === "true";
  var sretd = ge("setRetentionDays"); if (sretd) sretd.value = settings.retention_days || 21;
  // Show/hide kill switch banner on client side
  var ksb = ge("killSwitchBanner");
  if (ksb) ksb.style.display = (settings.kill_switch === true || settings.kill_switch === "true") ? "block" : "none";
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
  "create table if not exists public.notifications (id uuid default gen_random_uuid() primary key, type text not null, message text not null, data jsonb, read boolean default false, created_at timestamptz default now());",
  "alter table public.notifications enable row level security;",
  "grant all on public.notifications to anon, authenticated;",
  "alter table public.bookings add column if not exists service_duration integer default 60;",
  "alter table public.professionals add column if not exists work_start text default '09:00';",
  "alter table public.professionals add column if not exists work_end text default '19:00';",
  "alter table public.professionals add column if not exists commission_rate numeric default 0;",
  "alter table public.professionals add column if not exists travel_buffer integer default 60;",
  "create table if not exists public.pro_locations (booking_id uuid primary key, pro_id uuid references public.professionals(id) on delete cascade, lat numeric not null, lng numeric not null, updated_at timestamptz default now());",
  "alter table public.services add column if not exists visible boolean default true;",
  "alter table public.profiles add column if not exists blocked boolean default false;",
  "alter table public.profiles add column if not exists block_reason text;",
  "create table if not exists public.client_notes (id uuid default gen_random_uuid() primary key, client_id uuid references auth.users(id) on delete cascade, note text, created_at timestamptz default now(), updated_by text);",
  "alter table public.client_notes enable row level security;",
  "grant all on public.client_notes to anon, authenticated;",
  "create table if not exists public.incidents (id uuid default gen_random_uuid() primary key, booking_id uuid references public.bookings(id) on delete set null, client_id uuid, pro_id uuid, subject text not null, description text, status text default 'open', credit_amount int default 0, credit_type text, resolved_at timestamptz, created_at timestamptz default now());",
  "alter table public.incidents enable row level security;",
  "grant all on public.incidents to anon, authenticated;",
  "alter table public.bookings add column if not exists travel_fee_requested int default 0;",
  "alter table public.bookings add column if not exists travel_fee_status text;",
  "alter table public.bookings add column if not exists travel_fee_reason text;",
  "create table if not exists public.client_wallets (client_id uuid primary key references auth.users(id) on delete cascade, balance int default 0, updated_at timestamptz default now());",
  "alter table public.client_wallets enable row level security;",
  "grant all on public.client_wallets to anon, authenticated;",
  "create table if not exists public.wallet_transactions (id uuid default gen_random_uuid() primary key, client_id uuid references auth.users(id) on delete cascade, amount int not null, type text not null, description text, created_at timestamptz default now());",
  "alter table public.wallet_transactions enable row level security;",
  "grant all on public.wallet_transactions to anon, authenticated;",
  "create table if not exists public.retention_queue (id uuid default gen_random_uuid() primary key, booking_id uuid references public.bookings(id) on delete set null, client_id uuid, client_phone text, client_name text, service_name text, pro_name text, send_at timestamptz not null, status text default 'pending', sent_at timestamptz, created_at timestamptz default now());",
  "alter table public.retention_queue enable row level security;",
  "grant all on public.retention_queue to anon, authenticated;",
  "alter table public.professionals add column if not exists name_ka text;",
  "alter table public.professionals add column if not exists name_ru text;",
  "alter table public.professionals add column if not exists specialty_ka text;",
  "alter table public.professionals add column if not exists specialty_ru text;",
  "alter table public.professionals add column if not exists bio_ka text;",
  "alter table public.professionals add column if not exists bio_ru text;",
  "alter table public.professionals add column if not exists area_ka text;",
  "alter table public.professionals add column if not exists area_ru text;",
  "alter table public.services add column if not exists name_ka text;",
  "alter table public.services add column if not exists name_ru text;",
  "alter table public.services add column if not exists description_ka text;",
  "alter table public.services add column if not exists description_ru text;",
  "",
  "alter table public.profiles enable row level security;",
  "alter table public.categories enable row level security;",
  "alter table public.subcategories enable row level security;",
  "alter table public.professionals enable row level security;",
  "alter table public.services enable row level security;",
  "alter table public.portfolio_images enable row level security;",
  "alter table public.nail_colors enable row level security;",
  "alter table public.promo_codes enable row level security;",
  "alter table public.bookings enable row level security;",
  "alter table public.reviews enable row level security;",
  "alter table public.messages enable row level security;",
  "alter table public.support_tickets enable row level security;",
  "alter table public.platform_settings enable row level security;",
  "alter table public.pro_locations enable row level security;",
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
  "alter table public.pro_tasks enable row level security;",
  "alter table public.pro_days_off enable row level security;",
  "grant all on public.pro_tasks to anon, authenticated;",
  "grant all on public.pro_days_off to anon, authenticated;",
  "",
  "create table if not exists public.blog_posts (id uuid default gen_random_uuid() primary key, title text not null, content text not null, cover_url text, tags text, published boolean default true, created_at timestamptz default now());",
  "create table if not exists public.static_pages (id uuid default gen_random_uuid() primary key, title text not null, slug text unique not null, content text not null, published boolean default true, created_at timestamptz default now());",
  "alter table public.blog_posts enable row level security;",
  "alter table public.static_pages enable row level security;",
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
  "alter table public.pro_tasks enable row level security;",
  "alter table public.pro_days_off enable row level security;",
  "grant all on public.pro_tasks to anon, authenticated;",
  "grant all on public.pro_days_off to anon, authenticated;",
  "",
  "-- Hourly availability blocking",
  "create table if not exists public.pro_hours_off (id uuid default gen_random_uuid() primary key, pro_id uuid references public.professionals(id) on delete cascade, off_date date not null, off_hour text not null, created_at timestamptz default now());",
  "alter table public.pro_hours_off enable row level security;",
  "grant all on public.pro_hours_off to anon, authenticated;",
  "create unique index if not exists pro_hours_off_uniq on public.pro_hours_off(pro_id, off_date, off_hour);",
  "",
  "-- Travel buffer column for professionals",
  "alter table public.professionals add column if not exists travel_buffer integer default 60;",
  "",
  "-- Read status for chat messages",
  "alter table public.messages add column if not exists is_read boolean default false;",
  "",
  "-- Years of experience for professionals",
  "alter table public.professionals add column if not exists years_experience integer default 0;"
].join("\n");

