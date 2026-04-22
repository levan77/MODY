-- Keepz payment integration — add payment tracking columns to bookings
-- Run in Supabase → SQL Editor → New Query → Run

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS keepz_order_id TEXT;

-- Index for fast webhook lookups by keepz_order_id
CREATE INDEX IF NOT EXISTS bookings_keepz_order_id_idx
  ON public.bookings (keepz_order_id)
  WHERE keepz_order_id IS NOT NULL;
