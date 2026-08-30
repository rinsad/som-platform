# Purchase Request End-to-End Demo Guide

Use this guide to demonstrate the Purchase Request (PR) module from request creation through supplier selection, approval, document evidence, return/resubmit, and final approval.

## 1. Demo Opening Message

Start with this framing:

> The PR module controls a purchase request from requisitioner intake, line-item value calculation, supplier quotations, risk classification, DoA approval routing, supplier selection, documents, and final approval.

The key message is that the PR module is not only a list of requests. It is a controlled procurement approval workflow with evidence and audit history.

## 2. Main Roles

| Role | Main responsibility in the PR flow |
| --- | --- |
| Requester / Requisitioner | Creates the PR, enters business need, line items, supplier quotations, risks, and justification. |
| Line Manager / Manager | First endorsement step for all PR value bands. |
| HSSE Focal | Reviews PRs when HSSE risk or worker welfare risk is Medium or High. |
| Finance in Business (FIB) | Validates financial logic, budget, savings, and business case support. |
| CP Lead | Provides CP pre-support on LOW value PRs and may select supplier quotations. |
| CP Manager / Head of CP | Approves specific LOW / MEDIUM / HIGH steps and may select supplier quotations. |
| Project Owner / Contract Owner | Provides contract owner pre-support on MEDIUM value PRs. |
| Project Owner / Contract Holder | Provides contract holder pre-support on MEDIUM value PRs. |
| Business GM | Authorizes LOW value PRs. |
| CFO | Approves MEDIUM PRs when fewer than 3 quotations are provided. |
| CEO / Board / EMT / Contract Board | Approves MEDIUM EMT steps and HIGH Contract Board steps. |
| Admin | Can configure and override where permitted, but is not the normal business actor. |
| Internal Audit / Reviewer | Reviews approval history, document evidence, supplier selection, and audit trail. |

## 3. High-Level Lifecycle

Use this as the backbone of the demo:

1. Requester creates a new PR.
2. Requester enters request details, department, description, and line items.
3. System calculates total value from line items.
4. System classifies the PR as LOW, MEDIUM, or HIGH.
5. Requester enters HSSE and worker welfare risk.
6. Requester enters supplier quotations and uploads quote files.
7. Requester marks a selected quotation, or CP selects it while approval is pending.
8. If fewer than 3 quotes are entered, requester must provide justification.
9. System builds the DoA approval workflow based on value band, quote count, and risk.
10. Assigned approvers approve, return, or reject sequentially.
11. If returned, requester edits the draft and resubmits.
12. Final approval requires a selected supplier quotation.
13. Approved PR remains available with documents and decision history.

## 4. Request Creation

### Who creates the PR?

Primary creator:

- Requester / Requisitioner

Supporting input may come from:

- Line Manager
- CP Lead / CP Manager
- Finance in Business
- HSSE Focal
- Budget holder or business owner

### Where to show it in the demo

Open:

`Purchase Requests > New Purchase Request`

### Fields filled at creation

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| PR title | Requester | Short name of the purchase requirement. |
| Department | Requester | Owning department. Defaults from logged-in user where available. |
| Description | Requester | Purpose and scope of the purchase. |
| HSSE risk | Requester, with HSSE support if needed | Medium/High adds HSSE Focal review. |
| Worker welfare risk | Requester, with HSSE support if needed | Medium/High adds HSSE Focal review. |
| Line item description | Requester | What is being purchased. |
| Quantity | Requester | Required quantity. |
| Unit price | Requester | Unit price in OMR. |
| Total value | System-calculated | Quantity x unit price, summed across line items. |
| Supplier name | Requester / CP support | Supplier quotation source. |
| Quote amount | Requester / CP support | Supplier quoted amount in OMR. |
| Quote file | Requester / CP support | Uploaded quotation document. |
| Selected quotation | Requester or CP | Identifies preferred supplier quote. |
| Current cost / budget | Requester, with Finance support | Used to show savings. |
| Average quote | System-calculated | Average of quote amounts. |
| Savings | System-calculated | Current budget minus selected quote value. |
| Justification | Requester | Required when fewer than 3 quotations are provided. |

### What the system does after submission

After submission, the system:

- creates the PR record
- stores line items and supplier quotations
- calculates total value
- calculates approval tier
- checks quotation count
- requires justification if fewer than 3 quotes are provided
- builds the approval workflow
- records creation in audit / decision history

## 5. Value Bands

The PR module uses the shared CAPEX value thresholds unless Admin changes them.

| Band | Current default threshold | Demo wording |
| --- | --- | --- |
| LOW | Up to OMR 25,000 | Business GM authorization route. |
| MEDIUM | OMR 25,001 to OMR 300,000 | EMT plus Head of CP authorization route. |
| HIGH | Above OMR 300,000 | Contract Board authorization route. |

Demo message:

> The requester does not choose the tier manually. The system calculates it from total PR value.

## 6. Approval Workflow

The approval chain is built from:

- value band: LOW / MEDIUM / HIGH
- quote count: fewer than 3 or 3+
- HSSE risk
- worker welfare risk

