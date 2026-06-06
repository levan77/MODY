# AMODY Payments (Flitt — authorize & capture)

Payments run on **Supabase Edge Functions** (Cloudflare Pages Functions are not
usable on this project — the deploy runs in Workers advanced-mode and ignores
`functions/`). Money is **held (authorized)** at booking, **captured** after the
service is completed, and **released (reversed)** if cancelled. Every payment is
logged in the `payments` table.

## Live endpoints (Supabase Edge Functions — deployed & ACTIVE)
| Function | URL |
|----------|-----|
| `payment-initiate` | `https://fjlmzaecjxxbukrbohyy.supabase.co/functions/v1/payment-initiate` |
| `payment-webhook`  | `https://fjlmzaecjxxbukrbohyy.supabase.co/functions/v1/payment-webhook` |
| `payment-capture`  | `https://fjlmzaecjxxbukrbohyy.supabase.co/functions/v1/payment-capture` |
| `payment-reverse`  | `https://fjlmzaecjxxbukrbohyy.supabase.co/functions/v1/payment-reverse` |

The browser calls these via `sb.functions.invoke('payment-initiate', ...)`.

## What YOU must do to go live
1. **Set the Flitt secrets** on Supabase → Project → **Edge Functions → Secrets**
   (or `supabase secrets set ...`):
   - `FLITT_MERCHANT_ID` = your Flitt merchant id (number)
   - `FLITT_SECRET_KEY`  = your Flitt secret key
   - `APP_URL` = `https://amody.ge` (optional — defaults to amody.ge)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
2. **In the Flitt merchant dashboard:**
   - Enable **pre-authorization** (two-stage / "hold").
   - Set the **server callback URL** to
     `https://fjlmzaecjxxbukrbohyy.supabase.co/functions/v1/payment-webhook`

## Flow
- Client books → `payment-initiate` reads the booking total **server-side**,
  writes a `pending` payments row, returns a Flitt checkout URL (preauth) →
  browser redirects to Flitt → client authorizes (funds held).
- Flitt calls `payment-webhook` → signature + amount verified → payment
  `authorized`, booking `payment_status = authorized`.
- Pro/admin marks the booking **completed** → `payment-capture` charges the
  held funds → `captured`/`paid`.
- Booking **cancelled** → `payment-reverse` releases the hold → `voided`/`refunded`.

## Statuses
`pending` → `authorized` (held) → `captured`/`paid` · or `voided`/`refunded` · or `failed`.

## Admin
Admin dashboard → **💳 Payments** tab: full ledger (who paid, which pro earns,
amount, platform cut, status, transaction id) + captured/held/revenue totals.
