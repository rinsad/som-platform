# CAPEX End-to-End Demo Guide

Use this guide to explain the full CAPEX lifecycle during a client demo: who creates the request, who approves it, who fills each section, and how the project reaches final closure.

## 1. Demo Opening Message

Start with this framing:

> This CAPEX module controls one project record from the first request, through approval, procurement, execution, finance validation, AUC, capitalization, asset handover, benefits review, final closure, documents, and audit history.

The key message is that CAPEX is not only an approval screen. It is a full lifecycle governance record.

## 2. Main Roles

| Role | Main responsibility in the demo |
| --- | --- |
| Project Owner | Owns the business need, creates or supports the request, provides justification, supports closure. |
| Project Engineer | Supports request details, procurement evidence, milestones, execution updates, closure evidence. |
| Line Manager | First management endorsement, if configured in the workflow. |
| Finance in Business (FIB) | Validates budget, financial logic, savings, ROI, and finance compliance. |
| CP Lead / CP Manager | Reviews procurement route, quotations, vendor readiness, PR / PO progress, PO evidence, and PO closure. |
| HSSE / Worker Welfare Reviewer | Reviews risk-sensitive requests when HSSE or worker welfare risk is medium or high. |
| Business GM | Approves business-unit CAPEX when required by the value band or authority matrix. |
| CFO | Approves finance-sensitive or higher-value CAPEX, owns financial governance visibility. |
| EMT / Contract Board / CEO / Board | Approves high-value or strategic CAPEX when required by the configured authority matrix. |
| Finance / Corporate Controller / Asset Team | Completes financial closure, AUC review, capitalization, and asset/accounting controls. |
| Internal Audit | Reviews documents, approvals, exceptions, and audit history. Does not normally fill operational forms. |
| Admin | Configures users, permissions, thresholds, workflow routes, and master data. Admin is not the normal business actor. |

## 3. High-Level Lifecycle

Use this as the backbone of the demo:

1. Budget is available or uploaded.
2. Project Owner / Project Engineer creates a CAPEX request.
3. System calculates the value band: LOW, MEDIUM, or HIGH.
4. System routes the request through configured approvers.
5. Approvers approve, return, reject, delegate, or comment.
6. After approval, CP / Procurement and Project Engineer update procurement tracking.
7. PR and PO references are recorded.
8. PO evidence is uploaded.
9. Project Engineer tracks execution and milestones.
10. Finance validates actual spend, ROI, savings, and closure data.
11. CP / Finance complete PO closure and commitment cleanup.
12. Finance / Asset Team complete AUC review and capitalization.
13. Project Owner / Project Engineer complete the closure checklist.
14. Asset handover and benefits review are recorded.
15. Request reaches final closure.
16. Documents and audit history remain available for review.

## 4. Request Creation

### Who creates the request?

Primary creator:

- Project Owner
- Project Engineer

Supporting input may come from:

- Budget Holder
- Finance in Business
- CP / Procurement
- HSSE Focal, if the work has HSSE or worker welfare exposure

### Where to show it in the demo

Open:

`CAPEX Governance > CAPEX Requests > New CAPEX Request`

### Fields filled at creation

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| Request title | Project Owner / Project Engineer | Clear project name. Example: Station canopy upgrade. |
| Department | Project Owner / Project Engineer | The owning department or business area. |
| Business / Function | Project Owner / Project Engineer | Used for reporting and approval context. |
| Budget holder | Project Owner / Project Engineer | Person accountable for the budget. |
| Financial year | Project Owner / Project Engineer | Budget year used for approval and reporting. |
| Current cost / budget | Project Owner / Project Engineer, with Finance support | Existing budget or cost baseline. |
| Estimated value | Project Owner / Project Engineer | Drives LOW / MEDIUM / HIGH value band. |
| Urgent requirement | Project Owner / Project Engineer | Flags time-sensitive requests. |
| Scope details | Project Owner / Project Engineer | Business need, scope, and justification summary. |
| Frequency | Project Owner / Project Engineer | One-time, annual, recurring, etc. |
| Volume / year | Project Owner / Project Engineer | Relevant for recurring volume assumptions. |
| HSSE risk | Project Owner / Project Engineer, with HSSE support | May trigger HSSE review. |
| Worker welfare risk | Project Owner / Project Engineer, with HSSE support | May trigger worker welfare review. |
| Savings | Project Owner / Project Engineer, with Finance support | Expected saving value. |
| ROI | Project Owner / Project Engineer, with Finance support | Expected return or business case metric. |
| Supplier quotations | Project Owner / Project Engineer, CP support | At least one quotation is required. |
| Selected quotation | Project Owner / Project Engineer, CP support | Identifies preferred supplier quote. |
| Fewer-than-3 quotation justification | Project Owner / Project Engineer, CP support | Required when fewer than 3 valid quotations are provided. |
| Payment terms | Project Owner / Project Engineer, CP support | Commercial payment terms. |
| Payment terms agreed | Project Owner / Project Engineer, CP support | Confirms commercial terms were agreed. |

