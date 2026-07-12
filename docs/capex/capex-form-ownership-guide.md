# CAPEX Form Ownership Guide

This guide explains who normally fills each CAPEX form or section, and when they should do it in the workflow.

It is based on:

- `docs/capex/capex-product-requirements-document.md`
- `docs/capex/capex-functional-specification.md`
- `backend/src/config/capexRolePermissions.js`

## Important note

The platform supports role-based permissions and can also be customized per user. So this document describes the default business ownership and default role presets, not a guaranteed rule for every tenant or future config change.

## Workflow summary

The intended high-level sequence in the functional specification is:

1. Budget is approved and available.
2. Requester creates the CAPEX request.
3. The request goes through the approval workflow.
4. After approval, procurement tracking starts.
5. After PO and delivery progress, execution is tracked.
6. After execution completes, Finance performs financial closure.
7. Then AUC, capitalization, PO closure, checklist, governance, and final closure activities are completed.

In short: most downstream forms should not be actively filled during the approval stage unless they are purely read-only or being prepared by an authorized owner.

## Who fills what

| Section / Form | Primary owner | Supporting roles | When it should be filled | Notes |
| --- | --- | --- | --- | --- |
| CAPEX Request / Overview | Project Owner, Project Engineer | Manager, FiB | At request creation and before submission | This is the starting form for the workflow. |
| Approval actions (approve, return, reject, delegate) | Assigned approver for the current step | Admin for configuration only | During approval workflow | Only the currently assigned approver should take the step action. |
| Procurement Tracking | CP Manager, CP Lead, Project Engineer | Project Owner as viewer; Internal Audit as viewer | After request is approved for procurement | Functional spec says approved request moves to procurement tracking after approvals. |
| NDA / DPA / vendor registration / agreement status | CP / Procurement, sometimes Project Engineer | CP Focal | After approval, during procurement readiness | These are procurement readiness controls, not requester-stage fields. |
| GSAP project reference / PR number / PO number / PO value / PO status | CP / Procurement, Project Engineer | Finance may review later | After procurement starts; PO-specific fields after PR/PO exist | Docs say MVP permits manual entry of these references. |
| PO attachment | CP / Procurement, Project Engineer | Documents owner if document handling is split | When PO document exists | This should be an upload, not a raw textbox. |
| Execution / Milestones / Staged payments | Project Engineer | Project Owner | After PO creation and when project delivery starts | Functional spec says Project Engineers track milestones and execution. |
| Financial Closure | Finance, Finance Manager, CFO, Finance in Business | Asset Team may support related finance data | After execution is complete | Docs say Finance completes financial closure after execution. |
| AUC tracking | Finance / Corporate Controller / Asset Team | CFO | After PO exists or execution starts, then through closure | PRD ties AUC to finance governance and aging controls. |
| Capitalization | Finance / Corporate Controller / Asset Team | CFO | After asset is ready for capitalization | This is not an approver task and not a requester task. |
| PO Closure | CP / Procurement with Finance visibility | Project Engineer may support | After project completion when open PO commitments must be cleared | PRD calls out PO closure discipline and overdue PO visibility. |
| Closure checklist | Project Owner, Project Engineer | Finance for final validation | Near final closure stage | Final closure should not complete until checklist and finance validation are complete. |
| MOA record | CFO, Business GM, Admin | Finance governance stakeholders | During governance/compliance recording, usually after request context exists | In the current implementation, default create/edit rights come from `capex.moa` permission. |
| Budget variation | CFO, Finance Manager, Finance in Business | Business GM for approval visibility | When approved budget needs change or re-approval path is required | Variation is a finance/governance action, not a procurement action. |
| Decision gates | Governance owner, Finance/CFO, Business approvers depending on gate | Executive viewers | At defined governance checkpoints after the relevant prerequisite is met | Gates should be passed by the accountable governance role, not by arbitrary viewers. |
| Performance & risk | Project Owner, Project Engineer, HSSE Focal | Internal Audit as viewer | During execution and post-delivery review | Risk-sensitive requests may also inject approval steps earlier in workflow. |
| Documents / versions / signatures | Project Owner, Project Engineer, CP, Admin, other permitted document owners | Audit, Finance, CP viewers | Whenever supporting evidence is produced | Document handling is evidence-oriented and spans multiple stages. |
| Audit history | System-generated | Internal Audit, Admin, authorized viewers | Entire lifecycle | Users should view this; they should not manually fill it. |
| Admin Config | System Administrator / Admin | None | Setup and maintenance, outside normal request processing | Used for thresholds, workflow rules, roles, and other master data. |

## Default role ownership by section

This is the most practical section for day-to-day use.

| Role | What they normally update |
| --- | --- |
| Project Owner | CAPEX request details, business context, closure checklist inputs, supporting documents, approvals when assigned |
| Project Engineer | CAPEX request details, procurement fields, PO evidence, execution milestones, risk items, closure support |
| CP Manager / CP Lead | Procurement tracking, vendor/procurement readiness, GSAP/PR/PO references, PO evidence, approvals when assigned |
| Finance in Business | Financial validation during approvals, variations, finance review items |
| Finance Manager / CFO | Financial closure, finance fields, variations, MOA governance data, approvals when assigned |
| Business GM | Approvals when assigned, MOA governance data, variation visibility |
| CEO/Board | Approval actions when they are the current approver; otherwise mainly read-only executive visibility |
| Asset Team | Finance-related asset and capitalization support |
| Internal Audit | Read-only governance, procurement, finance, closure, MOA, variation, risk, and audit review |
| Admin | All sections as configured; also workflow and permission setup |

## Practical UX guidance

If we want the UI to match the workflow better, these are the cleanest rules:

- Keep request fields editable during draft and returned-for-correction states.
- Keep approval actions available only to the currently assigned approver.
- Keep procurement fields disabled until the request is approved for procurement.
- Keep execution fields disabled until procurement has progressed far enough for delivery tracking to begin.
- Keep financial closure fields disabled until execution is complete.
- Keep AUC, capitalization, and PO closure controls disabled until their prerequisite lifecycle stage is reached.
- Keep audit history always read-only.
- Keep admin configuration completely separate from request processing.

## Clarifications on confusing sections

### MOA

The current product/docs do not define MOA as a requester form. It behaves more like a governance/compliance record tied to the request and checked against a configured approval route/value band matrix.

That means the person updating it is usually a finance/governance owner, not the Project Owner or CP user.

### Decision gates

Decision gates are governance checkpoints. The right actor depends on the gate:

- Budget approval gate: budget/management authority
- CAPEX approval gate: the configured approver chain
- Procurement approval gate: CP / procurement authority
- Cost and schedule review gate: project/governance owner with management oversight
- Completion and acceptance gate: project/business acceptance owner
- AUC review gate: finance / asset governance owner
- Asset acceptance gate: asset/business owner
- Benefits realization gate: business owner with finance/executive visibility

If the UI allows any viewer to press `Pass`, that is too loose.

## Recommended implementation reading of the current product

Based on the docs and permission presets, a sensible default interpretation is:

- Project forms belong to Project Owner / Project Engineer.
- Procurement forms belong to CP / Procurement and Project Engineer.
- Finance and closure forms belong to Finance roles.
- MOA and variation belong to governance/finance owners.
- Audit is system-owned and view-only.
- Executive roles should mostly approve or review, not fill operational forms.

## Source references

- `docs/capex/capex-functional-specification.md`
- `docs/capex/capex-product-requirements-document.md`
- `backend/src/config/capexRolePermissions.js`
