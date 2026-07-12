# Align Purchase Request module with the DoA matrix (v2 — verified against the xlsx)

## Context

The client's DoA source is docs/capex/`Purchase Request Platform (2).xlsx`. It contains **two authoritative artifacts**, both now read directly:

1. **"CP Governance Framework" sheet** — the value-band matrix (embedded image + note *"Contract board are GM's of the company (Executive Members of the Team)"*): LOW ≤25K (Business GM authorizes; FiB + CP Lead pre-support; Head of CP if <3 quotations), MEDIUM 25.1K–300K (EMT then Head of CP; CFO if <3 quotations), HIGH >300K (Contract Board), HSSE approval for Medium/High-risk.
2. **"Purchase Request Platform" sheet** — the intake/approval checklist: scope details endorsed by the requisitioner's **Line Manager**; **HSSE Risk** and **Worker Welfare Risk** (HSSE Focal approval if M/H); supplier quotations (min 3, up to 10) with named suppliers, avg of quotes, selected supplier; current cost/budget and savings; justification if <3 quotes; approvals from **CO (Contract Owner)** and **CH (Contract Holder)** as *separate* sign-offs, FiB, EMT, CFO (medium + <3 quotes), CP Manager (low <3 quotes or medium), CP Lead.

The PR module today bands values correctly (shared `capex_value_thresholds`, [capexThresholds.js](som-platform/backend/src/config/capexThresholds.js)) and enforces the <3-quotations justification, but its approval chain is a hardcoded generic hierarchy (`Department Manager → Finance → Admin`, [purchaseRequestsController.js:36-57](som-platform/backend/src/controllers/purchaseRequestsController.js)) with none of the DoA roles, no risk fields, no conditional approver for <3 quotes, and no sourcing intake fields. The CAPEX module already implements this DoA (`capex_workflow_config` + `buildConfiguredCapexWorkflow`, [capexController.js:63-118](som-platform/backend/src/controllers/capexController.js)) — we mirror its exact patterns.

**User decisions (fixed):**
- Separate `pr_workflow_config` table (schema mirrors `capex_workflow_config`, not shared rows).
- Reset in-flight PENDING_APPROVAL PRs to step 0 of the new chain, with an audit note.
- Both `hsse_risk` **and** `worker_welfare_risk` fields (either M/H injects the HSSE Focal step).
- Chain matches the sheet: Line Manager first step on all bands; MEDIUM has Contract Owner + Contract Holder as two separate steps (both the `Project Owner` account role).
- Sourcing essentials intake: named suppliers with quote amounts, selected supplier, current cost/budget, derived avg-of-quotes and savings. **Deferred:** frequency-of-requirement, 75/90-day payment term, E&C attestation, admin CRUD UI for `pr_workflow_config`, "process led by" designation, the CP-Manager line-manager substitution rule, tender/contract-strategy document validation for HIGH.

## Role mapping & target chains

Role mapping follows the CAPEX canon (migrations 018/019); all roles exist in `ROLE_PERMISSION_PRESETS` ([capexRolePermissions.js](som-platform/backend/src/config/capexRolePermissions.js)): EMT & Contract Board → `CEO/Board`, Head of CP → `CP Manager`, FiB → `Finance in Business`, Contract Owner/Holder → `Project Owner`, Line Manager → `Manager`.

| Band | Chain (conditionals bracketed) |
|---|---|
| LOW | Manager → [HSSE Focal] → Finance in Business → CP Lead → [CP Manager if <3 quotes] → Business GM |
| MEDIUM | Manager → [HSSE Focal] → Project Owner (Contract Owner) → Project Owner (Contract Holder) → Finance in Business → [CFO if <3 quotes] → CEO/Board (EMT) → CP Manager (Head of CP) |
| HIGH | Manager → [HSSE Focal] → CP Manager (contract strategy/award review) → Finance in Business → CEO/Board (Contract Board) |

