# CAPEX End User Testing Manual

This manual is for client users who want to test the CAPEX module themselves. It explains which user to log in as, what each role should test, and the expected workflow from CAPEX request creation to final closure.

## 1. Login Users

Use the demo users below if the environment has been seeded with CAPEX demo users.

Default password:

`Test@1234`

| User | Email | Role | What to test |
| --- | --- | --- | --- |
| CAPEX Admin | capex.admin@shell.om | Admin | Full access, configuration, override testing, troubleshooting. |
| Line Manager | manager@shell.om | Manager | Line manager approval / endorsement. |
| Project Owner | project-owner@shell.om | Project Owner | Create CAPEX requests, add documents, risks, closure support. |
| Project Engineer | project-engineer@shell.om | Project Engineer | Procurement support, execution milestones, documents, closure evidence. |
| Finance in Business | finance-business@shell.om | Finance in Business | Finance validation, approval, variations, financial review. |
| Finance Manager | finance-manager@shell.om | Finance Manager | Finance closure, AUC, capitalization, reports. |
| CFO | cfo@shell.om | CFO | CFO approval, finance governance, reports. |
| CP Lead | cp-lead@shell.om | CP Lead | Procurement tracking, PR/PO references, approval where assigned. |
| CP Manager | cp-manager@shell.om | CP Manager | Procurement controls, Head of CP approval, PO tracking. |
| Business GM | business-gm@shell.om | Business GM | Business approval, variation visibility, governance. |
| HSSE Focal | hsse-focal@shell.om | HSSE Focal | Mandatory screening of every request and assignment of HSSE / worker welfare ratings. |
| Asset Team | asset-team@shell.om | Asset Team | AUC, capitalization, asset support. |
| Internal Audit | internal-audit@shell.om | Internal Audit | Read-only governance, documents, audit trail review. |
| CEO Board | ceo-board@shell.om | CEO/Board | Executive / board approval and portfolio review. |

## 2. Testing Rules

- Use one browser profile or incognito window per role, or log out fully before switching users.
- Start with `project-owner@shell.om` for request creation.
- Use `capex.admin@shell.om` only when you need full access or need to move a workflow forward quickly.
- Capture screenshots of any unexpected result.
- For each test, record: user, role, request ID, action performed, expected result, actual result.

## 3. CAPEX Workflow Overview

The CAPEX module covers:

1. CAPEX dashboard and budget visibility.
2. CAPEX request creation.
3. Approval workflow.
4. Procurement tracking.
5. Execution and milestone tracking.
6. Financial closure.
7. AUC review.
8. Capitalization.
9. PO closure.
10. Closure checklist.
11. Governance records, variations, risks, documents, and audit history.
12. Final closure.

## 4. Role Ownership

| Workflow area | Primary role | Supporting roles |
| --- | --- | --- |
| CAPEX request creation | Project Owner / Project Engineer | Finance in Business, CP, HSSE |
| Approval actions | Current assigned approver | Admin override |
| Procurement tracking | CP Lead / CP Manager | Project Engineer |
| GSAP / PR / PO references | CP Lead / CP Manager / Project Engineer | Finance |
| Execution milestones | Project Engineer | Project Owner |
| Risk items | Project Owner / Project Engineer / HSSE Focal | Internal Audit as viewer |
| Financial closure | Finance Manager / Finance in Business / CFO | Project Owner / Asset Team |
| AUC review | Finance Manager / Asset Team | CFO |
| Capitalization | Finance Manager / Asset Team | CFO |
| PO closure | CP / Finance | Project Engineer |
| Closure checklist | Project Owner / Project Engineer | Finance validation |
| Documents | Project Owner / Project Engineer / CP / Finance | Audit viewers |
| Audit history | System-generated | Internal Audit / Admin / management viewers |
| Admin configuration | Admin | None |

## 5. Test Case 1: Create A CAPEX Request

Login as:

`project-owner@shell.om`

Steps:

1. Open `CAPEX Governance`.
2. Go to `CAPEX Requests`.
3. Click `New CAPEX Request`.
4. Fill the required fields:
   - Request Title
   - Department
   - Business / Function
   - Budget Holder
   - Financial Year
   - Estimated Value
   - Scope Details
   - Supplier quotation details
5. Add at least one supplier quotation.
6. If fewer than 3 quotations are entered, fill the justification field.
7. Select one supplier quotation.
8. Submit the request.

Expected result:

- Request is created successfully.
- A unique CAPEX request appears in the request list.
- Status moves into the approval workflow.
- The request detail page shows overview, approvals, procurement, execution, finance, documents, and audit sections.

## 6. Request Creation Fields

| Field | Who fills it | Required for testing |
| --- | --- | --- |
| Request Title | Project Owner / Project Engineer | Yes |
| Department | Project Owner / Project Engineer | Yes |
| Business / Function | Project Owner / Project Engineer | Recommended |
| Budget Holder | Project Owner / Project Engineer | Recommended |
| Financial Year | Project Owner / Project Engineer | Yes |
| Current Cost / Budget | Project Owner / Finance support | Optional |
| Estimated Value | Project Owner / Project Engineer | Yes |
| Urgent Requirement | Project Owner / Project Engineer | Optional. Marks the request for priority display and filtering; it does not change approval routing. Editable after submission only when returned for correction. |
| Project Description | Project Owner / Project Engineer | Yes; shown in Project & Budget |
| Project Documents & Presentations | Project Owner / Project Engineer | At least one file; multiple files are supported, maximum 5 MB each |
| Frequency | Project Owner / Project Engineer | Optional |
| Volume / Year | Project Owner / Project Engineer | Optional |
| Savings | Project Owner / Finance support | Optional |
| ROI | Project Owner / Finance support | Optional |
| Supplier Quotations | Project Owner / CP support | Yes |
| Justification for fewer than 3 quotations | Project Owner / CP support | Required if fewer than 3 quotes |
| Payment Terms | Project Owner / CP support | Recommended |
| Payment Terms Agreed | Project Owner / CP support | Optional |

HSSE Risk and Worker Welfare Risk are not requester fields. Both begin as `Not assessed`; the HSSE Focal must assign Low, Medium, or High during the mandatory screening step before approving it.

## 7. Test Case 2: Review Approval Chain

Login as:

`project-owner@shell.om` or `capex.admin@shell.om`

Steps:

1. Open the CAPEX request created in Test Case 1.
2. Open the `Approvals` section.
3. Review the pending step and approval route.
4. Confirm the current step shows an approver role or assigned approver.

Expected result:

- Approval chain is visible.
- Current pending approval is clear.
- Approve / Return / Reject actions are visible only to users with approval authority.

## 8. Test Case 3: Approve A CAPEX Request

Use the user matching the current approval step. If unsure, use Admin for controlled testing.

Common approver users:

| Workflow step | Test user |
| --- | --- |
| Line Manager / Manager | manager@shell.om |
| Finance in Business | finance-business@shell.om |
| HSSE Focal | hsse-focal@shell.om |
| CP Lead | cp-lead@shell.om |
| CP Manager / Head of CP | cp-manager@shell.om |
| Business GM | business-gm@shell.om |
| CFO | cfo@shell.om |
| CEO / Board / EMT / Contract Board | ceo-board@shell.om |
| Admin override | capex.admin@shell.om |

Steps:

1. Log in as the current approver.
2. Open the CAPEX request.
3. Go to `Approvals`.
4. Add a comment if needed.
5. Click `Approve`.
6. Refresh or reopen the request.

Expected result:

- Decision is recorded.
- Request advances to the next approval step.
- Audit history records who approved, role, date, step, and comment.

## 9. Test Case 4: Return A CAPEX Request For Correction

Login as:

Any current approver, or `capex.admin@shell.om`.

Steps:

1. Open a request in approval.
2. Go to `Approvals`.
3. Click `Return`.
4. Enter a clear return reason.
5. Confirm the action.
6. Log back in as `project-owner@shell.om`.
7. Open the returned request.
8. Correct the request details.
9. Resubmit if the UI provides the resubmit action.