### LOW value PR

Standard chain:

1. Manager - Line Manager Endorsement
2. Finance in Business - FIB Pre-support
3. CP Lead - CP Lead Pre-support
4. Business GM - Business GM Authorization

Conditional steps:

- Add HSSE Focal after Manager when HSSE or worker welfare risk is Medium/High.
- Add CP Manager before Business GM when fewer than 3 quotations are provided.

### MEDIUM value PR

Standard chain:

1. Manager - Line Manager Endorsement
2. Project Owner - Contract Owner Pre-support
3. Project Owner - Contract Holder Pre-support
4. Finance in Business - FIB Pre-support
5. CEO/Board - EMT authorization
6. CP Manager - Head of CP / CP Manager Authorization

Conditional steps:

- Add HSSE Focal after Manager when HSSE or worker welfare risk is Medium/High.
- Add CFO before EMT when fewer than 3 quotations are provided.

### HIGH value PR

Standard chain:

1. Manager - Line Manager Endorsement
2. CP Manager - CP Review / Contract Strategy / Award Proposal
3. Finance in Business - FIB Validation
4. CEO/Board - Contract Board Authorization

Conditional step:

- Add HSSE Focal after Manager when HSSE or worker welfare risk is Medium/High.

## 7. Approval Actions

Each current approver can:

- Approve: moves the PR to the next workflow step.
- Return: sends the PR back to draft for correction.
- Reject: stops the PR.
- Comment: records decision rationale.

Important control rules:

- Only PRs in `PENDING_APPROVAL` can be decided.
- A requester cannot approve or decide their own PR, unless Admin override is used.
- A non-admin approver must match the role required for the current workflow step.
- Return and reject require a comment.
- Final approval requires a selected supplier quotation.

Demo message:

> Approval is sequential. The PR moves one step at a time, and each action is recorded in decision history.

## 8. Supplier Quotation And Selection

### Who enters supplier quotations?

Primary owner:

- Requester

Supporting owner:

- CP Lead / CP Manager

### Who selects the final supplier quotation?

Allowed roles:

- CP Lead
- CP Manager
- Admin

The requester may mark a quote in the creation form, but CP can complete or change supplier selection while the PR is pending approval.

### Quotation rules

| Rule | Demo explanation |
| --- | --- |
| At least one quotation is required | PR cannot be submitted without supplier quotation entry. |
| Supplier name is required | Each quote row must name the supplier. |
| Quote amount must be positive | Quote amount must be greater than zero. |
| Quote file is uploaded per supplier | Quote documents are stored as evidence. |
| Fewer than 3 quotes requires justification | System blocks submission/resubmission without justification. |
| Final approval requires selected quote | A PR cannot become approved without a selected supplier quotation. |

Demo message:

> Supplier selection is a procurement control. The system allows CP roles to select the winning quotation before final approval.

## 9. Return And Resubmit Flow

If an approver returns a PR:

1. Approver selects Return.
2. Approver enters a required comment.
3. PR status becomes `DRAFT`.
4. Current step index resets to the start.
5. Requester or Admin edits the draft.
6. Requester updates details, line items, risks, quotes, supplier selection, or justification.
7. Requester resubmits.
8. Status becomes `PENDING_APPROVAL`.
9. A `RESUBMITTED` event is added to decision history.
10. Approval resumes from step 1 using the latest workflow shape.

Demo message:

> Return is for correction. The request is not lost; it becomes editable again, then resubmits with full history preserved.

## 10. Reject Flow

If an approver rejects a PR:

1. Approver selects Reject.
2. Approver enters a required comment.
3. PR status becomes `REJECTED`.
4. PR cannot continue through approval.
5. Decision history preserves the rejection reason.

Demo message:

> Reject is a terminal decision. Return is for correction; reject is for stopping the request.

## 11. Approved Flow

A PR becomes `APPROVED` only after:

- all workflow steps are approved
- the current user is authorized for each step, or Admin override is used
- selected supplier quotation exists before final approval
- no terminal-state guard blocks the decision

After approval:

- PR remains visible in the list and detail page
- decision history remains visible
- supplier quotation evidence remains visible
- document repository remains visible
- further normal approval decisions are blocked

Demo message:

> The PR is approved only after the final required DoA approver completes their step and supplier selection evidence is in place.

## 12. Documents

The PR module supports documents in two places.

### Supplier quote documents

These are uploaded directly against supplier quotation rows.

Typical owners:

- Requester
- CP Lead / CP Manager

### General document repository

Document types:

- Scope
- Technical
- Document

Typical owners:

- Requester
- CP / Procurement
- Finance / reviewers, where supporting evidence is needed

Demo message:

> Supplier quotations are stored against the supplier rows, while the document repository stores broader supporting evidence such as scope and technical files.

## 13. Decision History And Audit Trail

Decision history shows:

- PR created
- supplier selected
- approval decisions
- return decisions
- rejection decisions
- resubmission
- workflow reset events, if any historical PRs were reset during DoA alignment

