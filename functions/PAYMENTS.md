# AMODY Payments (Flitt — authorize & capture)

Money is **held (authorized)** when the client books, and **captured** only after
the service is marked **completed**. If a booking is **cancelled**, the hold is
**released (reversed)**. Every payment is logged in the `payments` table.

## Endpoints (Cloudflare Pages Functions)
| Route | Purpose |
|-------|---------|
| `POST /api/payment/initiate` | Reads the booking total **server-side**, creates a pending `payments` row, returns a Flitt checkout URL (preauth). |
| `POST /api/payment/webhook`  | Flitt server callback. Verifies signature + amount, marks the payment `authorized`/`failed`. |
| `POST /api/payment/capture`  | Captures held funds. Only works when the booking is `completed`. |
| `POST /api/payment/reverse`  | Releases a hold. Only works when the booking is `cancelled`. |

## Required environment variables
Set these in **Cloudflare Pages → your project → Settings → Environment variables**
(Production *and* Preview). Mark the secret ones as **encrypted**.

| Variable | Value |
|----------|-------|
| `FLITT_MERCHANT_ID` | Your Flitt merchant id (number) |
| `FLITT_SECRET_KEY` | Your Flitt secret key (**secret**) |
| `APP_URL` | `https://amody.ge` |
| `SUPABASE_URL` | `https://fjlmzaecjxxbukrbohyy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service role** key (**secret**) |

## In the Flitt merchant dashboard
1. Enable **pre-authorization** (two-stage payments / "hold").
2. Set the **server callback URL** to `https://amody.ge/api/payment/webhook`.

## Database
Run `supabase/payment-migration.sql` (already applied) — adds the `payments`
ledger + `bookings.payment_status` / `bookings.flitt_order_id`, with RLS so
clients see only their own payments, pros see theirs, admins see all.

## Payment statuses
`pending` → `authorized` (held) → `captured`/`paid` (charged) · or `voided`/`refunded` (released) · or `failed`.
