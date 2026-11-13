# PRAW Project Management (`praw.pro/pm`)

**PM = Project Management.** Private messages are one module inside this workbench.

PRAW.pro is the AI-powered B2B business infrastructure platform. `/pm` is the operating surface for organizations, projects, tasks, opportunities, brands, products, agents, approvals — and inbox.

## Docs

- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — phased roadmap and backlog
- Canvas: PRAW.pro /pm Development Plan (in Cursor)

## Current status

| Module | Status |
|---|---|
| Auth against shared PRAW Supabase | Live in app |
| Private messages (Inbox) | Implemented (schema + UI) |
| Organizations / Projects / Tasks | Next |
| Agent registry / Approvals | Later |
| Commerce pilot | Later |

## Live path

- Source: this repo (`Carl-Walker-pm/pm`)
- Served at: [https://praw.pro/pm/](https://praw.pro/pm/) via GitHub Pages on `Carl-Walker-pm/PRAW` (`pm/` folder)

## Local

```bash
python3 -m http.server 8080 --bind 127.0.0.1
# open http://127.0.0.1:8080/
```

Sign in with an existing PRAW account.
