-- ═══════════════════════════════════════════════════════════
--  MODY — Row Level Security (RLS) Policies
--  Run in Supabase SQL Editor AFTER the initial setup SQL
--
--  Strategy:
--    • Helper function get_my_role() reads profiles.role for the current user
--    • Helper function get_my_pro_id() reads profiles.pro_id for the current user
--    • Admin role gets full bypass via permissive policies
--    • Client/Pro get scoped access to their own data
--    • Anon (logged-out) gets read-only on public data
-- ═══════════════════════════════════════════════════════════

-- ── HELPER FUNCTIONS ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_pro_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pro_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ══════════════════════════════════════════════════════════
--  1. PROFILES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "profiles_select_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_pro_read_clients" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (get_my_role() = 'admin');

-- Pros can read profiles of clients who booked with them (for name/avatar display)
CREATE POLICY "profiles_pro_read_clients" ON public.profiles
  FOR SELECT USING (
    get_my_role() = 'pro'
    AND id IN (
      SELECT client_id FROM public.bookings WHERE pro_id = get_my_pro_id()
    )
  );


-- ══════════════════════════════════════════════════════════
--  2. PROFESSIONALS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- ── NEW COLUMNS (idempotent) ───────────────────────────────
-- region: pro's home base district for cross-region travel fee logic
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT NULL;

-- tier: 'standard' or 'premium' — admin-only field
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (tier IN ('standard', 'premium'));

DROP POLICY IF EXISTS "pros_public_read"   ON public.professionals;
DROP POLICY IF EXISTS "pros_own_read"      ON public.professionals;
DROP POLICY IF EXISTS "pros_own_insert"    ON public.professionals;
DROP POLICY IF EXISTS "pros_own_update"    ON public.professionals;
DROP POLICY IF EXISTS "pros_admin_all"     ON public.professionals;

-- Anyone can read approved professionals (public catalog)
CREATE POLICY "pros_public_read" ON public.professionals
  FOR SELECT USING (status = 'approved');

-- Pro can read their own record regardless of status (for pending/rejected)
CREATE POLICY "pros_own_read" ON public.professionals
  FOR SELECT USING (user_id = auth.uid());

-- Pro can insert their own record (signup)
CREATE POLICY "pros_own_insert" ON public.professionals
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Pro can update their own record, but CANNOT change their tier.
-- The WITH CHECK subquery reads the existing tier value (pre-update snapshot);
-- if the submitted tier differs from the stored tier the row is rejected.
-- Admins bypass this entirely via pros_admin_all (ALL policy takes precedence).
CREATE POLICY "pros_own_update" ON public.professionals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND tier IS NOT DISTINCT FROM (
      SELECT p2.tier FROM public.professionals p2 WHERE p2.id = professionals.id
    )
  );

-- Admins can do everything (approve/reject/edit/delete/change tier)
CREATE POLICY "pros_admin_all" ON public.professionals
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  3. BOOKINGS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_client_read"     ON public.bookings;
DROP POLICY IF EXISTS "bookings_client_insert"    ON public.bookings;
DROP POLICY IF EXISTS "bookings_client_update"    ON public.bookings;
DROP POLICY IF EXISTS "bookings_pro_read"         ON public.bookings;
DROP POLICY IF EXISTS "bookings_pro_update"       ON public.bookings;
DROP POLICY IF EXISTS "bookings_admin_all"        ON public.bookings;
DROP POLICY IF EXISTS "bookings_auth_read_slots"  ON public.bookings;

-- Clients can read their own bookings
CREATE POLICY "bookings_client_read" ON public.bookings
  FOR SELECT USING (client_id = auth.uid());

-- Clients can create bookings
CREATE POLICY "bookings_client_insert" ON public.bookings
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Clients can update their own bookings (confirm arrival, cancel)
CREATE POLICY "bookings_client_update" ON public.bookings
  FOR UPDATE USING (client_id = auth.uid());

-- Pros can read bookings assigned to them
CREATE POLICY "bookings_pro_read" ON public.bookings
  FOR SELECT USING (pro_id = get_my_pro_id());

-- Pros can update bookings assigned to them (accept, on_the_way, etc.)
CREATE POLICY "bookings_pro_update" ON public.bookings
  FOR UPDATE USING (pro_id = get_my_pro_id());

-- Any authenticated user can read booking time slots for availability checking
-- (only exposes pro_id, time_slot, service_name, status — filtered in app)
CREATE POLICY "bookings_auth_read_slots" ON public.bookings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can do everything
CREATE POLICY "bookings_admin_all" ON public.bookings
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  4. SERVICES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_public_read"  ON public.services;
DROP POLICY IF EXISTS "services_pro_insert"   ON public.services;
DROP POLICY IF EXISTS "services_pro_update"   ON public.services;
DROP POLICY IF EXISTS "services_pro_delete"   ON public.services;
DROP POLICY IF EXISTS "services_admin_all"    ON public.services;

