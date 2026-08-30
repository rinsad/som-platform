# CAPEX Project Repository — gap report

**Source:** client meeting 5 Aug 2026, 06:14 (transcript `capex & purchase request.docx`).
**Participants:** Azmath Kwaja (client, Finance in Business / HR), Rinsad (scope lead), k10717, Mahran.
**Method:** each requirement stated in the meeting, checked against the live v1 schema
(`backend/src/database/migrations/`), `capexController.js`, and the CAPEX request form
(`frontend/src/modules/ModuleA/CapexRequestForm.jsx`).

Verdict key — **Have** = exists and is reachable from the request; **Partial** = exists but in the
wrong place, wrong shape, or wrong cardinality; **Gap** = not present.

> **Status note.** The table below records the position *as found on 5 Aug 2026*. Items 4, 10, 11, 12
> and 14 have since been closed by migration 035 and the request-form work — see §5.

---

## 1. Repository field-by-field

| # | Client requirement | Status | Where it is today | What is missing |
|---|---|---|---|---|
| 1 | Project ID | **Have** | `capex_requests.id` (VARCHAR(30) PK) | — |
| 2 | Project name | **Have** | `capex_requests.title` | — |
| 3 | Business unit / function | **Have** | `department`, `business_function`, plus `organization_unit_id` → `capex_v2.organization_units` (migration 033) | — |
| 4 | Project owner (name + job title) | **Partial** | `requester_name` / `requester_id`; migration 034 already restricts request creation to the Project Owner role | No explicit *project owner* field distinct from requester, and **no job title** anywhere |
| 5 | Approved budget | **Partial** | `estimated_value` (requested), `current_cost_budget` | "Approved budget" as a distinct post-approval figure is not stored — the approved amount is inferred from `estimated_value` at approval time |
| 6 | Actual spend | **Partial** | `capex_financial_closure.actual_spend` | Only populated at closure. Client wants a **running** spend visible while in progress |
| 7 | Future commitment | **Gap** | `capex_po_closure_tracking.open_commitment_value` is the closest, and it is a closure-stage field | No forward-commitment figure on the project record |
| 8 | Project status (3–4 values only) | **Partial** | `capex_requests.status` + `capexStateMachine.js` | Current model is a ~15-state lifecycle machine. Client wants a short **reporting status** (In Progress / Completed / Paused / Postponed-to-next-year). Needs a derived roll-up, not a replacement |
| 9 | Early-completion / delay flag | **Gap** | `capex_governance_alerts` exists as a mechanism; `capex_approval_step_aging` (029) ages approvals only | No planned-vs-actual duration comparison, no ahead/behind flag |
| 10 | Start date | **Gap** | Milestones have `planned_date`/`actual_date`; AUC has `auc_start_date` | No project-level start date |
| 11 | Target completion date | **Gap** | — | Not present at project level |
| 12 | Expected capitalization date | **Partial** | `capex_capitalization_tracking.capitalization_request_date`, `capitalization_approval_date`, `fixed_asset_registered_at` | These are *actuals* recorded late in the lifecycle. No **expected** date captured up front |
| 13 | Full vs partial capitalization | **Gap** | `capex_capitalization_tracking` is **one row per request** (PK `request_id`) | Cannot represent multiple partial capitalization events during a project |
| 14 | Asset category (admin-managed LOV) | **Partial** | `capex_capitalization_tracking.asset_category` — a free `VARCHAR(100)` set at capitalization | Not a reference table, not admin-editable, and **not captured at project creation**. Rinsad explicitly asked for a dynamic admin list (pattern exists: `capex_reference_project_types`, migration 014) |
| 15 | MOA approval details (audit trail) | **Have (needs surfacing)** | `capex_approval_steps` + `capex_approval_actions` + `capex_audit_logs` record who approved at which stage | Data is there; there is **no auditor-facing report** that renders it. See §3 |
| 16 | Vendor information — many per project | **Partial** | `capex_supplier_quotations` (many rows) and `capex_v2.vendors` / `vendor_selections` | Quotations model *competing bids for one award* — `capex_v2.vendor_selections` is `UNIQUE(request_id)`, i.e. **one winner**. Client's model is **several vendors each delivering a different scope** on one project (construction + IT + …). Different relationship |
| 17 | Purchase order — many per project | **Gap** | `capex_procurement_tracking` is **one row per request** (PK `request_id`) with a single `po_number` / `po_value` / `po_attachment_name` | Client stated up to ~6 POs per project. Needs a child table |
| 18 | PO entered manually (no GSAP integration) | **Have** | `po_number`, `po_value`, `po_attachment_name` on `capex_procurement_tracking`; migration 034 gives Project Owner `can_edit` on `capex.procurement` | Matches the client's manual-entry model exactly. Only the cardinality (#17) is wrong |

---

## 2. Roles and routing

