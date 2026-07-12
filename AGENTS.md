# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

This repository contains the SOM Platform application. The active app is split into:

- `backend/` - Express 5 API, CommonJS modules, PostgreSQL via `pg`
- `frontend/` - Vite + React 19 frontend
- `docs/` - product and implementation documentation

The current primary business module is the CAPEX governance platform. It covers request initiation, CAPEX approval, procurement tracking, execution milestones, financial closure, AUC, capitalization, PO closure, asset handover, benefits tracking, reporting, audit, and compliance workflows.

## Important Repo Notes

- Treat `backend/src/index.js` as the real backend entrypoint.
- `backend/app.js` and `backend/server.js` appear stale and should not be used as the source of truth without verification.
- The root `package.json` appears stale and references workspace scripts that do not match the current `backend/` and `frontend/` structure.
- `docs/project-structure.md` may be outdated compared with the actual codebase.
- `start.bat` may fail on machines where global `npm` is broken. Prefer local package scripts or local binaries when needed.
- Do not remove or overwrite existing user changes unless explicitly asked.

## Backend

Primary backend files:

- `backend/src/index.js`
- `backend/src/routes/capex.js`
- `backend/src/controllers/capexController.js`
- `backend/src/config/capexRolePermissions.js`
- `backend/src/config/capexStateMachine.js`
- `backend/src/config/capexThresholds.js`
- `backend/src/database/migrations/`
- `backend/tests/`

Backend scripts are defined in `backend/package.json`.

Typical commands from `backend/`:

```powershell
npm run dev
npm start
npm run migrate
npm test
npx jest tests/capex.test.js
npx jest -t "name of test"
```

If global `npm` is unavailable, use the local command wrappers in `backend/node_modules/.bin` where possible.

Backend tests require database configuration. Before running DB-backed tests, check for:

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `JWT_SECRET`
- any project `.env` file

Do not assume a live database is available. `npm test` runs through `backend/scripts/runTests.js`, sets `NODE_ENV=test`, and refuses to run unless `TEST_DATABASE_URL` is present and different from `DATABASE_URL`.

## Frontend

Primary frontend files:

- `frontend/src/App.jsx`
- `frontend/src/modules/ModuleA/CapexDashboard.jsx`
- `frontend/src/services/capexService.js`
- `frontend/src/services/usersService.js`

Frontend scripts are defined in `frontend/package.json`.

Typical commands from `frontend/`:

```powershell
npm run dev
npm test
npm run build
npm run lint
npx vitest run src/modules/ModuleA/CapexDashboard.test.jsx
npm run video:capex:complete
```

If global `npm` is unavailable, use local wrappers such as:

```powershell
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\vite.cmd --host 127.0.0.1
```

Run backend and frontend commands from their respective package directories, not from the repository root.

## Architecture

Frontend modules map to the product areas as follows:

- `ModuleA` - CAPEX
- `ModuleB` - Purchase Requests
- `ModuleC` - Asset Registry
- `ModuleD` - public Intra-Portal
- `Admin` - users, permissions, and Knowledge Base

### Backend Request Pipeline

Protected routes normally follow this sequence:

```text
verifyToken -> requirePermission(resourceKey, action) -> controller
```

- `backend/src/middleware/auth.js` verifies JWTs. For real UUID-keyed users, it re-checks the live `is_active` and `role` values from `som_users` on every request, so role changes and deactivation take effect immediately. Synthetic non-UUID test tokens do not receive this database re-check.
- `backend/src/middleware/requirePermission.js` grants Admin users all permissions. Other users are checked against `som_permissions`.
- Permission resource keys are hierarchical and dotted. A parent grant such as `capex` satisfies checks for child resources such as `capex.approvals`.
- Permission actions are `can_view`, `can_create`, `can_edit`, and `can_delete`.

### CAPEX Lifecycle Rules

`backend/src/config/capexStateMachine.js` is the single source of truth for CAPEX status behavior. It contains pure, database-free, unit-tested lifecycle functions and constants such as `canEditProcurement`, `canCreateMilestone`, and `decisionAuthority`.

