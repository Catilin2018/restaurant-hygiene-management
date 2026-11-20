# Daily Cleaning Log

A paper-free daily cleaning checklist for iPad, built in the same style as the Orient Mini Market Daily Check. One website serves several restaurants, each with its own private records and its own bookmarked link.

## Features

- **Staff entry** — date, employee, working hours and manager at the top, then 22 tasks grouped into EVERY DAY / Weekly / Special areas
- Each task has a large DONE button and an optional note field
- **Overview** — read-only view of the selected day with completion percentage, notes and signatures
- **History** — every saved date with its completion percentage and employee name; tap a date to review it
- Autosave about 0.7 seconds after the last edit; the dot in the header shows Saved / Saving / error
- Name picker remembers who is using the device (stored per restaurant in the browser)
- Export to Excel: current day, a date range, or all records (Summary + Daily checks + Activity sheets)
- Row Level Security keeps each restaurant's data separate in the shared Supabase table

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app — HTML, CSS and JavaScript in one file |
| `config.js` | Supabase URL/key and the default restaurant display name |
| `supabase/schema.sql` | Run once in Supabase SQL Editor; migrates existing Shaking Tang rows and enables per-restaurant isolation |
| `.github/workflows/deploy.yml` | Publishes the site to GitHub Pages on every push |

## Setup (one time)

1. In Supabase, open **SQL Editor**, create a new query, and paste all of `supabase/schema.sql`.
2. Before running, replace `REPLACE_WITH_ACCESS_CODE` with the private access code for Shaking Tang. The code is deliberately not stored in this public repository.
3. Run the query. It adds `restaurant_slug`, backfills the existing rows to `shaking-tang`, replaces the old global unique date with `(restaurant_slug, report_date)`, and installs the per-restaurant RLS policy.
4. Push to the `main` branch. GitHub Pages publishes automatically.

The Supabase URL and publishable key are already in `config.js`, so nothing needs to be entered on the iPad.

## Restaurant links

The restaurant is chosen by the link, not by a menu on screen. Each iPad gets one bookmark:

```
https://catilin2018.github.io/restaurant-hygiene-management/?r=<slug>&k=<access_code>&n=<display_name>
```

- `r` — the restaurant slug stored in the `restaurants` table
- `k` — that restaurant's private access code, sent as a request header and checked by RLS
- `n` — the name shown in the page header (optional; defaults to the slug)

Staff never see a restaurant picker or type a key. They just open their bookmark.

**Important:** the old plain URL without `?r=...&k=...` no longer opens the app. Replace the iPad bookmark with the full link.

## Adding another restaurant

No code change and no redeploy needed. In Supabase SQL Editor run:

```sql
INSERT INTO public.restaurants (slug, name, access_code)
VALUES ('new-slug', 'New Restaurant Name', 'a-long-random-code-here');
```

Use a different random code for each restaurant. Then send that restaurant its own full link, with `r`, `k` and `n` filled in. Records are written to the same table but RLS only exposes rows whose slug matches the code.

## How records are stored

One row per restaurant per date: `restaurant_slug`, `report_date` plus a JSON `data` object containing the meta fields, the done/note state of all 22 tasks, and a short activity log. Before each save the app re-reads its own row and merges only the fields that changed, so two people editing the same day do not overwrite each other. The name picker and roster are stored in the browser separately for each slug.

## Editing the task list

Change the `TASKS` array near the top of the script in `index.html`, then push. All restaurants get the updated list. Existing records keep their old task IDs; new tasks simply start unchecked.

If different restaurants need different task lists later, that needs a separate task-config table — the current design assumes the checklist is identical everywhere.

## Backups and access

Use **Export** to download an `.xlsx` backup of one day, a range, or all history for the current restaurant; the workbook includes a Restaurant column. Run it per restaurant for a complete backup set.

The Supabase publishable key is public by design. Access control comes from the per-restaurant code in the link plus the RLS policy in `supabase/schema.sql`. Do not publish restaurant links or access codes.

## Troubleshooting

- **"Link not ready"** — the bookmark is missing `?r=` or `&k=`. Use the full link.
- **"Could not open data"** — the code is wrong, or the latest `schema.sql` has not been run.
- **"Not saved"** — the app re-tries on the next edit; check the network and the RLS policy.
- **History empty** — complete a day in Staff entry first; records appear once the dot shows Saved.
