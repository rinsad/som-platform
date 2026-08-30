# Purchase Request End User Testing Manual

This manual is for client users who want to test the Purchase Request (PR) module themselves. It explains which user to log in as, what each role should test, and the expected PR workflow from creation to final approval.

## 1. Login Users

Use the demo users below if the environment has been seeded with demo users.

Default password:

`Test@1234`

| User | Email | Role | What to test |
| --- | --- | --- | --- |
| CAPEX Admin | capex.admin@shell.om | Admin | Full access, admin override, troubleshooting. |
| Line Manager | manager@shell.om | Manager | First approval step for PRs. |
| Project Owner | project-owner@shell.om | Project Owner | Create PRs, Contract Owner / Contract Holder steps on MEDIUM PRs. |
| Project Engineer | project-engineer@shell.om | Project Engineer | Create PRs and supporting documents. |
| Finance in Business | finance-business@shell.om | Finance in Business | FIB approval / financial validation. |
| Finance Manager | finance-manager@shell.om | Finance Manager | Finance visibility and review. |
| CFO | cfo@shell.om | CFO | CFO approval for MEDIUM PRs with fewer than 3 quotations. |
| CP Lead | cp-lead@shell.om | CP Lead | LOW PR CP pre-support and supplier selection. |
| CP Manager | cp-manager@shell.om | CP Manager | Head of CP approval, HIGH CP review, supplier selection. |
| Business GM | business-gm@shell.om | Business GM | LOW PR final business authorization. |
| HSSE Focal | hsse-focal@shell.om | HSSE Focal | HSSE / worker welfare review when risk is Medium or High. |
| Internal Audit | internal-audit@shell.om | Internal Audit | Read-only review of PR details, documents, and audit trail. |
| CEO Board | ceo-board@shell.om | CEO/Board | EMT / Contract Board approval steps. |

## 2. Testing Rules

- Use one browser profile or incognito window per role, or log out fully before switching users.
- Start with `project-owner@shell.om` or `project-engineer@shell.om` to create a PR.
- Use `capex.admin@shell.om` only when you need to move the workflow forward quickly or verify Admin override.
- Record each test with: user, role, PR ID, action, expected result, actual result.
- Take screenshots of any unexpected result.

## 3. PR Workflow Overview

The PR module covers:

1. PR creation.
2. Line item entry.
3. Total value calculation.
4. LOW / MEDIUM / HIGH approval tier calculation.
5. HSSE and worker welfare risk classification.
6. Supplier quotation entry.
7. Quote file upload.
8. Fewer-than-3 quote justification.
9. Supplier quotation selection.
10. Sequential DoA approval workflow.
11. Return to draft and resubmission.
12. Rejection.
13. Final approval.
14. Document repository.
15. Decision history and audit trail.

## 4. Role Ownership

| Workflow area | Primary role | Supporting roles |
| --- | --- | --- |
| PR creation | Requester / Project Owner / Project Engineer | Line Manager, CP, Finance |
| Request details | Requester | Line Manager |
| Line items | Requester | Finance / CP review |
| HSSE and worker welfare risk | Requester | HSSE Focal |
| Supplier quotations | Requester | CP Lead / CP Manager |
| Supplier selection | CP Lead / CP Manager | Admin override |
| Fewer-than-3 quote justification | Requester | CP / Finance |
| Approval actions | Current assigned approver | Admin override |
| Return correction | Requester | Admin |
| Documents | Requester / CP / reviewers | Authorized users |
| Audit review | Internal Audit / Management | Admin |

## 5. Value Bands

The PR module calculates the approval tier from total line-item value.

| Band | Default threshold | Meaning |
| --- | --- | --- |
| LOW | Up to OMR 25,000 | Business GM authorization route. |
| MEDIUM | OMR 25,001 to OMR 300,000 | EMT plus Head of CP authorization route. |
| HIGH | Above OMR 300,000 | Contract Board authorization route. |

Expected result:

- Users should not manually select the tier.
- Tier changes when line item total crosses the configured value thresholds.

## 6. Approval Workflows

The workflow is based on:

- PR value band
- quotation count
- HSSE risk
- worker welfare risk

### LOW PR

Standard workflow:

1. Manager - Line Manager Endorsement
2. Finance in Business - FIB Pre-support
3. CP Lead - CP Lead Pre-support
4. Business GM - Business GM Authorization

Conditional workflow:

