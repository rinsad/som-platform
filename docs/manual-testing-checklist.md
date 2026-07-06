# SOM Platform Manual Testing Checklist

Use this file as the shared QA notebook while testing the system inch by inch.
For every failed step, add an entry to `docs/manual-testing-issues.md`, then retest after the fix.

## Local Startup

1. Start PostgreSQL and confirm `backend/.env` points to the correct database.
2. From `backend`, run `npm run migrate`.
3. From `backend`, run `npm run seed:capex-video-users` for role-based CapEx users.
4. Start backend: `npm run dev` from `backend`.
5. Start frontend: `npm run dev` from `frontend`.
6. Open the Vite URL, usually `http://localhost:5173`.
7. Confirm `GET /api/health` returns healthy through the frontend proxy.

## Test Accounts

Default migration admin:

- Email: `admin@shell.om`
- Password: `Admin@SOM2024!`

CapEx role personas seeded by `seed:capex-video-users`:

- Password: `Video@SOM2026!`
- Main emails include `video.admin@shell.om`, `video.project-owner@shell.om`, `video.finance-manager@shell.om`, `video.cfo@shell.om`, `video.cp-manager@shell.om`, `video.internal-audit@shell.om`, and other role-specific users in `backend/scripts/seedCapexVideoUsers.js`.

## Pass 1: Smoke Test

Goal: prove the app opens, login works, and no major route is broken.

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| Public portal | Open `/` | Intra portal loads without login | Not run |
| Portal preview | Open `/intra-portal-preview` | Preview loads without login | Not run |
| Login validation | Open `/login`, submit empty form | Clear validation or error message appears | Not run |
| Login success | Login as admin | Redirects to dashboard and stores session | Not run |
| Logout/session | Logout or clear session, open `/dashboard` | Redirects to `/login` | Not run |
| Bad route | Open `/random-page` | Redirects to `/` | Not run |

## Pass 2: Admin And Permissions

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| Users list | Login as Admin, open `/admin/users` | Users load, no console or API errors | Not run |
| Create user | Add a temporary test user | User appears in list and can log in | Not run |
| Edit user | Change role/department | Changes persist after refresh | Not run |
| Deactivate user | Deactivate temporary user | User cannot log in or is blocked as expected | Not run |
| Permissions page | Open a user's permissions | Permission tree loads correctly | Not run |
| Permission restriction | Remove a module permission, log in as user | Restricted route redirects to dashboard | Not run |
| Permission restore | Restore permission | Route becomes available again | Not run |

## Pass 3: CapEx Complete Workflow

Start with `video.project-owner@shell.om` using password `Video@SOM2026!`.

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| CapEx landing | Open `/capex` | Overview loads with summary data | Not run |
| Departments | Open Departments tab | Department spend data loads | Not run |
| Requests | Open Requests tab | Request register loads | Not run |
| New request | Create a CAPEX request with title, budget holder, estimated value, risks, ROI, and supplier quotations | Request submits and appears in register | Not run |
| Request detail | Open created request | Detail panel opens with workflow, execution, documents, risk, closure, audit | Not run |
| Approval authority | Decide a pending request with an unassigned step while workflow `allowed_user_roles` is empty | Decision succeeds and audit history contains `AUTHORITY_UNVERIFIED` | Not run |
| Approval denial | Configure an approval step with `allowed_user_roles`, then decide as a user outside the allowed roles | Decision is blocked with 403 | Not run |
| Returned correction | Return a request for correction, edit it as requester/Admin, then resubmit | Old pending steps are superseded, new approval steps are appended, history is preserved | Not run |
| Procurement gate | Try to edit procurement before approval completes | API/UI blocks with 409 until request reaches `Approved` | Not run |
| Milestone | Add milestone and mark complete | Milestone persists and status updates | Not run |
| Documents | Save document version and signature | Entries appear in document section | Not run |
| Signature identity | Capture a document signature while entering no signer name/role | Signature signer name and role come from authenticated user | Not run |
| Risk | Add risk and mitigation | Risk appears and persists | Not run |
| PO closure | Save closure values | Saved values remain after refresh | Not run |
| Financial closure gate | Try to close with incomplete checklist items, open PO closure, or a missing CAPEX form attachment | Close is blocked; checklist failures list incomplete item labels | Not run |
| Financial closure success | Complete all closure checklist items, mark PO closure `Closed`, upload matching CAPEX form attachment, then close | Request status becomes `Closed` | Not run |
| Budget variation | Create a variation while sending approval fields in the payload | Variation is created as `Pending`; approval requires the separate decision action | Not run |
| Audit | Review audit history | New actions appear in audit log | Not run |

