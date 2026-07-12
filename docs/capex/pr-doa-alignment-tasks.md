# PR DoA Alignment — Task Breakdown

Companion to [`pr-doa-alignment-plan.md`](pr-doa-alignment-plan.md) (the full design, rationale, and target chains). Source of truth for the DoA itself: `Purchase Request Platform (2).xlsx` (sheets "CP Governance Framework" + "Purchase Request Platform").

Execution order: **T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8**. T2/T3 touch the same file and should land together; T5/T6 are parallelizable after T4 is green.

---

## T1 — Migration `021_pr_workflow_doa.sql`

**Goal:** Create and seed `pr_workflow_config`, extend `purchase_requests`, reset in-flight approvals.

**File (new):** `backend/src/database/migrations/021_pr_workflow_doa.sql`

**Steps:**
1. `CREATE TABLE IF NOT EXISTS pr_workflow_config` — identical shape to `capex_workflow_config` (see migration `011_capex_admin_config_and_documents.sql:18-31`): `id SERIAL PK, value_band VARCHAR(20) CHECK IN ('LOW','MEDIUM','HIGH','ALL'), condition_key VARCHAR(80) DEFAULT 'standard', step_order INT, approver_role VARCHAR(100), label VARCHAR(200), is_active BOOL DEFAULT true, allowed_user_roles TEXT[] NOT NULL DEFAULT '{}', updated_by VARCHAR(100), updated_at TIMESTAMPTZ DEFAULT NOW()`.
2. `CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_workflow_config_unique ON pr_workflow_config(value_band, condition_key, step_order)`.
3. Seed 15 rows with `ON CONFLICT (value_band, condition_key, step_order) DO NOTHING`:

   | value_band | condition_key | step_order | approver_role | label |
   |---|---|---|---|---|
   | ALL | standard | 1 | Manager | Line Manager Endorsement |
   | ALL | hsse_required | 2 | HSSE Focal | HSSE / Worker Welfare Approval |
   | LOW | standard | 10 | Finance in Business | FiB Pre-support |
   | LOW | standard | 20 | CP Lead | CP Lead Pre-support |
   | LOW | fewer_than_3 | 30 | CP Manager | Head of CP Approval for Fewer than 3 Quotations |
   | LOW | standard | 40 | Business GM | Business GM Authorization |
   | MEDIUM | standard | 10 | Project Owner | Contract Owner Pre-support |
   | MEDIUM | standard | 20 | Project Owner | Contract Holder Pre-support |
   | MEDIUM | standard | 30 | Finance in Business | FiB Pre-support |
   | MEDIUM | fewer_than_3 | 40 | CFO | CFO Approval for Fewer than 3 Quotations |
   | MEDIUM | standard | 50 | CEO/Board | EMT (CoB) Authorization |
   | MEDIUM | standard | 60 | CP Manager | Head of CP / CP Manager Authorization |
   | HIGH | standard | 10 | CP Manager | CP Review - Contract Strategy / Award Proposal |
   | HIGH | standard | 20 | Finance in Business | FiB Validation |
   | HIGH | standard | 30 | CEO/Board | Contract Board Authorization |

4. Back-fill `allowed_user_roles = ARRAY[approver_role]` where empty.
5. `ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS` ×5: `hsse_risk VARCHAR(10) NOT NULL DEFAULT 'Low' CHECK IN ('Low','Medium','High')`, `worker_welfare_risk` (same), `suppliers JSONB NOT NULL DEFAULT '[]'::jsonb`, `selected_supplier VARCHAR(200)`, `current_budget_omr NUMERIC(14,2)`.
6. Reset in-flight PRs: `UPDATE purchase_requests SET current_step_index = 0, approval_history = approval_history || <WORKFLOW_RESET audit entry> WHERE status = 'PENDING_APPROVAL' AND current_step_index > 0` (the `> 0` guard makes re-runs no-ops; APPROVED/REJECTED/DRAFT untouched).

**Acceptance criteria:**
- `npm run migrate` succeeds **twice in a row** (idempotent).
- 15 rows in `pr_workflow_config`; second run adds none.
- Pre-existing PENDING_APPROVAL PRs with `current_step_index > 0` are at index 0 with exactly one `WORKFLOW_RESET` history entry.

---

## T2 — Config-driven workflow builder (backend)

**Goal:** Replace the hardcoded 3-role workflow with the DoA builder.

**File:** `backend/src/controllers/purchaseRequestsController.js`

