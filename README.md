# Daily Cleaning Log

A paper-free daily cleaning checklist for iPad, built in the same style as the Orient Mini Market Daily Check.

Open the page, pick the date, fill in who worked and the working hours, then tick each cleaning task as it is done. Everything is saved automatically to Supabase — one record per calendar day. No setup screen, no keys to type on the iPad.

## Features

- **Staff entry** — date, employee, working hours and manager at the top, then 22 tasks grouped into EVERY DAY / Weekly / Special areas
- Each task has a large DONE button and an optional note field
- **Overview** — read-only view of the selected day with completion percentage, notes and signatures
- **History** — every saved date with its completion percentage and employee name; tap a date to review it
- Autosave about 0.7 seconds after the last edit; the dot in the header shows Saved / Saving / error
- Name picker remembers who is using the device (stored only in the browser)
- Export to Excel: current day, a date range, or all records (Summary + Daily checks + Activity sheets)

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app — HTML, CSS and JavaScript in one file |
| `config.js` | Supabase project URL and publishable key; already filled in |
| `supabase/schema.sql` | Run once in Supabase SQL Editor to create `daily_cleaning_reports` |
| `.github/workflows/deploy.yml` | Publishes the site to GitHub Pages on every push |

## Setup

1. In Supabase, open **SQL Editor**, create a new query, paste all of `supabase/schema.sql`, and run it. This creates one table, `daily_cleaning_reports`. (The old four tables from the first version are not used; they can be left alone.)
2. Push this folder to a GitHub repository on the `main` branch. In **Settings -> Pages -> Build and deployment**, set **Source** to **GitHub Actions**. The page will appear at `https://<account>.github.io/<repo>/`.
3. On the iPad, open the page in Safari. Optionally use **Share -> Add to Home Screen**.

The Supabase URL and publishable key are already in `config.js`, so nothing needs to be entered on the device.

## How records are stored

One row per date: `report_date` plus a JSON `data` object containing the meta fields, the done/note state of all 22 tasks, and a short activity log. Before each save the app re-reads the row and merges only the fields that changed, so two people editing at the same time do not overwrite each other.

## Editing the task list

Change the `TASKS` array near the top of the script in `index.html`, then push. Existing records keep their old task IDs; new tasks simply start unchecked.

## Backups and access

Use **Export** to download an `.xlsx` backup of one day, a range, or all history. The publishable key is meant to be public in a browser app; the RLS policy in `supabase/schema.sql` allows read/write, so anyone with the site URL can edit records. Keep the link internal. For per-person accounts later, add Supabase Auth and tighten the policy.

## Troubleshooting

- **"Could not load cloud data"** — check that `supabase/schema.sql` was run and that `config.js` has the correct URL/key.
- **"Not saved"** — the app re-tries on the next edit; check the network and the RLS policy.
- **History empty** — complete a day in Staff entry first; records appear once the dot shows Saved.