The audit trail answers:

- who acted
- what role they used
- which workflow step they acted on
- what decision they made
- what comment they entered
- when the decision happened

Demo message:

> The approval timeline shows step progress, while decision history shows the full audit record, including returns and resubmissions.

## 14. Statuses

| Status | Meaning |
| --- | --- |
| DRAFT | PR is editable by requester or Admin, usually after creation draft or return for correction. |
| PENDING_APPROVAL | PR is in the approval chain. |
| APPROVED | All required approval steps are complete and supplier selection exists. |
| REJECTED | PR was rejected and cannot proceed. |

## 15. Who Fills What

| Section / Action | Primary owner | Supporting roles |
| --- | --- | --- |
| Request details | Requester | Line Manager |
| Department | Requester | Admin only for correction/configuration |
| Description / scope | Requester | Line Manager, CP |
| Line items | Requester | CP / Finance for review |
| Total value | System | Requester enters quantity and unit price |
| HSSE risk | Requester | HSSE Focal |
| Worker welfare risk | Requester | HSSE Focal |
| Supplier quotation rows | Requester | CP Lead / CP Manager |
| Quote files | Requester | CP Lead / CP Manager |
| Selected supplier | CP Lead / CP Manager | Requester can propose selection during creation |
| Current budget | Requester | Finance / FIB |
| Justification for fewer than 3 quotes | Requester | CP / Finance |
| Approval decisions | Current assigned approver | Admin override where permitted |
| Return correction | Requester | Admin |
| Resubmission | Requester | Admin |
| Documents | Requester / CP / Finance | Authorized users |
| Audit review | Internal Audit / Management | Admin |

## 16. Recommended Demo Script

Use this order for a clean client demo:

1. Open Purchase Requests list.
2. Show status filters and high-level PR register.
3. Click New Purchase Request.
4. Explain that the requester creates the PR.
5. Fill PR title, department, and description.
6. Fill HSSE risk and worker welfare risk.
7. Add line items and show total value calculation.
8. Show approval tier changing based on total value.
9. Add supplier quotation rows.
10. Upload quote files.
11. Select or explain supplier selection.
12. Show quote count and fewer-than-3 justification rule.
13. Submit the PR.
14. Open the PR detail page.
15. Show Request Information.
16. Show supplier quotations and selected supplier.
17. Open Approval Progress.
18. Explain the generated DoA chain.
19. Approve first step.
20. Show current step advances.
21. Demonstrate Return if you want to show correction handling.
22. Edit draft and resubmit.
23. Show Decision History preserving return and resubmit events.
24. Walk through approvals until final approval.
25. Show final `APPROVED` status.
26. End on Documents and Audit Trail.

## 17. Short Demo Talk Track

Use this if you need a concise explanation:

> The requester creates a purchase request with department, description, line items, HSSE risk, worker welfare risk, supplier quotations, quote files, current budget, and justification where fewer than 3 quotes are available. The system calculates total value and assigns a LOW, MEDIUM, or HIGH approval tier. It then builds the DoA approval chain using value band, risk, and quotation count. Approvers act sequentially: Manager, HSSE Focal when risk requires it, FIB, CP, Business GM, CFO, EMT, or Contract Board depending on the route. If the request is incomplete, an approver returns it to draft with a comment; the requester corrects and resubmits. CP Lead or CP Manager can select the supplier quotation while approval is pending. Final approval is blocked until the selected supplier exists. Every approval, return, resubmission, and supplier selection is preserved in decision history and audit trail.

## 18. One-Slide Summary

| Stage | Main actor | Main output |
| --- | --- | --- |
| Create PR | Requester | Purchase request submitted. |
| Enter line items | Requester | Total value calculated. |
| Enter risks | Requester / HSSE support | HSSE step added if needed. |
| Enter quotations | Requester / CP support | Supplier evidence captured. |
| Justify fewer than 3 quotes | Requester | Submission allowed with rationale. |
| Select supplier | CP Lead / CP Manager | Winning quotation recorded. |
| Approve route | Assigned approvers | Sequential DoA approval completed. |
| Return correction | Approver then requester | Draft corrected and resubmitted. |
| Reject | Assigned approver | PR stopped with reason. |
| Final approval | Last required approver | PR status becomes Approved. |
| Audit review | Internal Audit / Management | Traceability preserved. |

## 19. Demo Notes And Caveats

- Approval thresholds are configurable. Current defaults are LOW up to OMR 25,000, MEDIUM up to OMR 300,000, and HIGH above OMR 300,000.
- The exact workflow comes from `pr_workflow_config`; Admin configuration can change future workflow behavior.
- Fewer than 3 quotations does not block the PR if justification is provided, but it adds extra approval controls.
- Medium or High HSSE / worker welfare risk adds HSSE Focal review.
- The requester cannot approve their own PR.
- Return moves the PR back to draft; reject stops it.
- Final approval requires a selected supplier quotation.
- Admin can override approval steps, but for demo purposes explain Admin override as an exception, not the normal business process.