| Client statement | Status | Notes |
|---|---|---|
| Project Owner originates CAPEX **and** purchase requests | **Have** | Migration 034 revokes `can_create` on `capex.requests` / `purchase-requests` from every role except Project Owner and Admin |
| Project Owner also updates the PO after GSAP issues it | **Have** | Migration 034 grants `capex.procurement` `can_edit` to Project Owner |
| "Project Manager" role is out of scope | **Have** | Verified: no "Project Manager" role exists anywhere in `backend/src`. Nothing to retire |
| Approval chain: Owner → Line Manager → Finance in Business → GM → CFO/CEO | **Have** | `capex_workflow_config` (011) + role authority mapping (018/019) already model Manager / Finance in Business / Business GM / CFO / CEO-Board |
| Approvers auto-assigned by business | **Have, but inert** | `resolveStepAssigneeSoft()` in `capexController.js:1041` routes each step to the person holding that role in the request's business, raising a governance alert instead of blocking when unresolved. This depends on the migration-033 scoping, which ships with `capex_scope_settings.enforcement_mode = 'off'` |
| GM is per-business; CFO and CEO are common | **Have** | Portfolio roles (CEO/Board, CFO) are explicitly excluded from business scoping in 033 |
| Six businesses, fixed, no new ones | **Check** | 033 seeded organization units from existing `capex_departments` data and its header notes the authoritative business list is **still an unsigned client decision**. Reconcile against the client's six |
| Super-admin reassigns people when someone leaves or moves | **Partial** | User/permission admin exists (`/admin/users`); `capex_v2.user_scope_assignments` holds the business grants | Needs a check that the admin UI can edit scope assignments, not just permissions |

---

## 3. Terminology collision — flag before the next call

The codebase already uses "MOA" for something **different** from what the client means.

- **In the code:** `capex_moa_records` (migration 013) models a *Memorandum-of-Agreement-style document*
  per request — `moa_number`, `effective_date`, `expiry_date`, `renewal_required`, revisions.
- **In the meeting:** "MOA" = **Manual of Authority** — the delegation-of-authority matrix defining
  approval ceilings (business GM up to X, then CFO, then Board, then CEO), and "MOA approval details"
  means *the workflow approval log for this project*.

These are not the same object. The client's "MOA approval details" maps to
`capex_approval_steps` / `capex_approval_actions`, **not** to `capex_moa_records`. Either rename the
existing table's concept or introduce a clearly distinct name for the authority matrix before both
meanings end up in the same schema.

Related: `capex_value_thresholds` (LOW ≤ 25,000; MEDIUM ≤ 300,000 OMR) and `capexThresholds.js`
already encode approval ceilings. When Azmath sends the capital-sanction extract from the real Manual
of Authority, these numbers and the per-business ceilings must be reconciled against it.

---

## 4. Out of current scope (raised, not agreed)

**Manual of Authority as a searchable document.** The client wants the MOA Excel hosted and
*interactively searchable* ("search 'short-term lending and renewal' → point me to line 117"), not
merely downloadable. Rinsad deferred it pending scope, budget and timeline.

Feasibility note: the ingredients exist — `knowledge_base`, `kb_chunks` with FTS (migration 003) and
`005_vector_search.sql`. Chunk-and-index of a sectioned Excel is a known quantity here. Treat it as a
separately-scoped item, not part of this phase.

---

## 5. Recommended work order

Cheap and unblocking first:

1. ~~**Asset category → reference table + admin CRUD.**~~ **Done** — migration 035 adds
   `capex_reference_asset_categories`; `GET /api/capex/asset-categories` (readable with
   `capex.requests`) plus Admin-only `POST`/`PATCH` under `/admin-config/asset-categories`.
   Retiring a category deactivates it rather than deleting, so historical requests keep their label.
   Managed from the **Asset Categories** panel on the CAPEX *Admin Config* tab. Placeholder seeds
   only — **the client's list still has to be entered there.**
2. ~~**Project-level dates on `capex_requests`.**~~ **Done** — `start_date`,
   `target_completion_date`, `expected_capitalization_date`, `project_owner_title` and
   `asset_category_id`, captured in the request form's new *Schedule & capitalization* section and
   returned by the request read endpoints.
3. **Reporting status roll-up + schedule flag.** Derive a 4-value status from the lifecycle machine
   in `capexStateMachine.js` (do not replace the machine); add ahead/on-time/delayed computed from
   planned vs actual duration.
4. **PO child table.** `capex_purchase_orders (request_id, po_number, po_value, po_date,
   attachment_id, status)`; migrate the existing single-PO columns on `capex_procurement_tracking`
   forward and keep them readable during transition.
5. **Project vendors.** A `capex_project_vendors` link (vendor, scope of work, value, status),
   distinct from `capex_supplier_quotations`, which stays as the competitive-bid record.
6. **Auditor report.** One export per project joining approval steps, actions, vendors, POs and
   attachments — the "hand it to the auditor" artefact Azmath described.
7. **Running spend and future commitment** on the project record, so the repository shows live
   figures rather than closure-only ones.

Deferred pending client input: partial-capitalization events (#13), the Manual of Authority search
feature (§4), and flipping migration-033 scope enforcement from `off`.

---

## 6. Open questions for the WhatsApp group

Azmath travels until **16 Aug** and asked for written questions in the WhatsApp group.

1. Confirm the **six businesses** by name — needed to sign off the organization-unit master (033 flags
   this as an unsigned decision).
2. **Approved budget vs estimated value** — is the approved budget the submitted estimate as approved,
   or a separately entered figure after funds release?
3. **Partial capitalization** — how many partial events realistically, and does each need its own date
   and value, or is a running capitalized total enough?
4. **Exact status list** — confirm the 3–4 reporting statuses and the wording ("Postponed to next
   year"? "On hold"?).
5. **Delay flag threshold** — is late measured against target completion date only, or is a tolerance
   (e.g. ±10%) applied before flagging?
6. **Vendor record** — which vendor fields matter beyond name and scope? Registration number,
   contact, contract value?
7. **Funds release** — the call described a distinct "funds released from global" step after approval
   and before PR creation. Is that a tracked stage in the system, or does it happen entirely outside?

Awaiting from Azmath: the capital-sanction section of the Manual of Authority, the full asset-category
list, and per-business workflow master data (real names) for production.