### What the system does after submission

After submission, the system:

- creates the CAPEX request record
- assigns a request ID
- calculates the value band
- starts the approval workflow
- records the submission in audit history

## 5. Approval Workflow

### Who approves?

The exact approver chain is configurable. For the demo, explain it as:

| Approval step | Typical approver | Purpose |
| --- | --- | --- |
| Line manager endorsement | Line Manager / Manager | Confirms business need and owner accountability. |
| FIB validation | Finance in Business | Validates budget, finance logic, savings, and ROI. |
| CP review | CP Lead / CP Manager | Reviews procurement route, quotation quality, and commercial readiness. |
| HSSE / worker welfare review | HSSE Focal | Required for risk-sensitive requests. |
| GM approval | Business GM | Confirms business-unit approval. |
| CFO approval | CFO | Confirms finance governance and higher-value approval. |
| EMT approval | EMT | Reviews strategic or high-value requests. |
| Contract Board approval | Contract Board / CEO / Board | Reviews highest-value or board-level requests. |

### Approval actions

Each assigned approver can:

- Approve: move request to the next workflow step.
- Return: send request back for correction.
- Reject: stop the request.
- Delegate: pass the approval to another authorized approver, if delegation is configured.
- Comment: record rationale or conditions.

### Demo wording

Say:

> The request does not move forward just because someone edited a field. It moves forward only when the current assigned approver completes the approval action.

### Statuses shown during approval

Typical statuses:

- Draft
- Submitted
- Returned for correction
- Pending line manager endorsement
- Pending FIB validation
- Pending CP review
- Pending HSSE / worker welfare review
- Pending GM approval
- Pending CFO approval
- Pending EMT approval
- Pending Contract Board approval
- Approved
- Rejected
- Cancelled

## 6. Returned Request Flow

If an approver returns the request:

1. Status changes to `Returned for correction`.
2. Project Owner / Project Engineer reviews the approver comment.
3. Requester corrects missing or incorrect details.
4. Requester resubmits.
5. Workflow resumes according to configured routing.

Demo message:

> Return is used when the request is not ready but can be corrected. Reject is used when the request should not proceed.

## 7. Procurement Tracking

### When does procurement start?

Procurement tracking should start only after CAPEX approval.

Editable statuses usually include:

- Approved
- Procurement in progress
- GSAP project created
- PR created
- PO created
- PO uploaded
- In execution
- Delayed

### Who fills procurement fields?

Primary owners:

- CP Lead
- CP Manager
- Project Engineer

Supporting roles:

- Project Owner
- Finance

### Fields filled during procurement

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| NDA status | CP / Procurement | Tracks confidentiality readiness. |
| DPA status | CP / Procurement | Tracks data protection readiness where applicable. |
| Vendor registration | CP / Procurement | Confirms supplier readiness. |
| Agreement status | CP / Procurement | Tracks commercial agreement readiness. |
| GSAP project reference | CP / Project Engineer | Manual GSAP reference in MVP. |
| PR number | CP / Project Engineer | Purchase request / requisition reference. |
| PO number | CP / Project Engineer | Purchase order reference after PO creation. |
| PO value | CP / Project Engineer, Finance visibility | Tracks committed purchase order value. |
| PO status | CP / Project Engineer | Shows whether the PO is open, uploaded, closed, etc. |
| PO attachment | CP / Project Engineer | Uploads PO document evidence. |