- Run status values through `canonicalStatus()` before comparing them.
- Keep lifecycle rule changes in the state machine rather than scattering status checks through controllers.
- `LEGACY_STATUS_MAP` translates older status strings; migration 016 also remaps legacy database values.
- `backend/src/controllers/capexController.js` is the main CAPEX API implementation.
- `backend/src/config/capexRolePermissions.js` defines the permission taxonomy and role levels.
- `backend/src/config/capexThresholds.js` reads the administrator-configurable value-band thresholds.

### Database

- Schema changes belong in numbered SQL migrations under `backend/src/database/migrations/`.
- Migrations are applied in filename order by `backend/src/database/migrate.js`.
- There is no migration history table or automatic rollback. Write migrations to be forward-only and safely repeatable where practical.
- The application uses the single PostgreSQL pool exported by `backend/src/database/db.js`.

### Frontend Authentication and Permissions

- There is no global Axios authentication interceptor. Match the service pattern in the file being edited: `services/api.js` provides a shared Axios instance, while many services build a bearer header from `localStorage.som_token` in a local `authHeaders()` or fetch helper.
- Login stores `som_token`, `som_user`, and `som_permissions` in `localStorage`.
- Frontend route guards such as `RequireAuth`, `RequireAdmin`, and `RequirePerm` provide user-experience gating only. Backend middleware remains the security boundary.
- `/` is the deliberately public Intra-Portal. Authenticated application routes are rendered under `AppShell`.

### Frontend Design System

The current UI design system is documented in `frontend/DESIGN_SYSTEM.md`. Read it before frontend, UX, or styling work.

- The app uses React 19 + Vite with vanilla CSS, global CSS custom properties in `frontend/src/index.css`, and component-local JS style objects.
- Follow the Shell Oman visual language: light enterprise UI, Shell red for primary interactive accents, Shell yellow for brand framing/highlights, tight 4/6/8px radius tokens, restrained shadows, and semantic status tokens.
- Reuse existing components and primitives such as `Field`, `Modal`, `.card`, table patterns, sidebar/navbar conventions, and CAPEX row/status patterns before inventing new UI.
- Do not introduce retired slate/neon palettes, raw brand/status hex values, large raw border radii, or new styling systems unless explicitly requested.

## CAPEX Implementation Status

Much of the CAPEX backend and frontend already exists. Before adding new features, inspect the current implementation first.

Implemented or partially implemented areas include:

- CAPEX request creation and workflow routing
- Approval decisions and audit history
- Procurement tracking
- Supplier quotations and attachments
- Project milestones
- Financial closure
- AUC tracking
- Capitalization tracking
- PO closure
- Closure checklist
- Benefits reviews
- Risk tracking
- MOA records and revisions
- Document versions
- Electronic signatures
- Budget variations
- Procurement performance
- Decision gates
- Governance dashboard and drilldowns
- Scheduled reports and exports
- CAPEX admin thresholds and workflow matrix

Known pending or incomplete areas:

- GSAP/SAP integration is currently stubbed/manual-mode.
- Some frontend flows exist but need polish and stricter validation.
- Tests have drifted in places from the current Shell department model.
- Local backend verification requires database environment setup.

## Testing Notes

Known frontend test status from prior review:

- Vitest ran from `frontend/` using the local binary.
- Result: 96 passed, 5 failed, 3 skipped.
- Failures involved login loading-state behavior, asset registry row visibility/search expectations, and outdated manual-entry department test data.

When fixing tests, distinguish between real product regressions and outdated expectations.

## Product Documentation

The CAPEX PRD is located at:

- `docs/capex/capex-product-requirements-document.md`

Use it as product context, but verify against the code before making changes. Some requirements are intentionally marked as open questions where source documents were ambiguous.

## Coding Guidelines

- Prefer existing project patterns over new abstractions.
- Keep changes scoped to the requested behavior.
- Use migrations for database schema changes.
- Keep API changes aligned between backend routes/controllers and `frontend/src/services/*`.
- Preserve auditability for CAPEX lifecycle actions.
- Be careful with permissions; CAPEX routes often require permission checks.
- Add or update focused tests when behavior changes.
- Avoid broad refactors unless the user explicitly requests them.

## Documentation Hygiene

If you discover stale project instructions, update the relevant docs as part of the change when appropriate. In particular, keep this file aligned with the actual repo structure and commands.