Expected result:

- Request status changes to returned / correction state.
- Requester can edit relevant request fields.
- Return reason is visible in audit history.
- After resubmission, approval continues again.

## 10. Test Case 5: Reject A CAPEX Request

Login as:

Current approver, or `capex.admin@shell.om`.

Steps:

1. Open a request in approval.
2. Go to `Approvals`.
3. Click `Reject`.
4. Enter rejection reason.
5. Confirm.

Expected result:

- Request status becomes rejected.
- Request cannot continue through normal approval.
- Rejection reason appears in audit history.

## 11. Test Case 6: Procurement Tracking

Login as:

`cp-lead@shell.om`, `cp-manager@shell.om`, or `project-engineer@shell.om`.

Prerequisite:

The CAPEX request should be approved or in a procurement-enabled status.

Steps:

1. Open the approved CAPEX request.
2. Go to `Procurement`.
3. Update procurement fields where available:
   - NDA status
   - DPA status
   - Vendor registration
   - Agreement status
   - GSAP project reference
   - PR number
   - PO number
   - PO value
   - PO status
4. Upload PO evidence if available.
5. Save.

Expected result:

- Procurement data saves successfully.
- Fields remain linked to the same CAPEX request.
- Audit history records relevant updates.
- Procurement fields should not be editable before approval.

## 12. Test Case 7: Execution Milestones

Login as:

`project-engineer@shell.om` or `project-owner@shell.om`.

Prerequisite:

PO should be created/uploaded, or the request should be in execution-enabled status.

Steps:

1. Open the CAPEX request.
2. Go to `Execution`.
3. Add a milestone.
4. Fill:
   - Milestone name
   - Planned date
   - Actual date, if complete
   - Progress
   - Staged payment details, if available
   - Evidence
5. Save.

Expected result:

- Milestone appears in execution tracking.
- Progress and dates are visible.
- Audit history captures the update.

## 13. Test Case 8: Financial Closure

Login as:

`finance-manager@shell.om`, `finance-business@shell.om`, or `cfo@shell.om`.

Prerequisite:

Execution should be complete or near complete.

Steps:

1. Open the CAPEX request.
2. Go to `Financial Closure`.
3. Enter or review:
   - Actual spend
   - Final ROI
   - Final savings
   - Finance comments
   - CAPEX closure form reference or attachment
4. Save.

Expected result:

- Finance fields save successfully.
- Non-finance users should not be able to complete finance-owned closure fields unless configured.
- Financial closure information appears in request detail and audit history.

## 14. Test Case 9: AUC Review

Login as:

`finance-manager@shell.om` or `asset-team@shell.om`.

Steps:

1. Open the CAPEX request.
2. Go to `AUC`.
3. Enter or review:
   - AUC account
   - AUC balance
   - AUC status
   - AUC comments
4. Save.

Expected result:

- AUC status is recorded.
- AUC aging / exception visibility is available where configured.

## 15. Test Case 10: Capitalization

Login as:

`finance-manager@shell.om` or `asset-team@shell.om`.

Steps:

1. Open the CAPEX request.
2. Go to `Capitalization`.
3. Enter or review:
   - Capitalization readiness
   - Capitalization date
   - Fixed asset reference
   - Capitalized value
   - Comments
4. Save.

Expected result:

- Capitalization information is saved.
- Asset / finance ownership is reflected.

## 16. Test Case 11: PO Closure

Login as:

`cp-manager@shell.om`, `cp-lead@shell.om`, or `finance-manager@shell.om`.

Steps:

1. Open the CAPEX request.
2. Go to `PO Closure`.
3. Confirm PO status and open commitment position.
4. Enter closure comments or evidence.
5. Save.

Expected result:

- PO closure status is updated.
- Open commitment issue is visible if PO remains open.

## 17. Test Case 12: Closure Checklist

Login as:

`project-owner@shell.om`, `project-engineer@shell.om`, or finance validation role.

Steps:

1. Open the CAPEX request.
2. Go to `Closure Checklist`.
3. Mark checklist items complete where evidence exists.
4. Upload supporting documents if needed.
5. Confirm finance validation is complete.

