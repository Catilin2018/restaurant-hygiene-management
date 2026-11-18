-- Daily Cleaning Log (Shaking Tang Management)
-- Run this once in Supabase SQL Editor: Project -> SQL Editor -> New query -> Paste -> Run.
-- One row per calendar day; the checklist itself is stored as JSON in `data`.

CREATE TABLE IF NOT EXISTS public.daily_cleaning_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_cleaning_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_cleaning_reports TO anon, authenticated;

DROP POLICY IF EXISTS daily_cleaning_reports_all ON public.daily_cleaning_reports;
CREATE POLICY daily_cleaning_reports_all ON public.daily_cleaning_reports
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Done. The web app reads and writes one record per date.