- If HSSE risk or worker welfare risk is Medium/High, HSSE Focal is added after Manager.
- If fewer than 3 quotations are provided, CP Manager is added before Business GM.

### MEDIUM PR

Standard workflow:

1. Manager - Line Manager Endorsement
2. Project Owner - Contract Owner Pre-support
3. Project Owner - Contract Holder Pre-support
4. Finance in Business - FIB Pre-support
5. CEO/Board - EMT authorization
6. CP Manager - Head of CP / CP Manager Authorization

Conditional workflow:

- If HSSE risk or worker welfare risk is Medium/High, HSSE Focal is added after Manager.
- If fewer than 3 quotations are provided, CFO is added before EMT.

### HIGH PR

Standard workflow:

1. Manager - Line Manager Endorsement
2. CP Manager - CP Review / Contract Strategy / Award Proposal
3. Finance in Business - FIB Validation
4. CEO/Board - Contract Board Authorization

Conditional workflow:

- If HSSE risk or worker welfare risk is Medium/High, HSSE Focal is added after Manager.

## 7. Test Case 1: Create A LOW PR With 3 Quotations

Login as:

`project-owner@shell.om`

Steps:

1. Open `Purchase Requests`.
2. Click `New Purchase Request`.
3. Enter PR title.
4. Select department.
5. Enter description.
6. Set HSSE risk to `Low`.
7. Set Worker Welfare risk to `Low`.
8. Add line items totaling less than or equal to OMR 25,000.
9. Add 3 supplier quotation rows.
10. Enter supplier names and positive quote amounts.
11. Upload quote files if available.
12. Select one quotation.
13. Enter current budget if available.
14. Submit.

Expected result:

- PR is created.
- Approval tier is LOW.
- Quote count shows 3 of 3.
- No fewer-than-3 justification is required.
- Workflow should include Manager, Finance in Business, CP Lead, and Business GM.

## 8. Test Case 2: Create A LOW PR With Fewer Than 3 Quotations

Login as:

`project-owner@shell.om`

Steps:

1. Create a new PR.
2. Keep total value less than or equal to OMR 25,000.
3. Add only 1 or 2 supplier quotations.
4. Try to submit without justification.
5. Add justification.
6. Submit again.

Expected result:

- Submission without justification is blocked.
- Submission with justification succeeds.
- Workflow includes CP Manager approval for fewer than 3 quotations.

## 9. Test Case 3: Create A MEDIUM PR

Login as:

`project-owner@shell.om`

Steps:

1. Create a new PR.
2. Add line items totaling between OMR 25,001 and OMR 300,000.
3. Add 3 quotations.
4. Select one quotation.
5. Submit.

Expected result:

- PR is created.
- Approval tier is MEDIUM.
- Workflow includes:
  - Manager
  - Project Owner / Contract Owner
  - Project Owner / Contract Holder
  - Finance in Business
  - CEO/Board / EMT
  - CP Manager / Head of CP

## 10. Test Case 4: Create A MEDIUM PR With Fewer Than 3 Quotations

Login as:

`project-owner@shell.om`

Steps:

1. Create a MEDIUM value PR.
2. Add only 1 or 2 quotations.
3. Enter justification.
4. Submit.

Expected result:

- PR submits successfully after justification.
- Workflow includes CFO approval before the EMT / CEO Board step.

## 11. Test Case 5: Create A HIGH PR

Login as:

`project-owner@shell.om`

Steps:

1. Create a new PR.
2. Add line items totaling above OMR 300,000.
3. Add supplier quotations.
4. Select one quotation.
5. Submit.

Expected result:

- PR is created.
- Approval tier is HIGH.
- Workflow includes:
  - Manager
  - CP Manager
  - Finance in Business
  - CEO/Board / Contract Board

## 12. Test Case 6: HSSE / Worker Welfare Conditional Review

Login as:

`project-owner@shell.om`

Steps:

1. Create a LOW, MEDIUM, or HIGH PR.
2. Set HSSE risk to `Medium` or `High`, or set Worker Welfare risk to `Medium` or `High`.
3. Submit the PR.
4. Open the PR approval progress.

Expected result:

- HSSE Focal step appears after Manager.
- `hsse-focal@shell.om` should be able to approve the HSSE step when it is current.

## 13. Test Case 7: Supplier Selection By CP

Login first as:

`project-owner@shell.om`

Steps:

1. Create a PR with supplier quotation rows.
2. Submit the PR.
3. Log out.

