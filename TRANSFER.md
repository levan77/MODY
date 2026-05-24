# MODY — Local Setup & Transfer Guide

## What This Is

**MODY** is a single-page beauty-services booking platform built as one self-contained file:
`index.html` (~10 600 lines). All HTML, CSS, and JavaScript live in that one file.
Supabase is the backend (auth + Postgres + realtime). Cloudflare Pages/Workers handles hosting.

---

## Files

```
MODY/
├── index.html          ← The entire app (edit this)
├── index-modular.html  ← Modular WIP (ignore for now)
├── wrangler.jsonc      ← Cloudflare Pages config
├── supabase/
│   └── rls-policies.sql
├── assets/
│   ├── favicon.svg
│   └── logo.svg
├── css/                ← (unused by index.html; for future modular build)
└── js/                 ← (unused by index.html; for future modular build)
```

---

## Running Locally

### Option A — Plain browser (quickest)

```bash
# Just open the file directly
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

> Auth callbacks won't work over `file://`. Use Option B for login/signup testing.

### Option B — Local HTTP server (recommended)

```bash
# Python (no install needed)
python3 -m http.server 8080
# then open http://localhost:8080

# OR Node (if you have npx)
npx serve .
```

### Option C — Cloudflare Wrangler (mirrors production)

```bash
npm install -g wrangler
wrangler pages dev .
# serves on http://localhost:8788
```

---

## Supabase Config

The project already points to the live Supabase project — credentials are in `index.html`:

```
Line 2680: var SB_URL = "https://fjlmzaecjxxbukrbohyy.supabase.co";
Line 2681: var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

These are the **anon/public** keys — safe to leave in client-side code.

### First-time DB setup (new Supabase project)

1. Go to `index.html` in the browser → scroll to the **Admin** tab → **Setup** section
2. Click **Copy SQL** — this copies the full schema SQL (tables, indexes, RLS grants, seed data)
3. Paste into **Supabase → SQL Editor → New Query** → Run

Alternatively, find the SQL block in `index.html` at line ~2997 (`var SETUP_SQL = [...]`).

---

## Key Architecture Notes

| Concern | Where |
|---|---|
| All UI | `index.html` — single file |
| Language (EN/KA/RU) | `var LANGS` object, `applyLang()`, `t()` helper |
| Categories | `loadCategories()` → `allCats` / `categories` globals |
| Subcategories | `loadSubCategories()` → `allSubCats` |
| Predefined services | `loadCategoryServices()` → `allCatSvcs` |
| Professionals | `loadPros()` → `allPros` |
| Active category filter | `activeFilter` (string: category `name_en` or `"All"`) |
| Active service filter | `activeServiceFilter` (UUID of `category_services.id` or `null`) |
| Filtered pro IDs cache | `_svcFilterProIds` (array or `null`) |
| Auth session | `user`, `profile` globals; set in `loadProfile()` |
| Realtime | `subscribeRealtime()` — Supabase Postgres changes |

---

## Recent Changes (what was implemented in this session)

### 1. Security hardening
- XSS fixes: all user-content now goes through `escapeHtml()`
- Extracted `safeCssHex()` for nail-color CSS values
- All empty `catch` blocks now log warnings

### 2. Structured service categories (PR #1)
- New `category_services` DB table (predefined per-category service names, EN/KA/RU)
- `services` table gains `category_service_id` (FK) and `status` columns
- **Service filter chips** appear below category chips — click to filter pros by service
- Pros' Add Service modal: dropdown of predefined services; custom = pending approval
- Admin panel: manage predefined services, approve/reject custom ones
- `rejectSvc()` sets `status = 'rejected'` (no hard-delete, preserves booking history)

---

## Deploying to Cloudflare Pages

```bash
# Push to the repo — Cloudflare auto-deploys from main
git add index.html
git commit -m "your message"
git push origin main
```

If Cloudflare isn't picking up changes, check:
- **Cloudflare Dashboard → Pages → mody → Deployments** — confirm a new deploy triggered
- The `wrangler.jsonc` `assets.directory` must be `"./"` (it is)
- Branch in Cloudflare settings must match the branch you pushed to

---

## Git Branches

| Branch | Purpose |
|---|---|
| `main` | Production |
| `claude/fix-buttons-mobile-chat-J2bbS` | Current feature branch (PR #1 + fixes) |

---

## Supabase Tables (summary)

| Table | Description |
|---|---|
| `profiles` | User profiles (client + pro info) |
| `professionals` | Pro listings (rating, area, specialty…) |
| `categories` | Service categories (Nails, Hair, Makeup…) |
| `sub_categories` | Subcategories per category |
| `category_services` | Predefined service names per category (EN/KA/RU) ← new |
| `services` | Services offered by each pro; now has `category_service_id` + `status` ← updated |
| `bookings` | Client bookings |
| `reviews` | Reviews left after bookings |
| `messages` | Chat messages |
| `nail_colors` | Nail color swatches per pro |
| `portfolio_images` | Portfolio photos per pro |
| `pro_days_off` | Days off per pro |
| `pro_hours_off` | Blocked hours per pro |
| `settings` | App-wide settings (toggles, fees…) |
| `wallet_transactions` | Wallet credit/debit log |
