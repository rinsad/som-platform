# SOM Platform Manual Testing Issues

Add every manual testing issue here. Keep entries small and reproducible.

## Issue Template

### ISSUE-001: Short title

- Status: Open
- Severity: Critical | High | Medium | Low
- Area: Login | Admin | CapEx | Purchase Requests | Assets | Knowledge Base | Portal | Other
- Tester:
- Date found:
- Environment: Local | Staging | Production
- User/role:
- URL:
- Steps to reproduce:
  1. 
  2. 
  3. 
- Expected result:
- Actual result:
- Evidence: screenshot, console error, network error, backend log, or database row
- Suspected file/API:
- Fix notes:
- Retest result:

## Resolutions — 2026-07-12

All of ISSUE-002 through ISSUE-010 were fixed. Verified: frontend `eslint` + production `vite build` pass; backend controllers parse; ISSUE-008/009/010 confirmed live against the running API.

- **ISSUE-002** — `PRDetail.jsx` `ApprovalPanel.submit` now resets `saving` in a `finally` and clears the comment on success, so the button no longer sticks on "Processing…".
- **ISSUE-003** — sidebar "Approval Chain" now derives step completion from `currentStepIndex` (`i < currentStepIndex`) instead of a positional `approvalHistory[i]` map, matching the main timeline after a RETURN.
- **ISSUE-004** — `NewPurchaseRequest.jsx` sends `requestorName` from `storedUser.full_name` (was `storedUser.name`, which doesn't exist) and omits it when unknown so the backend fills it. New PRs show the real requestor.
- **ISSUE-005** — added a `DecisionHistory` component to `PRDetail.jsx` (Approval Progress tab) rendering the full `approvalHistory`, including RETURNED / RESUBMITTED / REJECTED entries.
- **ISSUE-006** — `App.jsx` `RequirePerm` now takes an `action`; `/purchase-requests/new` requires `can_create`. `PurchaseRequestList.jsx` hides the "+ New Request" button when the user lacks `can_create`.
- **ISSUE-007** — `PRDetail.jsx` `canApprove` now requires the user's role to match the current workflow step's role (Admin overrides) and blocks the requester, mirroring the server. `prService.js` `request()` now surfaces the backend's error message instead of a bare status, so denied actions explain themselves.
- **ISSUE-008** — added `'Department Manager'` to `USER_ROLES` in `usersService.js`. Verified live: a `Department Manager` user with `can_edit` now approves a step-1 PR (200 → APPROVED), which was previously impossible for any non-Admin.
- **ISSUE-009** — `purchaseRequestsController.js` `create` + `updateDraft` now reject non-positive / non-numeric `totalValue` and missing `department` with 400. Verified live (negative/zero/NaN/missing-dept → 400; valid → 201).
- **ISSUE-010** — `usersController.js` `deleteUser` now catches the Postgres FK violation (`23503`) and returns 409 with a clear "deactivate instead" message. Verified live (user-with-PR → 409; user-without-records → 200).

Note: fixes applied to the working tree only — not committed. `docs/manual-testing-checklist.md` Pass 5 statuses reflect the pre-fix findings; re-run to confirm green.

## Open Issues

Add new issues above this line or below it, but keep the newest issue easy to find.

### ISSUE-002: Approve button stays stuck on "Processing…" after a successful decision

- Status: Open
- Severity: Medium
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-10
- Environment: Local
- User/role: Admin
- URL: /purchase-requests/PR-2026-141 (Approval Progress tab)
- Steps to reproduce:
  1. Open a PENDING_APPROVAL PR with 2+ approval steps.
  2. Click "Approve" on step 1.
  3. Observe the button and page state after the request completes.
- Expected result: Button returns to normal "✓ Approve" state (or the page moves to step 2's fresh decision panel) once the approval succeeds.
- Actual result: Button remains stuck showing "Processing…" indefinitely. The underlying approval did succeed (step 1 shows a green checkmark, chain advanced to step 2), but the UI gives no way to act again without a manual page refresh.
- Evidence: Screenshot showing "Processing…" button with step 1 already checkmarked; confirmed via `read_network_requests` that the PATCH `.../approve` call returned 200 before the button froze; refreshing the page shows correct state and a working button.
- Suspected file/API: frontend PR detail/approval component's loading-state handling after PATCH `/api/purchase-requests/:id/approve`.
- Fix notes: Loading state likely isn't reset in a `finally` block, or the component isn't re-fetching/re-rendering the decision panel for the new current step after a successful decision.
- Retest result: Not yet retested.

### ISSUE-003: Sidebar "Approval Chain" shows a step as approved while main panel shows it as pending after Return

- Status: Open
- Severity: Low
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-10
- Environment: Local
- User/role: Admin
- URL: /purchase-requests/PR-2026-142 (Approval Progress tab, after Return for Revision)
- Steps to reproduce:
  1. Return a PENDING_APPROVAL PR for revision (adds a comment, clicks "Return for Revision").
  2. Observe the right-hand "Approval Chain" sidebar vs. the main "Approval Progress" panel.
- Expected result: Both panels agree on the state of "Department Manager Approval" (or whichever step was active).
- Actual result: Sidebar shows a green checkmark next to "Department Manager Approval" (implying approved), while the main panel shows the same step as an empty circle labeled "Pending".
- Evidence: Screenshot taken immediately after the Return action succeeded and status badge changed to "Draft".
- Suspected file/API: frontend PR detail page — sidebar "Approval Chain" widget likely derives its checkmark from a different/stale field than the main "Approval Progress" timeline after a RETURNED transition.
- Fix notes: Both widgets should read from the same approval-steps data after a return.
- Retest result: Not yet retested.

### ISSUE-004: PR detail shows "REQUESTOR: Unknown" for requests created via the UI

- Status: Open
- Severity: Low
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-10
- Environment: Local
- User/role: Admin
- URL: /purchase-requests/PR-2026-141 (Details tab)
- Steps to reproduce:
  1. Create a new PR via `/purchase-requests/new` while logged in as any user.
  2. Open the PR detail page, Details tab.
- Expected result: REQUESTOR shows the name of the user who submitted the request.
- Actual result: REQUESTOR field shows "Unknown".
- Evidence: Screenshot of Request Information panel.
- Suspected file/API: PR creation likely doesn't store/join the requester's `full_name`, or the detail GET endpoint doesn't select it.
- Fix notes: n/a
- Retest result: Not yet retested.

### ISSUE-005: No visible approval-history entries in the UI (e.g. RESUBMITTED marker)

- Status: Open
- Severity: Low
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-10
- Environment: Local
- User/role: Admin
- URL: /purchase-requests/PR-2026-142 (Details tab, after Return + Resubmit)
- Steps to reproduce:
  1. Return a PR for revision, then resubmit it.
  2. Look through Details / Approval Progress / Documents tabs for any audit/history trail.
- Expected result: Per the checklist (`docs/manual-testing-checklist.md` Pass 5), "approval history is preserved with RESUBMITTED appended" — expected some visible history/audit entry.
- Actual result: No history/audit section is visible anywhere in the PR detail UI. Cannot confirm from the UI whether the backend actually preserves this history.
- Evidence: Full scroll-through of Details tab after resubmit; no history list found. **Follow-up (2026-07-11):** read `backend/src/controllers/purchaseRequestsController.js` directly — `resubmit` and `approve` both append a `historyEntry` (`approver`, `role`, `decision` incl. `'RESUBMITTED'`, `comment`, `date`, `stepLabel`) to the `approval_history` jsonb column. **The backend does preserve the history correctly** — this is confirmed to be a pure UI/frontend gap, not a data gap.
- Suspected file/API: `approval_history` column on `purchase_requests` has the data; the PR detail frontend component simply has no component that renders it.
- Fix notes: Add a history/audit list to the PR detail page (Details or a new "History" tab) that renders `approval_history`.
- Retest result: Confirmed backend-side via code read; frontend still has no UI for it.

### ISSUE-006: "+ New Request" button and full create form are reachable/fillable by users without `can_create` permission

- Status: Open
- Severity: Medium
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-11
- Environment: Local
- User/role: Employee with `purchase-requests: can_view` only (no `can_create`)
- URL: /purchase-requests and /purchase-requests/new
- Steps to reproduce:
  1. Log in as a user with only `can_view` on Purchase Requests.
  2. Note the "+ New Request" button is visible on the list page.
  3. Navigate directly to `/purchase-requests/new`.
- Expected result: Button should be hidden, and/or the route should redirect away, for users without `can_create`.
- Actual result: Button is shown; the route loads the full creation form (title, department, line items, quote attachments, justification) and lets the user fill it out completely. The block only happens when they click "Submit Request", which returns a generic "API error 403" banner (backend correctly enforces `can_create`, confirmed via direct PATCH test).
- Evidence: Screenshots of the fully-loaded creation form as the restricted user, and the "API error 403" banner after submit attempt.
- Suspected file/API: frontend route guard for `/purchase-requests/new` and the PR list page's button-visibility logic — neither appears to check `can_create` from `som_permissions`.
- Fix notes: Not a security hole (backend blocks the actual write via `requirePermission`), but wastes the user's time filling out a form they can never submit, and could confuse users about their access level.
- Retest result: Not yet retested.

### ISSUE-007: Decision panel (Approve/Reject/Return) shown to users whose role doesn't match the current approval step

- Status: Open
- Severity: Medium
- Area: Purchase Requests
- Tester: Claude (browser automation)
- Date found: 2026-07-11
- Environment: Local
- User/role: Custom test user, role = `Finance`, with `purchase-requests: can_view + can_edit` granted
- URL: /purchase-requests/PR-2026-143 (Approval Progress tab)
- Steps to reproduce:
  1. Create a PR whose current approval step requires role `Department Manager` (e.g. any new LOW/MEDIUM/HIGH tier PR, step 1).
  2. Log in as a user with `can_edit` on Purchase Requests but role `Finance` (i.e. not the role required by the current step).
  3. Open the PR's Approval Progress tab.
- Expected result: No decision panel/Approve/Reject/Return buttons shown, since this user's role doesn't match the step's `role` requirement (`Department Manager`) — same treatment as a user lacking `can_edit` entirely.
- Actual result: The full "Your Decision" panel with comment box and Approve/Reject/Return buttons is rendered and clickable. Clicking Approve does correctly fail server-side (`403`, backend message: `Role 'Finance' is not authorised to decide step 'Department Manager Approval' (requires: Department Manager)`), shown to the user only as a generic "Action failed. Please try again." with no explanation of why.
- Evidence: Screenshot of the decision panel visible to the mismatched-role user; network log confirms `PATCH /api/purchase-requests/PR-2026-143/approve` → `403`.
- Suspected file/API: frontend PR detail page's Approval Progress component only checks `can_edit` permission, not `req.user.role === currentStep.role` (the check backend enforces in `purchaseRequestsController.js` `exports.approve`, lines ~315-320). It also doesn't surface the backend's specific error message to the user.
- Fix notes: (1) Hide the decision panel client-side when `user.role !== currentStep.role` (unless Admin, which is allowed to override). (2) Surface the actual backend error message instead of a generic "Action failed" banner.
- Retest result: Not yet retested.

### ISSUE-008: "Department Manager" approval step can never be satisfied by a non-Admin user — the role string is not an assignable user role

- Status: Open
- Severity: High
- Area: Purchase Requests / Admin (User Management)
- Tester: Claude (browser automation + code read)
- Date found: 2026-07-11
- Environment: Local
- User/role: Any non-Admin user; tested with roles `Finance` and `Manager`
- URL: /purchase-requests/PR-2026-144 (LOW tier, step 1 = "Department Manager Approval"); /admin/users (Create User role dropdown)
- Steps to reproduce:
  1. Look at `backend/src/controllers/purchaseRequestsController.js` `WORKFLOW_CONFIG` — every department's LOW tier (and step 1 of MEDIUM/HIGH) requires `role: 'Department Manager'`.
  2. Look at `frontend/src/services/usersService.js` `USER_ROLES` — the assignable role list is `Admin, CEO/Board, CFO, Finance Manager, Finance in Business, CP Manager, CP Lead, Project Owner, Project Engineer, Business GM, Internal Audit, Asset Team, HSSE Focal, Manager, Finance, Employee`. There is no `'Department Manager'` entry — the closest is `'Manager'`, a different string.
  3. Create a PR (LOW tier) as a non-Admin requester so the step's role would otherwise apply to a second approver.
  4. Log in as a different non-Admin user with `can_edit` on Purchase Requests and role `Manager` (the closest available role), attempt to approve.
  5. Also tried role `Finance`.
- Expected result: A user assigned the department-manager-equivalent role in this system should be able to approve step-1 ("Department Manager Approval") requests.
- Actual result: Both `Manager` and `Finance` roles are rejected: `403 {"error":"Role 'Finance' is not authorised to decide step 'Department Manager Approval' (requires: Department Manager)"}` (same for `Manager`). Since `'Department Manager'` cannot be selected as a role for any user via `/admin/users`, **no non-Admin user can ever legitimately approve a LOW-tier PR, or step 1 of any MEDIUM/HIGH-tier PR**, anywhere in the system. Only an Admin (who bypasses the role check entirely as an "audited override") can move these requests forward. Also worth noting: the frontend's own gate for showing the decision panel (`PRDetail.jsx` line ~491: `['Admin','Finance','Department Manager'].includes(user.role)`) independently references the same unobtainable `'Department Manager'` string, so the UI is internally consistent about a role that can never exist.
- Evidence: Direct API calls confirmed 403 for both `Manager` and `Finance` roles on a `Department Manager` step; grep of `USER_ROLES` confirms no matching entry; grep of `WORKFLOW_CONFIG` confirms `'Department Manager'` is required by every department/LOW-tier config and step 1 of MEDIUM/HIGH.
- Suspected file/API: `frontend/src/services/usersService.js` (`USER_ROLES` array) vs. `backend/src/controllers/purchaseRequestsController.js` (`WORKFLOW_CONFIG`, all `role: 'Department Manager'` entries) — the two lists were never kept in sync.
- Fix notes: Either (a) add `'Department Manager'` to `USER_ROLES` so it can be assigned to real users, or (b) rename the workflow's role requirement to `'Manager'` to match the existing assignable role (whichever matches the product's intent). Whichever is chosen, also update the frontend's hardcoded `canApprove` role list in `PRDetail.jsx` to match.
- Retest result: Not yet retested.

### ISSUE-009: Purchase Request create API accepts negative, zero, and non-numeric totalValue; department defaults silently to "Unknown"

- Status: Open
- Severity: Medium
- Area: Purchase Requests
- Tester: Claude (browser automation, direct API calls)
- Date found: 2026-07-11
- Environment: Local
- User/role: Admin (bug is not permission-related — likely reachable by any user with `can_create`)
- URL: POST /api/purchase-requests
- Steps to reproduce (all via direct fetch with a valid token, bypassing the frontend form's client-side constraints):
  1. `POST` with `totalValue: -500` and a title/department → **201 Created**, PR-2026-145 now exists with `totalValue: -500`, tier `LOW`.
  2. `POST` with `totalValue: 0` → **201 Created**, PR-2026-146 exists with `totalValue: 0`.
  3. `POST` with `totalValue: 'abc'` (non-numeric) → **201 Created**, PR-2026-149 exists with `totalValue: null` (silently coerced via `Number('abc')` → `NaN` → stored as `null`).
  4. `POST` omitting `department` entirely (with a valid title/totalValue) → **201 Created**, PR-2026-147 exists with `department: "Unknown"`.
- Expected result: `totalValue` should be validated as a positive finite number; a request with a missing/invalid amount should be rejected with `400`. `department` should likely be required too, matching the frontend form's `required` marker on the Department field.
- Actual result: All four requests succeeded with `201`. Test PRs `PR-2026-145`, `PR-2026-146`, `PR-2026-147`, `PR-2026-149` now exist in the local dev DB with these bad values and were not cleaned up (left as evidence / for retest).
- Evidence: Raw API responses recorded above; `backend/src/controllers/purchaseRequestsController.js` `exports.create` (~line 118-124) only checks `if (!title || totalValue === undefined)` — no range, sign, or type validation on `totalValue`, and `department` falls back to `'Unknown'` via `department||'Unknown'` rather than being rejected.
- Suspected file/API: `backend/src/controllers/purchaseRequestsController.js`, `exports.create` and `exports.updateDraft` (same pattern likely repeated there — not yet independently verified).
- Fix notes: Add server-side validation: `totalValue` must be a finite number `> 0` (or `>= 0` if zero-value requests are intentionally allowed); reject non-numeric input explicitly rather than coercing to `null`; decide whether `department` should be a hard requirement (400) instead of silently defaulting to `'Unknown'`.
- Retest result: Not yet retested. Test PRs PR-2026-145/146/147/149 left in the DB for a fix-verification pass — consider cleaning these up (delete or mark) once the fix lands.

### ISSUE-010: Deleting a user who has created a Purchase Request fails with an unhandled 500 (FK violation)

- Status: Open
- Severity: Medium
- Area: Admin (User Management) / Purchase Requests
- Tester: Claude (browser automation, direct API calls, code read)
- Date found: 2026-07-11
- Environment: Local
- User/role: Admin
- URL: DELETE /api/users/:id ; /admin/users
- Steps to reproduce:
  1. Create a user, grant `purchase-requests: can_create`.
  2. Log in as that user and create at least one Purchase Request.
  3. Log back in as Admin, go to `/admin/users`, click Delete on that user, confirm.
- Expected result: Either the deletion is blocked with a clear message (e.g. "Cannot delete a user who has created requests — deactivate instead"), or the user's requests are reassigned/nulled out and deletion proceeds.
- Actual result: `DELETE /api/users/:id` returns `500 {"error":"Internal Server Error","message":"Internal Server Error"}`. Reproduced twice via direct API call. The UI shows a red "Internal Server Error" banner with no actionable guidance, and the user remains in the list (delete silently fails).
- Evidence: Network log shows `DELETE /api/users/94547165-9d0c-45d5-8be2-01e1ce6eb7c5 → 500` (twice); confirmed root cause via code read: `backend/src/database/migrations/002_all_modules.sql` / `016_purchase_requests_repair.sql` define `requestor_id UUID REFERENCES som_users(id)` with no `ON DELETE` clause (defaults to `NO ACTION`), and `backend/src/controllers/usersController.js` `exports.deleteUser` (~line 188-204) runs a plain `DELETE FROM som_users WHERE id=$1` with no try/catch handling for the resulting foreign-key-violation error — it just falls through to `next(err)` and the generic error handler, producing an opaque 500 instead of a meaningful 409/400.
- Suspected file/API: `backend/src/controllers/usersController.js` `exports.deleteUser`.
- Fix notes: Catch the FK violation (Postgres error code `23503`) and return a clear `409` explaining the user has associated records (Purchase Requests, and likely CAPEX requests/other FK'd tables too — not independently checked), and suggest deactivating instead of deleting. The existing "Deactivate" action already in the Actions column is the correct workaround in the meantime.
- Retest result: Not yet retested. Test user `self.approve.test@shell.om` (EMP-9903) is still active in the DB — could not be deleted due to this bug; deactivated as a workaround instead (see resolution note below).