Login as:

`cp-lead@shell.om` or `cp-manager@shell.om`

Steps:

1. Open the PR.
2. Go to request details.
3. Find Supplier Quotations.
4. Select one supplier quotation.

Expected result:

- CP Lead / CP Manager can select the supplier quotation while approval is pending.
- Decision history records `SUPPLIER_SELECTED`.
- Final approval can proceed once supplier is selected.

## 14. Test Case 8: Final Approval Requires Supplier Selection

Login as:

Approvers in the workflow, or `capex.admin@shell.om` for controlled testing.

Steps:

1. Create a PR with quotation rows but no selected supplier.
2. Walk through approvals until the final approval step.
3. Try to approve the final step.

Expected result:

- Final approval is blocked until a supplier quotation is selected.
- After selecting a supplier, final approval succeeds.

## 15. Test Case 9: Approve Sequential Workflow

Use the user matching the current approval step.

Common approver users:

| Workflow step | Test user |
| --- | --- |
| Manager | manager@shell.om |
| HSSE Focal | hsse-focal@shell.om |
| Finance in Business | finance-business@shell.om |
| CP Lead | cp-lead@shell.om |
| CP Manager / Head of CP | cp-manager@shell.om |
| Project Owner / Contract Owner | project-owner@shell.om |
| Project Owner / Contract Holder | project-owner@shell.om |
| Business GM | business-gm@shell.om |
| CFO | cfo@shell.om |
| CEO/Board / EMT / Contract Board | ceo-board@shell.om |
| Admin override | capex.admin@shell.om |

Steps:

1. Log in as the current approver.
2. Open the PR.
3. Go to `Approval Progress`.
4. Click `Approve`.
5. Add optional comment.
6. Confirm.
7. Log in as the next approver and repeat.

Expected result:

- PR advances one step at a time.
- Current step changes after each approval.
- Decision history records each approval.
- PR becomes `APPROVED` only after the final step.

Important note:

- The requester cannot approve their own PR unless Admin override is used. If `project-owner@shell.om` created the PR, use Admin override or a different appropriately configured Project Owner user for Project Owner approval steps.

## 16. Test Case 10: Return PR For Correction

Login as:

Current approver, or `capex.admin@shell.om`.

Steps:

1. Open a PR in `PENDING_APPROVAL`.
2. Go to `Approval Progress`.
3. Click `Return`.
4. Enter a return comment.
5. Confirm.

Expected result:

- PR status becomes `DRAFT`.
- Return comment is recorded in decision history.
- Approval progress resets.

Then login as requester:

`project-owner@shell.om`

Steps:

1. Open the returned PR.
2. Edit draft details.
3. Update line items, risks, quotations, or justification as needed.
4. Save.
5. Click `Resubmit`.

Expected result:

- PR status becomes `PENDING_APPROVAL`.
- Decision history records `RESUBMITTED`.
- Workflow is rebuilt using latest PR value, risk, and quotation count.

## 17. Test Case 11: Reject PR

Login as:

Current approver, or `capex.admin@shell.om`.

Steps:

1. Open a PR in `PENDING_APPROVAL`.
2. Go to `Approval Progress`.
3. Click `Reject`.
4. Enter rejection comment.
5. Confirm.

Expected result:

- PR status becomes `REJECTED`.
- PR cannot continue through approval.
- Rejection reason appears in decision history and audit trail.

## 18. Test Case 12: Edit Draft PR

Login as:

Requester who created the PR, or `capex.admin@shell.om`.

Prerequisite:

PR must be in `DRAFT` status.

Steps:

1. Open draft PR.
2. Click edit draft action.
3. Change:
   - Title
   - Description
   - Department
   - Line items
   - HSSE risk
   - Worker welfare risk
   - Supplier quotations
   - Selected quote
   - Current budget
   - Justification
4. Save.

Expected result:

- Draft updates successfully.
- Total value and tier recalculate if line items changed.
- Workflow changes after resubmission if risk, quote count, or value band changed.

## 19. Test Case 13: Document Repository

Login as:

Requester or authorized document user.

Steps:

1. Open a PR.
2. Go to `Documents`.
3. Select document type:
   - Scope
   - Technical
   - Document
4. Upload a file.
5. Download the uploaded file.

Expected result:

- File uploads successfully.
- File appears in document repository.
- Download works.
- Approved or rejected PRs may restrict further upload depending on UI rules.

