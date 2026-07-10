# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> A more detailed agent guide already exists at [`AGENTS.md`](AGENTS.md). This file is the concise entry point; read `AGENTS.md` for CAPEX implementation status, known-flaky tests, and coding conventions.

## Repository layout

The real application lives under `som-platform/` and is split into two independently-installed npm packages:

- `backend/` — Express 5 API, **CommonJS**, PostgreSQL via `pg`
- `frontend/` — Vite + React 19 (ESM), React Router 7
- `docs/` — product/implementation docs (CAPEX PRD, functional & requirement specs)

**Stale artifacts to ignore** (confirmed in `AGENTS.md`):
- The root `package.json` references `apps/*` / `packages/*` workspaces and a `@som/broker-simulator-web` app that **do not exist**. Do not run root scripts.
- `backend/app.js` / `backend/server.js` are stale — the real entrypoint is `backend/src/index.js`.
- `docs/project-structure.md` describes a Next.js scaffold that was never built.

## Commands

Run these from within `backend/` or `frontend/` (not the repo root). If global `npm` is broken, use the local wrappers in `./node_modules/.bin/`.

**Backend** (`cd backend`):
```
npm run dev        # nodemon src/index.js
npm start          # node src/index.js
npm run migrate    # runs all backend/src/database/migrations/*.sql in filename order
npm test           # jest --runInBand  (DB-backed; needs DATABASE_URL + JWT_SECRET)
npx jest tests/capex.test.js              # single test file
npx jest -t "name of test"                # single test by name
```

**Frontend** (`cd frontend`):
```
npm run dev        # vite
npm run build      # vite build
npm run lint       # eslint .
npm test           # vitest run
npx vitest run src/modules/ModuleA/CapexDashboard.test.jsx   # single test file
npm run video:capex:complete    # Playwright walkthrough recording (see package.json video:* scripts)
```

Backend tests and `migrate` require a live Postgres and env vars (`DATABASE_URL`, `JWT_SECRET`, usually via a `.env` file that is gitignored). **Do not assume a database is available** — check before running DB-backed tests.

## Architecture

### The product: CAPEX governance platform
The primary business module manages the full CAPEX capital-expenditure lifecycle: request initiation → multi-level approval chain → procurement tracking → execution milestones → financial closure → AUC → capitalization → PO closure → asset handover → benefits tracking, plus reporting, audit, and compliance. The client has confirmed the platform *executes* this workflow in-system (it is not monitoring-only).

Frontend modules map to functional areas: `ModuleA` = CAPEX, `ModuleB` = Purchase Requests, `ModuleC` = Asset Registry, `ModuleD` = public Intra-Portal, `Admin` = users/permissions/KB.

### Backend request pipeline
Every route is wired the same way in `src/routes/*.js`:
```
verifyToken  →  requirePermission(resourceKey, action)  →  controller
```
- **`middleware/auth.js`** verifies the JWT and, for UUID-keyed (real) users, re-checks `is_active` and the live `role` from `som_users` on *every* request — so deactivation/role changes take effect immediately rather than at token expiry (8h). Non-UUID synthetic/test tokens are allowed through and gated only by permissions.
- **`middleware/requirePermission.js`** grants Admins everything; otherwise checks `som_permissions` for the user. Resource keys are **hierarchical and dotted** (e.g. `capex.approvals`) — a grant on a parent key (`capex`) satisfies a check on any child. Actions: `can_view`, `can_create`, `can_edit`, `can_delete`.

### CAPEX lifecycle rules — single source of truth
`src/config/capexStateMachine.js` holds **pure, DB-free, unit-tested** functions and constants defining what each status permits (`canEditProcurement`, `canCreateMilestone`, `decisionAuthority`, etc.). Status strings follow the PRD model; `LEGACY_STATUS_MAP` translates older status names (also remapped in DB by migration 016) — always run values through `canonicalStatus()` before comparing. When changing lifecycle behavior, change it here, not scattered in the controller.

`capexController.js` is large (~3.5k lines) and is the workhorse for the whole CAPEX API. `config/capexRolePermissions.js` defines the permission-key taxonomy/levels; `config/capexThresholds.js` holds approval-authority thresholds.

### Database
- Plain SQL migrations in `backend/src/database/migrations/`, numbered `NNN_description.sql`, applied in **filename sort order** by `migrate.js` (no migrations table / no rollback — migrations must be idempotent-safe or forward-only). Schema changes go here, never ad-hoc.
- Single `pg` Pool exported from `src/database/db.js`.

### Frontend auth & permissions
- No global axios interceptor. Two token patterns coexist: the shared `services/api.js` axios instance (baseURL only), and most services (`capexService.js`, `assetsService.js`, …) build `Authorization: Bearer ${localStorage.som_token}` headers manually via a local `authHeaders()`/fetch helper. Match the pattern of the file you are editing.
- On login, `pages/Login.jsx` stores `som_token`, `som_user`, and `som_permissions` in `localStorage`. `App.jsx` route guards (`RequireAuth`, `RequireAdmin`, `RequirePerm`) read these to gate client routes — this is **UX only**; the backend permission middleware is the real enforcement.
- `/` is the **public** Intra-Portal (`PublicShell`, no auth) and is deliberately public; authenticated app routes live under `AppShell`.

## Conventions
- Keep backend routes/controllers and `frontend/src/services/*` in sync when changing an API contract.
- Preserve auditability for CAPEX lifecycle actions; be deliberate about permission checks on new CAPEX routes.
- Prefer existing patterns over new abstractions; keep changes scoped; avoid broad refactors unless asked.
- GSAP/SAP integration is currently stubbed / manual-mode.