**Steps:**
1. Delete `WORKFLOW_CONFIG` (lines 36-57) and `getWorkflow(department, tier)` (59-62). Department no longer shapes the chain (QHSE/Retail/Infrastructure variants retired).
2. Add `buildPRWorkflowFallback({ tier, quoteCount, hsseRisk, workerWelfareRisk })` — in-code copy of the T1 seed (mirror `buildCapexWorkflow`, `capexController.js:63-90`).
3. Add `async buildPRWorkflow(db, { tier, quoteCount, hsseRisk, workerWelfareRisk })` (mirror `buildConfiguredCapexWorkflow`, `capexController.js:92-118`): conditions `['standard']` + `'hsse_required'` when either risk ∈ {Medium, High} + `'fewer_than_3'` when `Number(quoteCount||0) < 3`; query `pr_workflow_config ... ORDER BY CASE WHEN value_band='ALL' THEN 0 ELSE 1 END, step_order`; empty result or thrown error → fallback.
4. Rewire all call sites (each handler is already async): `getById`, `create`, `updateDraft`, `resubmit`, `approve` (build inside the transaction with `client`), `getWorkflowForPR` (SELECT must also fetch `quote_count, hsse_risk, worker_welfare_risk`).

**Acceptance criteria:**
- No reference to `WORKFLOW_CONFIG`/`getWorkflow` remains.
- `approve` authority logic unchanged in structure (FOR UPDATE, no-self-approval, role-vs-step 403, Admin override, index advance, APPROVED at chain end) but now gates on DoA roles.
- Chain shapes match the plan's table for every band × condition combination.

---

## T3 — New fields through the API (backend)

**Goal:** Accept, validate, persist, and expose the risk + sourcing fields.

**File:** `backend/src/controllers/purchaseRequestsController.js` (same PR as T2)

**Steps:**
1. Shared validation used by `create` and `updateDraft`:
   - `hsseRisk`, `workerWelfareRisk`: default `'Low'`; 400 unless ∈ `['Low','Medium','High']`.
   - `suppliers`: optional array; each entry `{name: non-empty string, quoteAmount?: finite number > 0}`; 400 on malformed entries; default `[]`.
   - `selectedSupplier`: optional string. `currentBudget`: optional finite number > 0.
2. `create`: add `hsse_risk, worker_welfare_risk, suppliers, selected_supplier, current_budget_omr` to the INSERT.
3. `updateDraft`: same columns in the UPDATE set (tier already recomputes there; editing value/quotes/risks on a returned draft reshapes the chain before resubmit).
4. `mapPR`: add `hsseRisk`, `workerWelfareRisk`, `suppliers`, `selectedSupplier`, `currentBudget`, plus **derived** (not stored) `avgQuote` = mean of `suppliers[].quoteAmount` (null when none) and `savings` = `current_budget_omr − total_value` (null when no budget).
5. No route changes (`backend/src/routes/purchaseRequests.js` untouched).

**Acceptance criteria:**
- POST with invalid risk value or malformed supplier entry → 400 with a clear message.
- POST omitting the new fields behaves exactly as before (defaults: Low/Low, `[]`, nulls).
- Response JSON carries all new fields + correct `avgQuote`/`savings`.

---

## T4 — Backend tests

**Goal:** Lock in the DoA chains and new field behavior.

**File:** `backend/tests/purchaseRequests.test.js`

**Steps:**
1. Extend the PR-creation helper with `hsseRisk, workerWelfareRisk, suppliers, currentBudget`.
2. Replace "MEDIUM needs two approvals" with **six** approvals (Manager → Contract Owner → Contract Holder → FiB → EMT → Head of CP) using the Admin token (admin override passes every role gate); 409 on a seventh.
3. Chain-shape assertions from the 201 response `workflow` roles:
   - LOW, 3 quotes, Low risks → `['Manager','Finance in Business','CP Lead','Business GM']`
   - LOW, 2 quotes + justification → `'CP Manager'` inserted before `'Business GM'`
   - MEDIUM, 2 quotes + justification → `['Manager','Project Owner','Project Owner','Finance in Business','CFO','CEO/Board','CP Manager']`
   - MEDIUM, `workerWelfareRisk:'High'` → `workflow[1].role === 'HSSE Focal'`
   - HIGH → `['Manager','CP Manager','Finance in Business','CEO/Board']`
4. New field tests: invalid risk → 400; omitted risks echo `'Low'`; suppliers echo back; `avgQuote`/`savings` computed; malformed supplier → 400.
5. Keep (unchanged): tier boundaries (25000/25001/300000/300001), justification-required-when-<3-quotes, 403-without-permission, RETURNED→DRAFT→edit→resubmit cycle with history preservation.