## 20. Test Case 14: Decision History And Audit Trail

Login as:

`internal-audit@shell.om` or `capex.admin@shell.om`.

Steps:

1. Open any PR.
2. Go to `Approval Progress`.
3. Review `Decision History`.
4. Go to `Audit Trail`.
5. Confirm events are visible:
   - CREATED
   - SUPPLIER_SELECTED
   - APPROVED
   - RETURNED
   - RESUBMITTED
   - REJECTED
   - WORKFLOW_RESET, if present on older migrated PRs

Expected result:

- Timeline shows approval progress.
- Decision history shows all events, including return and resubmit.
- Audit trail is read-only.

## 21. Test Case 15: Wrong Role Approval Block

Login as:

Any user whose role does not match the current step.

Example:

- Current step is Manager.
- Login as `finance-business@shell.om`.

Steps:

1. Open the PR.
2. Go to `Approval Progress`.
3. Check whether decision buttons are visible.
4. If visible, try approval.

Expected result:

- Wrong role should not be able to approve.
- UI should hide the decision panel or backend should block the action with a clear message.

## 22. End-To-End Happy Path: LOW PR

1. `project-owner@shell.om`: Create LOW PR with 3 quotations and selected supplier.
2. `manager@shell.om`: Approve Manager step.
3. `finance-business@shell.om`: Approve FIB step.
4. `cp-lead@shell.om`: Approve CP Lead step.
5. `business-gm@shell.om`: Approve Business GM step.
6. `internal-audit@shell.om`: Review decision history and documents.

Expected final result:

- PR status becomes `APPROVED`.
- All approval steps show complete.
- Decision history contains each approval.

## 23. End-To-End Happy Path: MEDIUM PR With HSSE And Fewer Than 3 Quotes

1. `project-owner@shell.om`: Create MEDIUM PR.
2. Set Worker Welfare Risk to `High`.
3. Enter 2 quotations.
4. Enter fewer-than-3 quotation justification.
5. Select supplier quotation.
6. Submit.
7. `manager@shell.om`: Approve Manager step.
8. `hsse-focal@shell.om`: Approve HSSE Focal step.
9. Project Owner / Contract Owner step: approve using a valid non-requester Project Owner user or Admin override.
10. Project Owner / Contract Holder step: approve using a valid non-requester Project Owner user or Admin override.
11. `finance-business@shell.om`: Approve FIB step.
12. `cfo@shell.om`: Approve CFO fewer-than-3 step.
13. `ceo-board@shell.om`: Approve EMT step.
14. `cp-manager@shell.om`: Approve Head of CP step.

Expected final result:

- PR status becomes `APPROVED`.
- Workflow includes HSSE Focal and CFO conditional steps.
- Decision history contains all approvals.

## 24. End-To-End Happy Path: HIGH PR

1. `project-owner@shell.om`: Create HIGH PR with supplier quotations and selected supplier.
2. `manager@shell.om`: Approve Manager step.
3. `cp-manager@shell.om`: Approve CP review step.
4. `finance-business@shell.om`: Approve FIB validation.
5. `ceo-board@shell.om`: Approve Contract Board step.
6. `internal-audit@shell.om`: Review audit trail.

Expected final result:

- PR status becomes `APPROVED`.
- HIGH workflow follows Contract Board route.

## 25. Quick Pass / Fail Checklist

| Check | Pass criteria |
| --- | --- |
| Requester can create PR | PR submits and appears in list. |
| Required fields validate | Missing required values are blocked. |
| Total value calculates | Line items sum correctly. |
| Tier calculates | LOW / MEDIUM / HIGH changes by value. |
| Risk step injects | HSSE Focal appears for Medium/High risk. |
| Quote count works | 3 of 3 display is correct. |
| Fewer-than-3 justification works | Submission blocked without justification. |
| Supplier selection works | CP Lead / CP Manager can select supplier. |
| Final approval guard works | Final approval blocked without selected supplier. |
| Correct approver can approve | PR advances one step. |
| Wrong role cannot approve | Decision blocked or hidden. |
| Requester self-approval blocked | Requester cannot decide own PR. |
| Return works | PR returns to Draft with comment. |
| Resubmit works | PR returns to Pending Approval with history. |
| Reject works | PR becomes Rejected and stops. |
| Documents upload/download | Files upload and download correctly. |
| Decision history is visible | CREATED, APPROVED, RETURNED, RESUBMITTED, etc. appear. |

