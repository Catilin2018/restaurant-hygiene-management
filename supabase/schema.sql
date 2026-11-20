-- Daily Cleaning Log - multi-restaurant schema
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Existing Shaking Tang records are preserved and assigned to that restaurant.

-- 1. Private restaurant registry. Never exposed to browser roles directly.
CREATE TABLE IF NOT EXISTS public.restaurants (
  slug text PRIMARY KEY,
  name text NOT NULL,
  access_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Replace REPLACE_WITH_ACCESS_CODE with the private code given to you before running.
-- Keep that code out of this public repository.
INSERT INTO public.restaurants (slug, name, access_code)
VALUES ('shaking-tang', 'Shaking Tang Management', 'REPLACE_WITH_ACCESS_CODE')
ON CONFLICT (slug) DO NOTHING;

REVOKE ALL ON TABLE public.restaurants FROM anon, authenticated;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Security definer helper: checks a slug/code pair without exposing the table.
CREATE OR REPLACE FUNCTION public.restaurant_access_ok(p_slug text, p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE slug = p_slug AND access_code = p_code
  );
$$;

REVOKE ALL ON FUNCTION public.restaurant_access_ok(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_access_ok(text, text) TO anon, authenticated;

-- 3. Reads the per-restaurant headers sent by the web app.
CREATE OR REPLACE FUNCTION public.restaurant_context_ok(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p_slug = COALESCE(current_setting('request.headers', true)::json ->> 'x-restaurant-slug', '')
     AND public.restaurant_access_ok(
           p_slug,
           COALESCE(current_setting('request.headers', true)::json ->> 'x-restaurant-code', '')
         );
$$;

REVOKE ALL ON FUNCTION public.restaurant_context_ok(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_context_ok(text) TO anon, authenticated;

-- 4. Add restaurant column and migrate existing rows.
ALTER TABLE public.daily_cleaning_reports ADD COLUMN IF NOT EXISTS restaurant_slug text;
UPDATE public.daily_cleaning_reports
SET restaurant_slug = 'shaking-tang'
WHERE restaurant_slug IS NULL;
ALTER TABLE public.daily_cleaning_reports ALTER COLUMN restaurant_slug SET DEFAULT 'shaking-tang';
ALTER TABLE public.daily_cleaning_reports ALTER COLUMN restaurant_slug SET NOT NULL;

-- 5. One record per restaurant per day (replaces the old global unique date).
ALTER TABLE public.daily_cleaning_reports
  DROP CONSTRAINT IF EXISTS daily_cleaning_reports_report_date_key;

-- Also handle a uniquely named constraint left by an earlier version.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.daily_cleaning_reports'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.daily_cleaning_reports'::regclass
           AND attname = 'report_date')
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.daily_cleaning_reports DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS daily_cleaning_reports_rest_date_uidx
  ON public.daily_cleaning_reports (restaurant_slug, report_date);

-- 6. Replace the old open policy with per-restaurant isolation.
ALTER TABLE public.daily_cleaning_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_cleaning_reports TO anon, authenticated;

DROP POLICY IF EXISTS daily_cleaning_reports_all ON public.daily_cleaning_reports;
DROP POLICY IF EXISTS daily_cleaning_reports_tenant ON public.daily_cleaning_reports;
CREATE POLICY daily_cleaning_reports_tenant ON public.daily_cleaning_reports
  FOR ALL TO anon, authenticated
  USING (public.restaurant_context_ok(restaurant_slug))
  WITH CHECK (public.restaurant_context_ok(restaurant_slug));

-- Done. Add more restaurants with:
-- INSERT INTO public.restaurants (slug, name, access_code)
-- VALUES ('new-slug', 'New Restaurant Name', 'long-random-code');
-- Then open: https://catilin2018.github.io/restaurant-hygiene-management/?r=new-slug&k=long-random-code&n=New%20Restaurant%20Name