HSSE Focal is injected when `hsse_risk` **or** `worker_welfare_risk` is Medium/High. Chain lengths: LOW 4 (5 with <3 quotes), MEDIUM 6 (7 with <3), HIGH 4; +1 when HSSE applies.

## Step 1 — Migration `backend/src/database/migrations/021_pr_workflow_doa.sql` (new)

1. `CREATE TABLE IF NOT EXISTS pr_workflow_config` — exact shape of `capex_workflow_config` (migration 011:18-31) plus `allowed_user_roles TEXT[] NOT NULL DEFAULT '{}'` (parity with 016_capex_hardening; back-filled to `ARRAY[approver_role]`, kept for future admin tooling — v1 enforcement stays role-equality). Unique index `(value_band, condition_key, step_order)`; seed with `ON CONFLICT DO NOTHING` (migrations are forward-only and must be idempotent).
2. Seed rows `(value_band, condition_key, step_order, approver_role, label)` — the `ALL` rows sort first via the builder's ORDER BY, same as CAPEX:
   - `('ALL','standard',1,'Manager','Line Manager Endorsement')`
   - `('ALL','hsse_required',2,'HSSE Focal','HSSE / Worker Welfare Approval')`
   - `('LOW','standard',10,'Finance in Business','FiB Pre-support')`
   - `('LOW','standard',20,'CP Lead','CP Lead Pre-support')`
   - `('LOW','fewer_than_3',30,'CP Manager','Head of CP Approval for Fewer than 3 Quotations')`
   - `('LOW','standard',40,'Business GM','Business GM Authorization')`
   - `('MEDIUM','standard',10,'Project Owner','Contract Owner Pre-support')`
   - `('MEDIUM','standard',20,'Project Owner','Contract Holder Pre-support')`
   - `('MEDIUM','standard',30,'Finance in Business','FiB Pre-support')`
   - `('MEDIUM','fewer_than_3',40,'CFO','CFO Approval for Fewer than 3 Quotations')`
   - `('MEDIUM','standard',50,'CEO/Board','EMT (CoB) Authorization')`
   - `('MEDIUM','standard',60,'CP Manager','Head of CP / CP Manager Authorization')`
   - `('HIGH','standard',10,'CP Manager','CP Review - Contract Strategy / Award Proposal')`
   - `('HIGH','standard',20,'Finance in Business','FiB Validation')`
   - `('HIGH','standard',30,'CEO/Board','Contract Board Authorization')`
3. New `purchase_requests` columns (all `ADD COLUMN IF NOT EXISTS`):
   - `hsse_risk VARCHAR(10) NOT NULL DEFAULT 'Low' CHECK (IN ('Low','Medium','High'))`
   - `worker_welfare_risk VARCHAR(10) NOT NULL DEFAULT 'Low' CHECK (IN ('Low','Medium','High'))` — defaults mean existing PRs get no HSSE step and no null handling is needed
   - `suppliers JSONB NOT NULL DEFAULT '[]'::jsonb` — array of `{name, quoteAmount}`
   - `selected_supplier VARCHAR(200)`
   - `current_budget_omr NUMERIC(14,2)`
4. Reset in-flight PRs (idempotent via the `> 0` guard; APPROVED/REJECTED/DRAFT untouched):
   ```sql
   UPDATE purchase_requests
   SET current_step_index = 0,
       approval_history = approval_history || jsonb_build_array(jsonb_build_object(
         'approver','System','role','System','decision','WORKFLOW_RESET',
         'comment','Approval chain restarted at step 1 under the new DoA workflow (migration 021)',
         'date', to_char(now(),'YYYY-MM-DD')))
   WHERE status = 'PENDING_APPROVAL' AND current_step_index > 0;
   ```

## Step 2 — Backend: [purchaseRequestsController.js](som-platform/backend/src/controllers/purchaseRequestsController.js)