Demo message:

> This is where the approved CAPEX becomes an executable procurement record. The system keeps PR, PO, supplier, and document evidence tied back to the same CAPEX request.

## 8. Execution And Milestones

### When does execution start?

Milestones should be created after PO creation or PO upload.

Typical statuses:

- PO created
- PO uploaded
- In execution
- Delayed

### Who fills execution fields?

Primary owner:

- Project Engineer

Supporting owner:

- Project Owner

### Fields filled during execution

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| Milestone name | Project Engineer | Key delivery stage. |
| Planned date | Project Engineer | Target date. |
| Actual date | Project Engineer | Actual completion date. |
| Progress percentage | Project Engineer | Execution progress. |
| Delay days | Project Engineer / system logic | Shows schedule slippage. |
| Staged payment | Project Engineer / Finance support | Payment linked to delivery milestone, if applicable. |
| Evidence attachment | Project Engineer | Completion or delivery proof. |
| Risk items | Project Owner / Project Engineer / HSSE Focal | Tracks open risks during delivery. |

Demo message:

> CAPEX control does not stop at approval. The project team continues to update milestone progress and evidence, so management can see whether the approved investment is actually being delivered.

## 9. Financial Closure

### When does financial closure happen?

After technical or physical completion, Finance validates final financials before final closure.

### Who fills financial closure?

Primary owners:

- Finance
- Finance Manager
- CFO
- Finance in Business

Supporting roles:

- Project Owner
- Project Engineer
- Asset Team

### Fields filled by Finance

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| Actual spend | Finance | Final or latest spend against approved budget. |
| Final ROI | Finance / FIB | Validates actual return against business case. |
| Final savings | Finance / FIB | Validates expected or achieved savings. |
| Finance comments | Finance | Records financial closure rationale. |
| CAPEX closure form | Finance / Project Owner support | Closure evidence or reference. |
| Forecast / variance review | Finance | Confirms whether project is within approved budget. |

Demo message:

> This section belongs to Finance. The requester can support it with evidence, but Finance validates the numbers before the project can close.

## 10. PO Closure

### Who owns PO closure?

Primary owners:

- CP / Procurement
- Finance

Supporting roles:

- Project Engineer
- Project Owner

### PO closure checks

| Check | Owner | Demo explanation |
| --- | --- | --- |
| Confirm PO status | CP | Ensures PO is not left open unnecessarily. |
| Clear open commitments | CP / Finance | Releases unused commitment value. |
| Validate final PO value | CP / Finance | Confirms final committed value. |
| Upload PO closure evidence | CP / Project Engineer | Keeps evidence attached to the CAPEX record. |

Demo message:

> Completed projects with open POs are a governance risk. The module makes those visible and tracks them to closure.

## 11. AUC Review

### What is AUC?

AUC means Asset Under Construction. It is the finance holding state before the cost is capitalized into fixed assets.

### Who owns AUC?

Primary owners:

- Finance
- Corporate Controller
- Asset Team

Supporting owner:

- CFO

### AUC fields

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| AUC account | Finance / Asset Team | Accounting reference for asset under construction. |
| AUC balance | Finance | Amount currently sitting in AUC. |
| AUC status | Finance / Asset Team | Open, under review, cleared, etc. |
| AUC aging | Finance / system logic | Highlights aging exceptions. |
| AUC comments | Finance / Asset Team | Explains open items or clearing plan. |

Demo message:

> AUC review helps Finance identify projects that are complete but still sitting in asset-under-construction instead of being capitalized.

## 12. Capitalization

### Who owns capitalization?

Primary owners:

- Finance
- Corporate Controller
- Asset Team

Supporting owner:

- CFO

### Capitalization fields

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| Capitalization readiness | Finance / Asset Team | Confirms whether asset is ready to capitalize. |
| Capitalization date | Finance / Asset Team | Date the asset is moved to fixed asset register. |
| Fixed asset reference | Finance / Asset Team | Asset register reference. |
| Capitalized value | Finance | Final asset value. |
| Capitalization comments | Finance / Asset Team | Notes exceptions or dependencies. |

