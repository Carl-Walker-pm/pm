# PRAW Private Messages (`praw.pro/pm`)

Authenticated 1:1 private messaging for PRAW, backed by the shared PRAW Supabase project.

## Live path

- Source of truth: this repo (`Carl-Walker-pm/pm`)
- Served at: [https://praw.pro/pm/](https://praw.pro/pm/) via GitHub Pages on the `PRAW` site (`pm/` folder)

## Stack

- Static HTML/JS (same pattern as PurpleShire Commons chat)
- Supabase Auth + RLS tables: `pm_threads`, `pm_participants`, `pm_messages`
- Helpers: `open_pm_dm(other, body?)`, `mark_pm_read(thread_id)`

## Local

```bash
python3 -m http.server 8080 --bind 127.0.0.1
# open http://127.0.0.1:8080/
```

Sign in with an existing PRAW account.