-- Anyone can read services (public catalog)
CREATE POLICY "services_public_read" ON public.services
  FOR SELECT USING (true);

-- Pro can manage their own services
CREATE POLICY "services_pro_insert" ON public.services
  FOR INSERT WITH CHECK (pro_id = get_my_pro_id());

CREATE POLICY "services_pro_update" ON public.services
  FOR UPDATE USING (pro_id = get_my_pro_id());

CREATE POLICY "services_pro_delete" ON public.services
  FOR DELETE USING (pro_id = get_my_pro_id());

CREATE POLICY "services_admin_all" ON public.services
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  5. PORTFOLIO_IMAGES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_public_read"  ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_pro_insert"   ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_pro_delete"   ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_admin_all"    ON public.portfolio_images;

CREATE POLICY "portfolio_public_read" ON public.portfolio_images
  FOR SELECT USING (true);

CREATE POLICY "portfolio_pro_insert" ON public.portfolio_images
  FOR INSERT WITH CHECK (pro_id = get_my_pro_id());

CREATE POLICY "portfolio_pro_delete" ON public.portfolio_images
  FOR DELETE USING (pro_id = get_my_pro_id());

CREATE POLICY "portfolio_admin_all" ON public.portfolio_images
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  6. NAIL_COLORS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.nail_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colors_public_read"  ON public.nail_colors;
DROP POLICY IF EXISTS "colors_pro_insert"   ON public.nail_colors;
DROP POLICY IF EXISTS "colors_pro_update"   ON public.nail_colors;
DROP POLICY IF EXISTS "colors_pro_delete"   ON public.nail_colors;
DROP POLICY IF EXISTS "colors_admin_all"    ON public.nail_colors;

CREATE POLICY "colors_public_read" ON public.nail_colors
  FOR SELECT USING (true);

CREATE POLICY "colors_pro_insert" ON public.nail_colors
  FOR INSERT WITH CHECK (pro_id = get_my_pro_id());

CREATE POLICY "colors_pro_update" ON public.nail_colors
  FOR UPDATE USING (pro_id = get_my_pro_id());

CREATE POLICY "colors_pro_delete" ON public.nail_colors
  FOR DELETE USING (pro_id = get_my_pro_id());

CREATE POLICY "colors_admin_all" ON public.nail_colors
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  7. CATEGORIES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all"   ON public.categories;

CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  8. SUBCATEGORIES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subcategories_public_read" ON public.subcategories;
DROP POLICY IF EXISTS "subcategories_admin_all"   ON public.subcategories;

CREATE POLICY "subcategories_public_read" ON public.subcategories
  FOR SELECT USING (true);

CREATE POLICY "subcategories_admin_all" ON public.subcategories
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  9. REVIEWS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_auth_insert"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_own_read"       ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all"      ON public.reviews;

-- Anyone can read visible reviews
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (visible = true);

-- Authenticated users can read their own reviews (even hidden)
CREATE POLICY "reviews_own_read" ON public.reviews
  FOR SELECT USING (reviewer_id = auth.uid());

-- Authenticated users can insert reviews
CREATE POLICY "reviews_auth_insert" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Admins can do everything (moderate, delete)
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  10. MESSAGES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_participant_read"   ON public.messages;
DROP POLICY IF EXISTS "messages_auth_insert"        ON public.messages;
DROP POLICY IF EXISTS "messages_update_read_status" ON public.messages;
DROP POLICY IF EXISTS "messages_admin_all"          ON public.messages;