**Design: recompute the workflow from `(tier, quote_count, hsse_risk, worker_welfare_risk)` on every read/decision — no snapshot.** This is the module's existing architecture (workflow never persisted), the migration reset makes cutover coherent, and `approve` degrades safely if config changes mid-flight (missing step ⇒ role check skipped; `nextIndex >= workflow.length` ⇒ APPROVED). Same live-config semantics as the value thresholds.

1. Delete `WORKFLOW_CONFIG` (36-57) and `getWorkflow(department, tier)` (59-62). Department no longer shapes the chain; the QHSE/Retail/Infrastructure variants are retired.
2. Add, mirroring `buildCapexWorkflow`/`buildConfiguredCapexWorkflow` ([capexController.js:63-118](som-platform/backend/src/controllers/capexController.js)) exactly:
   - `buildPRWorkflowFallback({ tier, quoteCount, hsseRisk, workerWelfareRisk })` — in-code copy of the seeded chains, used when the table query fails or returns no rows.
   - `async buildPRWorkflow(db, { tier, quoteCount, hsseRisk, workerWelfareRisk })` → `[{ role, label }]`. Conditions: `['standard']` + `'hsse_required'` when either risk is Medium/High + `'fewer_than_3'` when `Number(quoteCount||0) < 3`. Query `pr_workflow_config WHERE is_active AND value_band IN ('ALL',$1) AND condition_key = ANY($2) ORDER BY CASE WHEN value_band='ALL' THEN 0 ELSE 1 END, step_order`; try/catch + empty-result → fallback.
3. Shared field validation for create/updateDraft: `hsseRisk`/`workerWelfareRisk` default `'Low'`, 400 unless in `['Low','Medium','High']`; `suppliers` optional array of `{name: string, quoteAmount?: positive number}` (400 on malformed entries); `selectedSupplier` optional string; `currentBudget` optional positive number.
4. Update handlers (all already async):
   - `create` (119-169): accept the new body fields; add `hsse_risk, worker_welfare_risk, suppliers, selected_supplier, current_budget_omr` to the INSERT; build the response workflow with the transaction client.
   - `updateDraft` (172-237): same fields in the UPDATE set (tier already recomputes here, so editing value/quotes/risk on a returned draft reshapes the chain before resubmit).
   - `getById` (~107) and `resubmit` (~280): build workflow from the row's `tier, quote_count, hsse_risk, worker_welfare_risk`.
   - `approve` (290-376): `await buildPRWorkflow(client, {...})` inside the transaction; all existing authority logic stays (FOR UPDATE, no-self-approval, role-vs-step 403, Admin override, index advance, APPROVED at chain end) — it now enforces the DoA roles.
   - `getWorkflowForPR` (468-476): SELECT additionally `quote_count, hsse_risk, worker_welfare_risk`; same response shape.
5. `mapPR` (64-84): add `hsseRisk`, `workerWelfareRisk`, `suppliers`, `selectedSupplier`, `currentBudget`, plus **derived** `avgQuote` (mean of `suppliers[].quoteAmount`, null when none) and `savings` (`current_budget_omr − total_value`, null when no budget) — derived in the mapper, not stored.
6. No changes to [routes/purchaseRequests.js](som-platform/backend/src/routes/purchaseRequests.js) — permission gating unchanged; per-step role enforcement remains in the controller.

## Step 3 — Frontend (ModuleB)

1. [NewPurchaseRequest.jsx](som-platform/frontend/src/modules/ModuleB/NewPurchaseRequest.jsx):
   - Add `hsseRisk` + `workerWelfareRisk` selects (default Low), mirroring [CapexRequestForm.jsx:170-174](som-platform/frontend/src/modules/ModuleA/CapexRequestForm.jsx).
   - Sourcing section: dynamic supplier rows (name + quoted amount, add/remove like the existing line-item rows), a selected-supplier dropdown fed from the entered names, a current cost/budget input, and read-only derived displays for avg-of-quotes and savings. `quoteCount` stays derived from attached quote files (existing behavior, untouched).
   - Include `hsseRisk, workerWelfareRisk, suppliers, selectedSupplier, currentBudget` in the submit payload (lines 77-93).
   - Fix stale `TIER_CONFIG` copy (18-22): LOW `'LOW — Business GM authorization'`, MEDIUM `'MEDIUM — EMT + Head of CP authorization'`, HIGH `'HIGH — Contract Board authorization'`. Leave client `calcTier` as-is (advisory badge; server is authoritative).
