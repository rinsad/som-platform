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
- `backend/migrations/`
- `backend/tests/`

Backend scripts are defined in `backend/package.json`.

Typical commands from `backend/`:

```powershell
npm run dev
npm run migrate
npm test
```

If global `npm` is unavailable, use the local command wrappers in `backend/node_modules/.bin` where possible.

Backend tests require database configuration. Before running DB-backed tests, check for:

- `DATABASE_URL`
- `JWT_SECRET`
- any project `.env` file

Do not assume a live database is available.

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
```

If global `npm` is unavailable, use local wrappers such as:

```powershell
.\node_modules\.bin\vitest.cmd run
.\node_modules\.bin\vite.cmd --host 127.0.0.1
```

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
