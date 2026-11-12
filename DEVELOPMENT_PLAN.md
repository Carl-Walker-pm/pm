# PRAW.pro /pm — Development Plan

**Positioning:** Empowering Your Business Journey.  
**URL:** `https://praw.pro/pm/`  
**Meaning of PM:** Project Management (private messages are a module, not the product).

## North star

A small but complete B2B business management environment that can run:

**Market opportunity → Business plan → Brand → Product → Marketplace listing → Sales operations → Financial analysis**

with human authority over financial, legal, and irreversible decisions.

## What already exists (reuse)

| Asset | Role in /pm |
|---|---|
| `users`, `profiles`, RBAC, agent principals | People and permissions |
| `groups` / `group_members` | Seed for organizations / teams |
| `team_*` chat | Team channels (Commons) — keep separate from DMs |
| `pm_threads` / `pm_participants` / `pm_messages` | Private messages (Inbox module) |
| `graph_nodes` / `graph_edges` | Portfolio ontology |
| `documents` / `chunks` | Research and business memory |
| `a2a_tasks` | Pattern seed for agent orchestration |
| `audit_log`, `user_presence` | Trail and activity |

**Rule:** one shared PRAW Supabase project. No parallel auth/DB.

## Product shell for /pm

Authenticated workbench with:

- Dashboard
- Projects / Tasks
- Opportunities
- Brands / Products
- Customers
- Agents / Approvals
- Inbox (private messages) — already started

Default landing after sign-in: **Projects** (not Inbox).

## Phases

### Phase 0 — Foundation (in progress)

- Audit existing ontology and security
- Ship `/pm` path on praw.pro
- Private messages inbox

**Exit:** `/pm` live; auth works; DMs work.

### Phase 1 — Core PM (next)

MVP modules:

1. Organizations (extend `groups` or add `organizations`)
2. Projects (org-scoped)
3. Tasks (project-scoped, assignees, priority, status)
4. Documents linked to projects (reuse `documents`)
5. Management dashboard
6. `/pm` app shell (nav + Projects UI + Inbox)

**Exit:** Internal board runs real work inside `/pm`.

### Phase 2 — Business objects

- Customers
- Business opportunities
- Brands
- Products
- Link opportunities → projects

**Exit:** One opportunity tracked end-to-end as a project.

### Phase 3 — AI orchestration

- Agent registry
- Permissions / tool grants
- Task delegation
- Human approval queue
- Execution + cost logs

Reuse `a2a_tasks` patterns. Agents propose; humans approve.

**Exit:** Agent prepares work; approval recorded; audit trail visible.

### Phase 4 — Commerce pilot

One brand, one category, constrained channels:

- Printify + Etsy and/or eBay first
- Amazon / Walmart only after the loop works

**Exit:** Listing → order signal → margin note.

### Phase 5 — B2B customer platform

- Onboarding
- START / GROW / SCALE unlocks
- Customer dashboards
- Managed services + reporting

**Exit:** External customer on START.

### Phase 6 — Ecosystem expansion

Additional marketplaces, marketing automation, media, communities, vertical modules.

## Execution backlog (immediate)

1. Org + Project + Task schema + RLS
2. `/pm` shell with Projects as home; Inbox as module
3. Dashboard + activity
4. Opportunities + Brands
5. Agent registry + approval queue
6. Commerce pilot scaffolding

## Architecture principles

1. Business value before technology
2. Integration before duplication
3. Structured knowledge before autonomous action
4. Human authority over critical decisions
5. Modular domains
6. Measurable results
7. Sustainable economics (track own costs)

## Revenue alignment

| Model | How /pm supports it |
|---|---|
| A — B2B services | Projects/tasks run delivery before full SaaS |
| B — B2B SaaS | Same spine becomes customer self-serve |
| C — Hybrid | Managed → self-serve progression |

## Out of scope for first release

- Full multi-marketplace autonomy
- Exposing internal tools (Cursor, Obsidian, etc.) as customer features
- Autonomous spend / legal actions
- Second database