Demo message:

> Capitalization is not a requester activity. It is a finance and asset-accounting control after the asset is ready.

## 13. Asset Handover

### Who owns asset handover?

Primary owners:

- Project Owner
- Project Engineer
- Asset Team / receiving business owner

Supporting roles:

- Finance
- Internal Audit as viewer

### Handover checks

| Check | Owner | Demo explanation |
| --- | --- | --- |
| Asset accepted by business | Project Owner / receiving owner | Confirms the asset is usable and accepted. |
| Handover evidence uploaded | Project Engineer / Asset Team | Stores acceptance document. |
| Asset reference linked | Asset Team / Finance | Connects CAPEX record to asset register reference. |
| Outstanding snags noted | Project Engineer | Tracks incomplete handover items. |

Demo message:

> Handover proves the business has accepted the asset, not just that money was spent.

## 14. Benefits Review

### Who owns benefits review?

Primary owners:

- Project Owner
- Finance in Business
- Finance

Executive visibility:

- Business GM
- CFO
- EMT / Board, where relevant

### Benefits review fields

| Field / Section | Filled by | Demo explanation |
| --- | --- | --- |
| Expected benefits | Project Owner | Captured from the business case. |
| Actual benefits | Project Owner / Finance | Recorded after completion. |
| Savings validation | Finance / FIB | Confirms realized savings. |
| ROI validation | Finance / FIB | Compares actual ROI against expected ROI. |
| Review timing | Project Owner / Finance | Typically 6, 12, and 24 months where configured. |

Demo message:

> Benefits review closes the loop between the original business case and the actual value delivered.

## 15. Closure Checklist

### Who completes the checklist?

Primary owners:

- Project Owner
- Project Engineer

Validation owner:

- Finance

Supporting reviewers:

- CP / Procurement
- Asset Team
- Internal Audit

### Typical closure checklist

| Checklist item | Owner |
| --- | --- |
| Project scope completed | Project Owner / Project Engineer |
| Completion evidence uploaded | Project Engineer |
| Final invoice / spend validated | Finance |
| PO closed or closure plan recorded | CP / Finance |
| AUC reviewed | Finance / Asset Team |
| Capitalization completed or exception recorded | Finance / Asset Team |
| Asset handover completed | Project Owner / Asset Team |
| Benefits review scheduled or completed | Project Owner / Finance |
| Required documents attached | Project Owner / Project Engineer / CP / Finance |
| Final closure approved | Finance / accountable business approver |

Demo message:

> Final closure is not a single button at the end. It depends on evidence, finance validation, PO closure, AUC/capitalization status, and checklist completion.

## 16. Final Closure

### Who closes the request?

Final closure should be completed by an authorized closure owner, normally:

- Finance
- Finance Manager
- Project Owner, only where configured
- Admin only for exceptional correction, not normal business processing

### Final closure prerequisites

Before status becomes `Closed`, confirm:

- approvals are complete
- procurement references are captured
- PO document is uploaded where applicable
- execution milestones are complete or accepted
- financial closure is complete
- PO closure is complete or exception-approved
- AUC review is complete
- capitalization is complete or exception-approved
- asset handover is complete
- benefits review is recorded or scheduled
- closure checklist is complete
- required documents are attached
- audit history shows all major actions

### Final status

Final project status:

- `Closed`

Demo message:

> Once the project is closed, the record remains available for reporting, audit, documents, and management review.

## 17. Documents And Evidence

Documents are added throughout the lifecycle.

| Document type | Typical owner |
| --- | --- |
| Scope document | Project Owner / Project Engineer |
| Supplier quotation | Project Owner / Project Engineer / CP |
| HSSE evidence | HSSE Focal / Project Engineer |
| PO document | CP / Project Engineer |
| Milestone evidence | Project Engineer |
| CAPEX closure form | Finance / Project Owner |
| Asset handover evidence | Project Owner / Asset Team |
| Capitalization evidence | Finance / Asset Team |

Demo message:

> The document repository is the evidence layer. It proves why the request was approved, what was purchased, what was delivered, and how it was closed.

## 18. Audit History

