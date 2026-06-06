-- ═══════════════════════════════════════════════════════════
--  AMODY — Payments migration (Flitt authorize & capture)
--  Run in the Supabase SQL editor (already applied in production).
-- ═══════════════════════════════════════════════════════════

-- Helper functions (idempotent) — used by RLS below.
create or replace function public.get_my_role() returns text
  language sql stable security definer set search_path = public as $f$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon'); $f$;

create or replace function public.get_my_pro_id() returns uuid
  language sql stable security definer set search_path = public as $f$
  select pro_id from public.profiles where id = auth.uid(); $f$;

-- Booking payment columns.
alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists flitt_order_id text;

-- Payments ledger — one row per payment attempt, logs who/whom/amount/split/status.
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid references public.bookings(id) on delete set null,
  client_id        uuid,           -- who paid
  client_name      text,
  pro_id           uuid,           -- who earns
  pro_name         text,
  amount           integer not null,        -- total charged (GEL)
  currency         text not null default 'GEL',
  service_price    integer default 0,
  discount_amount  integer default 0,
  commission_rate  numeric default 0,
  pro_earnings     integer default 0,       -- net to the professional
  platform_revenue integer default 0,       -- platform's cut
  provider         text not null default 'flitt',
  provider_order_id   text,        -- our order id (= booking id)
  provider_payment_id text,        -- Flitt's payment_id
  status           text not null default 'pending',
                   -- pending | authorized | captured | paid | failed | voided | refunded
  authorized_at    timestamptz,
  captured_at      timestamptz,
  voided_at        timestamptz,
  raw              jsonb,          -- full provider payloads (audit trail)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_payments_booking on public.payments(booking_id);
create index if not exists idx_payments_client  on public.payments(client_id);
create index if not exists idx_payments_pro     on public.payments(pro_id);
create index if not exists idx_payments_status  on public.payments(status);

-- RLS: clients see their own payments, pros see theirs, admins see all.
-- (The Cloudflare functions use the service-role key, which bypasses RLS.)
alter table public.payments enable row level security;
drop policy if exists payments_client_read on public.payments;
drop policy if exists payments_pro_read    on public.payments;
drop policy if exists payments_admin_all   on public.payments;
create policy payments_client_read on public.payments for select using (client_id = auth.uid());
create policy payments_pro_read    on public.payments for select using (pro_id = get_my_pro_id());
create policy payments_admin_all   on public.payments for all    using (get_my_role() = 'admin');
