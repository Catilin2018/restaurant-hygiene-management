# Daily Cleaning Log

A paper-free replacement for the *Daily Cleaning List* spreadsheet, built for iPad.

The layout follows the original Excel file: every task is a row, days 1-31 are columns, and each section has a weekly "Checked by" sign-off row. Staff totals from the second sheet are kept as two blocks of six names. Records are stored in Supabase, so nothing has to be printed.

## Features

- 31-day tick grid, grouped into EVERY DAY / Weekly / Special areas, exactly as in the sheet
- Tap a square to mark a task done, tap again to undo
- Five weekly sign-off fields per section (days 1-7, 8-14, 15-21, 22-28, 29-31)
- Month switching, progress summary and today's completion count
- Staff totals: two blocks, six names, saved per date
- CSV export for the monthly checklist and for staff totals
- Large touch targets, sticky task names and horizontal scrolling for iPad

## 1. Set up Supabase

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**, create a new query, paste the whole contents of `supabase/schema.sql`, and run it. This creates four tables and seeds the 22 tasks from the Excel file.
3. Open **Project Settings -> API** and copy the **Project URL** and the **anon / public** key.

Do not use the `service_role` key — it must never appear in a web page.

## 2. Deploy to GitHub Pages

1. Create a new, empty GitHub repository.
2. Copy the files of this folder into the repository root and push to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Daily cleaning log"
   git remote add origin https://github.com/<your-account>/<your-repo>.git
   git push -u origin main
   ```
3. In the repository, go to **Settings -> Pages -> Build and deployment**, set **Source** to **GitHub Actions**. The included workflow in `.github/workflows/deploy.yml` will publish the site automatically on every push.
4. Your page will be at `https://<your-account>.github.io/<your-repo>/`.

Alternative: set **Source** to **Deploy from a branch**, choose `main` / `Root`, and save — no Actions needed.

## 3. Connect the page

1. Open the published page on the iPad.
2. Tap **Settings**, paste the Project URL and anon key, then **Save & connect**.
3. The values are stored only in that browser. Repeat once on each iPad that will be used.
4. Optional: Safari -> Share -> **Add to Home Screen** so it opens like an app.

**Preview only** lets you try the layout without saving anything.

## Where the data goes

| Table | Contents |
| --- | --- |
| `cleaning_tasks` | Task label, section, order, and which row gets a sign-off line |
| `cleaning_checks` | One row per task per day per month: done / not done |
| `cleaning_signoffs` | Weekly "Checked by" name per section per month |
| `staff_totals` | Name and total per block, date and person |

The page writes one cell at a time, so a slow connection does not block the whole grid. If a save fails, a message appears at the bottom of the screen.

## Backups

Use **Export CSV** to download the current month as `cleaning-YYYY-MM.csv`, and **Export staff CSV** for the staff totals. Keep these files in your usual backup location.

## Changing the task list

Edit the rows in `cleaning_tasks` with Supabase's Table Editor, or change the seed values in `supabase/schema.sql` and run it again (existing IDs are updated, not duplicated). The wording from the original sheet is kept exactly, including "Bain Marle", "wash mach", "Cocking" and "Scrath" — correct it there if you want cleaner labels.

## Access note

The page is static and uses the anon key, which is visible in the browser. The SQL policies allow that key to read and write this app's data, so anyone with the page URL and the key can change records. Keep the link internal. If you later need per-person accounts, add Supabase Auth and tighten the policies to check `auth.uid()`.

## Troubleshooting

- **"Could not connect"** — check the URL/key, and confirm `schema.sql` ran without errors.
- **"Setup needed"** banner — the `cleaning_tasks` table is empty; run the SQL again or tap **Load sample tasks**.
- **Grid does not load checks** — tap **Sync**; also check the browser has internet access for the Supabase script.
- **A save fails** — check the four RLS policies in `supabase/schema.sql` and the anon key.