2. [PRDetail.jsx](som-platform/frontend/src/modules/ModuleB/PRDetail.jsx): approval timeline/panel/`canApprove` (543-553) are already data-driven from the API `workflow` + `currentStepIndex` — no logic changes. Add info rows for both risks and the sourcing fields (suppliers, selected supplier, budget, avg quote, savings) in the details card; add the two risk selects and sourcing inputs to `DraftEditor` (398-523) so returned drafts can revise them through `updatePR`. Tier band OMR labels (681-683) stay correct.
3. [prService.js](som-platform/frontend/src/services/prService.js): no change (payload passthrough).
4. Follow [DESIGN_SYSTEM.md](som-platform/frontend/DESIGN_SYSTEM.md) — reuse the file's existing field/select/row primitives; no new styling framework.

## Step 4 — Tests

1. [backend/tests/purchaseRequests.test.js](som-platform/backend/tests/purchaseRequests.test.js):
   - Extend the PR-creation helper with `hsseRisk, workerWelfareRisk, suppliers, currentBudget`.
   - Rewrite "MEDIUM needs two approvals" → **six** approvals (Manager → Contract Owner → Contract Holder → FiB → EMT → Head of CP), stepped with the Admin token (admin override passes each role gate); 409 after final.
   - Chain-shape assertions from the 201 response's `workflow` roles:
     - LOW, 3 quotes, Low risks → `['Manager','Finance in Business','CP Lead','Business GM']`
     - LOW, 2 quotes + justification → adds `'CP Manager'` before Business GM
     - MEDIUM, 2 quotes + justification → `['Manager','Project Owner','Project Owner','Finance in Business','CFO','CEO/Board','CP Manager']`
     - MEDIUM with `workerWelfareRisk:'High'` → `workflow[1].role === 'HSSE Focal'`
     - HIGH → `['Manager','CP Manager','Finance in Business','CEO/Board']`
   - Invalid `hsseRisk`/`workerWelfareRisk` → 400; omitted → echo `'Low'`; suppliers echo back; `avgQuote`/`savings` derived correctly; malformed supplier entry → 400.
   - Keep existing tier-boundary, justification-400, 403-no-permission, and RETURNED→edit→resubmit tests (all remain valid).
2. [NewPurchaseRequest.test.jsx](som-platform/frontend/src/modules/ModuleB/NewPurchaseRequest.test.jsx): update tier-badge label assertions to the new copy; assert both risk selects render defaulting to Low. `PurchaseRequestList.test.jsx` unaffected.

## Order of work

Migration 021 → backend controller → backend tests green → frontend form/detail → frontend tests → verification.

## Verification

DB-backed steps need live Postgres + `DATABASE_URL`/`TEST_DATABASE_URL` (distinct) + `JWT_SECRET` from the gitignored `.env` — check availability first (per CLAUDE.md; do not assume).

1. `cd som-platform/backend && npm run migrate` — run **twice** to prove 021 idempotency.
2. `npx jest tests/purchaseRequests.test.js`, then full `npm test` for regressions.
3. `cd som-platform/frontend && npx vitest run src/modules/ModuleB/NewPurchaseRequest.test.jsx src/modules/ModuleB/PurchaseRequestList.test.jsx && npm run lint && npm run build`.
4. Manual (user eyeballs in their dev server, per working preference): create a MEDIUM PR with 2 quotes + High worker-welfare risk → timeline shows Manager → HSSE Focal → Contract Owner → Contract Holder → FiB → CFO → EMT → Head of CP; Admin walks it to APPROVED; a pre-existing PENDING_APPROVAL PR shows the `WORKFLOW_RESET` note in its history.