Audit history is system-generated.

It should show:

- request creation
- field changes
- submission
- approval decisions
- returns and resubmissions
- rejection or cancellation, if applicable
- document upload actions
- procurement updates
- milestone updates
- finance closure actions
- AUC, capitalization, and PO closure updates
- final closure

Internal Audit, Admin, and authorized managers should be able to review it. Users should not manually edit audit history.

Demo message:

> Audit history answers who did what, when, and why. This is what gives the process traceability.

## 19. Suggested Demo Script

Use this exact order for a clean client demo:

1. Open CAPEX dashboard.
2. Show total requests, budget, actual, committed, and remaining budget.
3. Open CAPEX Requests.
4. Click New CAPEX Request.
5. Explain the creator: Project Owner / Project Engineer.
6. Show required fields: title, department, year, estimated value, scope, quotations.
7. Explain value band calculation.
8. Submit the request.
9. Open the request detail.
10. Show approval route and pending approver.
11. Approve, return, or explain how each approver acts.
12. Show that approved requests unlock procurement.
13. Fill or show GSAP / PR / PO / vendor readiness fields.
14. Upload or show PO evidence.
15. Show milestones and execution tracking.
16. Show financial closure section and explain Finance ownership.
17. Show PO closure.
18. Show AUC review.
19. Show capitalization.
20. Show asset handover / benefits review.
21. Show closure checklist.
22. Show final closure status.
23. End on documents and audit history.
24. Finish with governance dashboard / reports.

## 20. Short Demo Talk Track

Use this if you need a concise explanation:

> The Project Owner or Project Engineer creates the CAPEX request with business scope, budget, estimated value, risk, and quotation details. The system calculates the value band and routes the request through the configured approval chain. Approvers such as Line Manager, FIB, CP, HSSE, GM, CFO, EMT, or Contract Board act only when the workflow assigns them the current step. Once approved, CP and the Project Engineer update procurement details such as vendor readiness, GSAP reference, PR, PO, PO value, and PO evidence. During execution, the Project Engineer tracks milestones, dates, progress, staged payments, and completion evidence. After execution, Finance validates actual spend, ROI, savings, and closure details. CP and Finance close PO commitments. Finance and the Asset Team complete AUC review and capitalization. The Project Owner, Project Engineer, Finance, CP, and Asset Team complete the closure checklist. Final closure happens only when approvals, evidence, finance validation, PO closure, AUC, capitalization, asset handover, benefits review, and required documents are complete. The system keeps all documents and audit history against the same CAPEX record.

## 21. One-Slide Summary

| Stage | Main actor | Main output |
| --- | --- | --- |
| Create request | Project Owner / Project Engineer | CAPEX request submitted. |
| Validate and approve | Assigned approvers | Approval, return, rejection, or delegation. |
| Procurement | CP / Project Engineer | Vendor, GSAP, PR, PO, and PO evidence captured. |
| Execution | Project Engineer | Milestones, progress, delays, and delivery evidence tracked. |
| Financial closure | Finance / FIB / CFO | Actuals, ROI, savings, and finance validation completed. |
| PO closure | CP / Finance | Open commitments cleared or exception-managed. |
| AUC review | Finance / Asset Team | AUC balance reviewed and aging controlled. |
| Capitalization | Finance / Asset Team | Asset capitalized or exception recorded. |
| Asset handover | Project Owner / Asset Team | Business accepts asset. |
| Benefits review | Project Owner / Finance | Benefits, savings, and ROI reviewed. |
| Final closure | Finance / closure owner | Request status becomes Closed. |
| Audit | System / Internal Audit viewer | Full traceability preserved. |

## 22. Demo Notes And Caveats

- Approval thresholds are configurable. Current default value bands are LOW up to OMR 25,000, MEDIUM up to OMR 300,000, and HIGH above OMR 300,000, unless Admin changes the thresholds.
- The exact approver chain depends on the configured authority matrix.
- MVP supports manual entry for SAP SAC / GSAP references where integrations are not live.
- Internal Audit reviews evidence and audit history; it does not normally complete operational fields.
- Admin can configure and correct, but Admin should not be presented as the normal business owner for request processing.