Expected result:

- Checklist items update to completed.
- Final closure should not be possible until mandatory checklist and finance validation are complete.

## 18. Test Case 13: Documents

Login as:

`project-owner@shell.om`, `project-engineer@shell.om`, `cp-manager@shell.om`, or another document-enabled role.

Steps:

1. Open a CAPEX request.
2. Go to `Documents`.
3. Upload a document:
   - Scope Document
   - Supplier Quotation
   - HSSE Evidence
   - PO Document
   - Milestone Evidence
   - CAPEX Closure Form
4. Download the uploaded document.

Expected result:

- Document uploads successfully.
- Document appears in the request document list.
- Download works.
- Audit trail records document action where configured.

## 19. Test Case 14: Audit Review

Login as:

`internal-audit@shell.om` or `capex.admin@shell.om`.

Steps:

1. Open a CAPEX request.
2. Go to `Audit History`.
3. Review:
   - Creation
   - Approval decisions
   - Return / rejection events
   - Procurement updates
   - Milestone updates
   - Finance closure updates
   - Document actions
   - Final closure

Expected result:

- Internal Audit can view evidence and history.
- Audit history is read-only.
- History shows who did what and when.

## 20. Test Case 15: Governance Dashboard And Reports

Login as:

`cfo@shell.om`, `ceo-board@shell.om`, `business-gm@shell.om`, `finance-manager@shell.om`, or `internal-audit@shell.om`.

Steps:

1. Open `CAPEX Governance`.
2. Review dashboard KPIs.
3. Review alerts / exceptions.
4. Export CSV if available to the role.
5. Open reports or scheduled reports where available.

Expected result:

- User sees governance information appropriate to their role.
- Export works for users with report permission.
- Restricted users should not see admin-only controls.

## 21. End-To-End Happy Path

Use this full scenario to test one request from start to finish:

1. `project-owner@shell.om`: Create CAPEX request.
2. `manager@shell.om`: Approve line manager step, if present.
3. `finance-business@shell.om`: Approve FIB / finance validation step, if present.
4. `hsse-focal@shell.om`: Approve HSSE step, if risk requires it.
5. `cp-lead@shell.om` or `cp-manager@shell.om`: Approve CP step, if present.
6. `business-gm@shell.om`: Approve GM step, if present.
7. `cfo@shell.om`: Approve CFO step, if present.
8. `ceo-board@shell.om`: Approve EMT / Board / Contract Board step, if present.
9. `cp-manager@shell.om`: Update procurement and PO details.
10. `project-engineer@shell.om`: Add execution milestones.
11. `finance-manager@shell.om`: Complete financial closure.
12. `asset-team@shell.om`: Complete AUC / capitalization support.
13. `project-owner@shell.om`: Complete closure checklist items.
14. `internal-audit@shell.om`: Review documents and audit trail.

Expected final result:

- Request reaches approved / downstream lifecycle statuses.
- Procurement, execution, finance, AUC, capitalization, PO closure, checklist, documents, and audit data are visible.
- Final closure is possible only after required evidence and validations are complete.

## 22. Quick Pass / Fail Checklist

| Check | Pass criteria |
| --- | --- |
| Project Owner can create CAPEX request | Request submits and appears in list. |
| Missing required fields are blocked | User sees validation message. |
| Fewer than 3 quotations requires justification | Submission is blocked without justification. |
| Approval chain is visible | Current approver / step is clear. |
| Correct approver can approve | Request moves to next step. |
| Wrong role cannot approve | Decision is hidden or blocked. |
| Return works | Request becomes editable and history records reason. |
| Reject works | Request stops and history records reason. |
| Procurement is gated | Procurement cannot be updated too early. |
| Milestones save | Execution progress appears. |
| Finance closure saves for finance role | Finance data appears and audit updates. |
| AUC / capitalization save for finance or asset role | AUC / capitalization data appears. |
| Documents upload/download | File appears and downloads. |
| Audit history is read-only | User can review but not manually edit audit events. |