## Pass 4: CapEx Role-Based Access

Use seeded video users and verify each role only sees/actions what it should.

| Role | Focus | Status |
| --- | --- | --- |
| Admin | Admin config, permissions, all CapEx visibility | Not run |
| Project Owner | Create requests, milestones, document controls, risks | Not run |
| Finance Manager | Finance, AUC, capitalization, benefits | Not run |
| CFO | Approval decisions and governance views | Not run |
| CP Manager / CP Lead | Procurement and PO-related updates | Not run |
| Internal Audit | Read-only governance, audit, documents | Not run |
| Asset Team | Asset/capitalization handoff | Not run |
| HSSE Focal | HSSE risk visibility and controls | Not run |

## Pass 5: Purchase Requests

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| List | Open `/purchase-requests` | Existing PRs load | Not run |
| Create | Open `/purchase-requests/new`, submit valid request | New PR appears in list | Not run |
| Quote rule | Submit with fewer than 3 quotes and no justification | Request is blocked; adding justification allows submit | Not run |
| Detail | Open PR detail | Details, documents, workflow load | Not run |
| Sequential approval | Approve a MEDIUM PR once, then again | First approval advances current step but keeps `PENDING_APPROVAL`; second approval reaches `APPROVED` | Not run |
| Terminal approval guard | Try to approve an already approved PR | API/UI blocks with 409 | Not run |
| Return/resubmit | Return a PR, edit the draft, then resubmit | Status returns to `PENDING_APPROVAL`; approval history is preserved with `RESUBMITTED` appended | Not run |
| Documents | Upload or attach document | Document appears and can be downloaded with stored bytes | Not run |

## Pass 6: Assets

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| Registry | Open `/assets` | Assets load | Not run |
| Asset detail | Open asset by code if UI supports it | Detail data loads | Not run |
| Create asset | Add a new asset | Asset appears and persists | Not run |
| Alerts | Check alert section | Alerts load or empty state appears | Not run |
| Utility bill | Create utility bill if UI exposes it | Bill persists | Not run |
| Work order | Create work order if UI exposes it | Work order persists | Not run |

## Pass 7: Knowledge Base And Public Portal

| Area | Manual steps | Expected result | Status |
| --- | --- | --- | --- |
| Public KB | Search/read knowledge from `/` | Results load without login where intended | Not run |
| Admin KB | Open `/admin/knowledge` as Admin | Admin list loads | Not run |
| Upload | Upload a KB file | File appears in admin list/public search as expected | Not run |
| Versions | Open document versions | Versions load correctly | Not run |
| Embed/search | Trigger embed if configured | Success state appears or API explains missing OpenAI key | Not run |
| Delete | Delete temporary KB doc | Doc disappears and cannot be opened | Not run |

## Pass 8: Regression Checks

Run these after fixes:

1. `npm test` in `backend`.
2. `npx vitest run` in `frontend`.
3. `npm run lint` in `frontend`, if lint script exists for the branch.
4. `npm run build` in `frontend`.
5. Manually retest the exact failed workflow.

Known current automated-test baseline during CAPEX hardening:

- Backend `npm test`: 3 pre-existing failures in `tests/portal.test.js` for role-based app visibility.
- Frontend `npx vitest run`: 5 pre-existing failures across Login, ManualEntryModal, and AssetRegistry.