**Acceptance criteria:** `npx jest tests/purchaseRequests.test.js` green; full `npm test` shows no regressions elsewhere (capex suite untouched). Requires live Postgres + `TEST_DATABASE_URL` ≠ `DATABASE_URL` + `JWT_SECRET` (check `.env` first, per CLAUDE.md).

---

## T5 — Frontend: creation form

**Goal:** Capture risks + sourcing essentials; fix stale tier copy.

**File:** `frontend/src/modules/ModuleB/NewPurchaseRequest.jsx`

**Steps:**
1. Add `hsseRisk` and `workerWelfareRisk` selects (Low/Medium/High, default Low), mirroring `ModuleA/CapexRequestForm.jsx:170-174`.
2. Sourcing section: dynamic supplier rows (name + quoted amount; add/remove like the existing line-item rows), selected-supplier dropdown fed from entered names, current cost/budget input, read-only derived avg-of-quotes and savings displays. **Do not change** how `quoteCount` is derived from attached quote files.
3. Add `hsseRisk, workerWelfareRisk, suppliers, selectedSupplier, currentBudget` to the submit payload (lines 77-93).
4. Fix `TIER_CONFIG` labels (18-22): LOW `'LOW — Business GM authorization'`, MEDIUM `'MEDIUM — EMT + Head of CP authorization'`, HIGH `'HIGH — Contract Board authorization'`. Leave `calcTier` as-is (advisory; server authoritative).
5. Reuse the file's existing field/select primitives per `frontend/DESIGN_SYSTEM.md`; no new styling framework.

**Acceptance criteria:** form submits successfully with and without the new fields; tier badge shows the new copy; justification behavior unchanged.

---

## T6 — Frontend: detail view & draft editor

**Goal:** Surface the new fields; keep approval UI data-driven.

**File:** `frontend/src/modules/ModuleB/PRDetail.jsx`

**Steps:**
1. Details card: add info rows for HSSE Risk, Worker Welfare Risk, suppliers (with amounts), selected supplier, current budget, avg quote, savings.
2. `DraftEditor` (lines 398-523): add the two risk selects and the sourcing inputs, bound through `updatePR`, so returned drafts can revise them.
3. **No changes** to `ApprovalTimeline`, `ApprovalPanel`, or `canApprove` (543-553) — already driven by the API `workflow` + `currentStepIndex`. Tier band OMR labels (681-683) stay.
4. `services/prService.js`: no change (payload passthrough).

**Acceptance criteria:** detail page renders old PRs (defaults) and new PRs (full fields) without errors; a returned draft can edit risks/sourcing and resubmit; approval timeline shows the DoA steps returned by the API.

---

## T7 — Frontend tests, lint, build

**Files:** `frontend/src/modules/ModuleB/NewPurchaseRequest.test.jsx` (update); `PurchaseRequestList.test.jsx` (should pass unchanged).

**Steps:**
1. Update tier-badge label assertions to the new `TIER_CONFIG` copy.
2. Assert both risk selects render and default to Low.
3. Run `npx vitest run src/modules/ModuleB/NewPurchaseRequest.test.jsx src/modules/ModuleB/PurchaseRequestList.test.jsx`, then `npm run lint` and `npm run build`.

**Acceptance criteria:** both test files green; lint and build clean.

---

## T8 — End-to-end verification

**Prereq:** live Postgres + `.env` (`DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`) — verify availability before running; do not assume.

1. `cd backend && npm run migrate` — twice (idempotency proof).
2. `npx jest tests/purchaseRequests.test.js` then full `npm test`.
3. Frontend: vitest + lint + build (T7 commands).
4. Manual walkthrough (user eyeballs in their dev server): create a MEDIUM PR with 2 quotes + High worker-welfare risk → timeline shows Manager → HSSE Focal → Contract Owner → Contract Holder → FiB → CFO → EMT → Head of CP; Admin walks it to APPROVED (409 afterwards); a pre-existing PENDING_APPROVAL PR shows the `WORKFLOW_RESET` note in its decision history.

---

## Deferred (explicitly out of scope, tracked for follow-up)

- Frequency-of-requirement and 75/90-day payment-term intake fields.
- E&C compliance attestation.
- Admin CRUD routes/UI for `pr_workflow_config` (table is already data-driven; routes are purely additive later, mirroring `capex.admin-config`).
- CP-Manager conflict substitution rule ("line manager of CP Manager approves CP-Manager-held contracts").
- Tender / contract-strategy / award-proposal document validation for HIGH band.
- "Process led by" (Business Requisitioner vs CP) designation.