-- Users can read messages in threads they participate in
-- (booking threads: user is client or pro; support threads: user is ticket owner)
CREATE POLICY "messages_participant_read" ON public.messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      sender_id = auth.uid()
      OR (
        thread_type = 'booking'
        AND thread_id IN (
          SELECT 'booking_' || id FROM public.bookings
          WHERE client_id = auth.uid() OR pro_id = get_my_pro_id()
        )
      )
      OR (
        thread_type = 'support'
        AND thread_id IN (
          SELECT 'ticket_' || id FROM public.support_tickets
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Authenticated users can send messages
CREATE POLICY "messages_auth_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Users can mark messages as read (only is_read field, for messages sent TO them)
CREATE POLICY "messages_update_read_status" ON public.messages
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND sender_id != auth.uid()
  );

-- Admins can do everything
CREATE POLICY "messages_admin_all" ON public.messages
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  11. SUPPORT_TICKETS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_own_read"   ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_auth_insert" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_admin_all"  ON public.support_tickets;

CREATE POLICY "tickets_own_read" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "tickets_auth_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tickets_admin_all" ON public.support_tickets
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  12. PROMO_CODES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promos_public_read_active" ON public.promo_codes;
DROP POLICY IF EXISTS "promos_auth_update_usage"  ON public.promo_codes;
DROP POLICY IF EXISTS "promos_admin_all"          ON public.promo_codes;

-- Anyone can read active promo codes (to validate)
CREATE POLICY "promos_public_read_active" ON public.promo_codes
  FOR SELECT USING (active = true);

-- Authenticated users can increment used_count (via booking)
CREATE POLICY "promos_auth_update_usage" ON public.promo_codes
  FOR UPDATE USING (auth.uid() IS NOT NULL AND active = true);

-- Admins can do everything
CREATE POLICY "promos_admin_all" ON public.promo_codes
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  13. PLATFORM_SETTINGS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_read" ON public.platform_settings;
DROP POLICY IF EXISTS "settings_admin_all"   ON public.platform_settings;

-- Anyone can read settings (needed for app config like open_time, accent_color)
CREATE POLICY "settings_public_read" ON public.platform_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "settings_admin_all" ON public.platform_settings
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  14. PRO_LOCATIONS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.pro_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_pro_manage"    ON public.pro_locations;
DROP POLICY IF EXISTS "locations_client_read"   ON public.pro_locations;
DROP POLICY IF EXISTS "locations_admin_all"     ON public.pro_locations;

-- Pros can manage their own location
CREATE POLICY "locations_pro_manage" ON public.pro_locations
  FOR ALL USING (pro_id = get_my_pro_id());

-- Clients can read location for their active bookings
CREATE POLICY "locations_client_read" ON public.pro_locations
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "locations_admin_all" ON public.pro_locations
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  15. PRO_TASKS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.pro_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_pro_manage" ON public.pro_tasks;
DROP POLICY IF EXISTS "tasks_admin_all"  ON public.pro_tasks;

CREATE POLICY "tasks_pro_manage" ON public.pro_tasks
  FOR ALL USING (pro_id = get_my_pro_id());

CREATE POLICY "tasks_admin_all" ON public.pro_tasks
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  16. PRO_DAYS_OFF
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.pro_days_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daysoff_public_read"  ON public.pro_days_off;
DROP POLICY IF EXISTS "daysoff_pro_manage"   ON public.pro_days_off;
DROP POLICY IF EXISTS "daysoff_admin_all"    ON public.pro_days_off;

-- Anyone can read (for availability filtering)
CREATE POLICY "daysoff_public_read" ON public.pro_days_off
  FOR SELECT USING (true);

-- Pros manage their own
CREATE POLICY "daysoff_pro_manage" ON public.pro_days_off
  FOR ALL USING (pro_id = get_my_pro_id());

CREATE POLICY "daysoff_admin_all" ON public.pro_days_off
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  17. PRO_HOURS_OFF
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.pro_hours_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hoursoff_public_read"  ON public.pro_hours_off;
DROP POLICY IF EXISTS "hoursoff_pro_manage"   ON public.pro_hours_off;
DROP POLICY IF EXISTS "hoursoff_admin_all"    ON public.pro_hours_off;

-- Anyone can read (for availability filtering)
CREATE POLICY "hoursoff_public_read" ON public.pro_hours_off
  FOR SELECT USING (true);

-- Pros manage their own
CREATE POLICY "hoursoff_pro_manage" ON public.pro_hours_off
  FOR ALL USING (pro_id = get_my_pro_id());

CREATE POLICY "hoursoff_admin_all" ON public.pro_hours_off
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  18. BLOG_POSTS
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_public_read"  ON public.blog_posts;
DROP POLICY IF EXISTS "blog_admin_all"    ON public.blog_posts;

-- Anyone can read published posts
CREATE POLICY "blog_public_read" ON public.blog_posts
  FOR SELECT USING (published = true);

CREATE POLICY "blog_admin_all" ON public.blog_posts
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  19. STATIC_PAGES
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages_public_read"  ON public.static_pages;
DROP POLICY IF EXISTS "pages_admin_all"    ON public.static_pages;

-- Anyone can read published pages
CREATE POLICY "pages_public_read" ON public.static_pages
  FOR SELECT USING (published = true);

CREATE POLICY "pages_admin_all" ON public.static_pages
  FOR ALL USING (get_my_role() = 'admin');


-- ══════════════════════════════════════════════════════════
--  DONE! All 19 tables secured with RLS.
-- ══════════════════════════════════════════════════════════
