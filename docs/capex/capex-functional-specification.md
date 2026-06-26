# CAPEX Module Functional Specification

Date: 2026-06-12

## 1. Purpose

This functional specification converts the CAPEX module requirements into a build-ready design for developers, UI designers, database designers, testers, and business reviewers.

The document defines the expected workflows, screens, fields, validation rules, approval routing, permissions, data entities, reports, integrations, and UAT scenarios for the CAPEX module.

## 2. Source Documents

- `capex-requirement-specification.md`
- `capex-development-plan.md`
- `Shell_Capex_PR_Process_Map.pptx`
- `Purchase Request Platform (2).xlsx`
- `CP Governance Framework.png`

## 3. Abbreviations and Terms

| Abbreviation / Term | Meaning |
| --- | --- |
| ACV | Authorized Contract Value. The approved contract value used for governance threshold checks. |
| Board | Shell Oman Marketing Board or designated board-level approval body. |
| CAPEX | Capital Expenditure. Spend on long-term assets, projects, or capital investments. |
| CFO | Chief Financial Officer. |
| CH | Contract Holder. Exact role definition to be confirmed. |
| CO | Contract Owner or Commercial Owner. Exact role definition to be confirmed. |
| CP | Contracting and Procurement. |
| CP Focal | Contracting and Procurement focal point assigned to a request or business/function. |
| DPA | Data Processing Agreement. |
| EMT | Executive Management Team. |
| FiB / FIB | Finance in Business. |
| GM | General Manager. |
| GSAP | Shell's SAP-based enterprise system for project, PR, PO, and finance processes. |
| HSSE | Health, Safety, Security, and Environment. |
| NDA | Non-Disclosure Agreement. |
| OMR | Omani Rial. |
| PO | Purchase Order. |
| PR | Purchase Request or Purchase Requisition. Final terminology to be confirmed. |
| ROI | Return on Investment. |
| SAC | SAP Analytics Cloud. |
| Single-source | A procurement case with fewer than the normally expected 3 supplier quotations. |
| UAT | User Acceptance Testing. |

## 4. Functional Scope

### 4.1 Included in First Build

- CAPEX request creation and submission.
- Request classification by value band.
- Low, medium, and high value workflow routing.
- Supplier quotation capture.
- Justification for fewer than 3 quotations.
- HSSE and worker welfare risk capture.
- Approval workflow and comments.
- Attachment handling.
- Audit history.
- PR, PO, and GSAP reference tracking.
- PO upload tracking.
- Project execution tracking.
- Financial closure tracking.
- Dashboard and basic reports.
- Admin configuration for thresholds, roles, departments, and workflow rules.

### 4.2 Deferred or Integration-Dependent

- Real-time SAP SAC budget integration.
- Real-time GSAP PR/PO integration.
- Automated SAP financial posting.
- Advanced contract board digital meeting pack.
- Advanced budget forecasting and scenario planning.

## 5. User Roles

| Role | Primary Functions |
| --- | --- |
| Requester | Create, edit draft, submit, amend returned request, view own requests. |
| Line Manager | Review and endorse request scope and business need. |
| Budget Holder | Review budget usage and request alignment with allocated budget. |
| FiB | Validate budget, financial data, savings, and financial completeness. |
| HSSE Focal | Review HSSE and worker welfare risk when risk is Medium or High. |
| CP Focal | Review procurement readiness and route procurement activities. |
| CP Manager | Review medium spend and procurement governance cases. |
| Head of CP | Approve low-value cases with fewer than 3 quotations and relevant CP exceptions. |
| CP Lead | Provide CP pre-support for low-value requests. |
| IT Manager | Approve applicable low-value IT-related requests or other configured scope. |
| GM | Approve relevant business/function requests. |
| EMT | Approve medium-value requests for the relevant class of business. |
| CFO | Approve medium-value fewer-than-3-quotation cases and participate in annual budget challenge. |
| Contract Board | Approve high-value requests. |
| Project Engineer | Track NDA, DPA, vendor registration, GSAP project, PR, PO, milestones, and execution. |
| Finance | Review actuals, savings, ROI, CAPEX form, and financial closure. |
| System Administrator | Maintain master data, roles, thresholds, workflows, and configuration. |

## 6. Workflow Overview

The module shall follow this high-level workflow:

1. Budget is approved and cascaded.
2. Requester creates CAPEX request.
3. System validates required information.
4. System classifies request value band.
5. System applies quotation, HSSE, worker welfare, and value-band rules.
6. Request enters approval workflow.
7. Approved request moves to procurement tracking.
8. PR, PO, vendor, and GSAP details are captured.
9. PO is uploaded.
10. Project execution is tracked by milestones and staged payments.
11. Finance completes financial closure.
12. Request is closed and included in reports.

## 7. Value Band Rules

| Value Band | ACV / PO Value in OMR | Process Lead |
| --- | ---: | --- |
| Low Value | Less than or equal to 25,000 | Business Requisitioner |
| Medium Value | 25,100 to 300,000 | CP |
| High Value | Greater than 300,000 | CP |

The threshold values shall be configurable by System Administrator.

Open point: the process map mentions a possible OMR 250,000 threshold. Until confirmed, this specification uses OMR 300,000 for high value.

## 8. Approval Workflow Matrix

### 8.1 Common Approval Triggers

| Trigger | Required Routing |
| --- | --- |
| HSSE risk is Medium or High | HSSE Focal approval required. |
| Worker welfare risk is Medium or High | HSSE Focal approval required. |
| Fewer than 3 quotations | Justification required and additional CP/Finance approval triggered. |
| High value request | Contract Board approval required. |
| Request returned for correction | Requester must amend and resubmit. |

### 8.2 Low-Value Route

| Condition | Required Steps |
| --- | --- |
| Low value with 3 or more quotations | Requester submission, Line Manager endorsement, FiB validation, CP Lead pre-support, applicable IT Manager approval, Business GM approval. |
| Low value with fewer than 3 quotations | Requester submission, fewer-than-3 justification, Line Manager endorsement, FiB validation, CP Lead pre-support, Head of CP approval, applicable IT Manager approval, Business GM approval. |
| Low value with Medium/High HSSE or worker welfare risk | Add HSSE Focal approval before final management approval. |

### 8.3 Medium-Value Route

| Condition | Required Steps |
| --- | --- |
| Medium value with 3 or more quotations/tender | Requester submission, Contract Holder/Owner pre-support, FiB validation, CP Manager or Head of CP approval, EMT approval. |
| Medium value with fewer than 3 quotations | Requester submission, fewer-than-3 justification, Contract Holder/Owner pre-support, FiB validation, CP Manager or Head of CP approval, CFO approval, EMT approval. |
| Medium value with Medium/High HSSE or worker welfare risk | Add HSSE Focal approval before final management approval. |

### 8.4 High-Value Route

| Condition | Required Steps |
| --- | --- |
| High value | Requester submission, CP review, contract strategy/award proposal/tender, FiB validation, applicable HSSE approval, Contract Board approval. |

High-value routing shall remain configurable until Contract Board rules are confirmed.

## 9. Status Model

| Status | Description |
| --- | --- |
| Draft | Request is being prepared by requester. |
| Submitted | Request has been submitted and workflow has started. |
| Returned for Correction | Approver returned request to requester for amendment. |
| Pending Line Manager Endorsement | Awaiting line manager action. |
| Pending FiB Validation | Awaiting Finance in Business review. |
| Pending HSSE Approval | Awaiting HSSE focal review. |
| Pending CP Review | Awaiting CP focal, CP Lead, CP Manager, or Head of CP action. |
| Pending Management Approval | Awaiting GM, EMT, CFO, or other management approval. |
| Pending Contract Board Approval | Awaiting high-value Contract Board approval. |
| Approved for Procurement | Business approvals are complete and request can proceed to procurement. |
| Pending Vendor Registration / NDA / DPA | Vendor and compliance activities are in progress. |
| GSAP Project Created | GSAP project reference has been captured. |
| PR Created | PR details have been captured. |
| PO Created | PO details have been captured. |
| PO Uploaded | PO document has been uploaded. |
| In Execution | Project execution is being tracked. |
| Pending Financial Closure | Execution is complete and Finance closure is pending. |
| Closed | Finance has completed closure. |
| Rejected | Request was rejected and cannot proceed. |
| Cancelled | Request was cancelled by authorized user. |

## 10. Screen Specifications

### 10.1 Request List Screen

Purpose: allow users to search, filter, and access CAPEX requests.

Main functions:

- Create new request.
- Search by request number, title, supplier, PR number, PO number.
- Filter by status, department, business/function, value band, requester, approver, risk level, year.
- View request status and pending approver.
- Export filtered list.

Columns:

- Request number.
- Title.
- Requester.
- Department.
- Business/function.
- Value.
- Value band.
- Status.
- Pending with.
- Created date.
- Last updated date.

### 10.2 CAPEX Request Form

The form shall be divided into sections:

- Request header.
- Budget and value.
- Scope and business need.
- Risk and compliance.
- Supplier quotations.
- Payment terms.
- Attachments.
- Approval history.

Actions:

- Save draft.
- Submit.
- Cancel draft.
- Withdraw submitted request when allowed.
- Resubmit returned request.

### 10.3 Approval Screen

Purpose: allow approvers to review and action requests.

Displayed information:

- Request summary.
- Request value and value band.
- Scope details.
- Risk levels.
- Quotations and selected supplier.
- Fewer-than-3-quotation justification.
- Budget information.
- Attachments.
- Approval history.

Actions:

- Approve.
- Reject.
- Return for correction.
- Add comment.
- Delegate where permitted.

### 10.4 CP / Procurement Tracking Screen

Purpose: allow CP and Project Engineer users to track procurement readiness and PR/PO progress.

Fields:

- NDA required.
- NDA status.
- NDA completion date.
- DPA required.
- DPA status.
- DPA completion date.
- Vendor registration status.
- Agreement status.
- GSAP project reference.
- GSAP project creation date.
- PR number.
- PR creation date.
- PR status.
- PO number.
- PO creation date.
- PO value.
- PO status.
- PO uploaded flag.
- PO upload attachment.
- PO released after job done flag.

### 10.5 Project Execution Screen

Purpose: allow Project Engineers to track delivery.

Functions:

- Add project stage.
- Add milestone.
- Set planned dates.
- Enter actual dates.
- Enter staged payment percentage and amount.
- Upload completion evidence.
- Mark milestone complete.
- Add delivery comments.

### 10.6 Finance Closure Screen

Purpose: allow Finance to finalize project financials and close the request.

Fields:

- Approved budget.
- PO committed value.
- Actual spend.
- Variance.
- ROI.
- Savings.
- Finance comments.
- CAPEX form attachment.
- Closure date.

Actions:

- Save closure draft.
- Request correction from Project Engineer.
- Close request.

### 10.7 Admin Configuration Screen

Purpose: allow administrators to maintain configuration.

Configuration areas:

- Financial years.
- Departments.
- Business/functions.
- Budget holders.
- Value thresholds.
- Roles.
- Users.
- Approval matrix.
- HSSE focal assignments.
- CP focal assignments.
- Document types.
- Notification templates.
- Escalation rules.

## 11. Field-Level Specification

### 11.1 Request Header Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Request Number | Auto number | Yes | System | Generated on first save. |
| Request Title | Text | Yes | Requester | Short descriptive title. |
| Requester | User | Yes | System | Defaults to logged-in user. |
| Department Code | Dropdown | Yes | Requester/System | May default from user profile. |
| Business/Function | Dropdown | Yes | Requester/System | Used for workflow routing. |
| Budget Holder | User | Yes | Requester | Used for budget accountability. |
| Urgent Requirement | Boolean | No | Requester | Used for filtering and priority display. |
| Status | Dropdown/system | Yes | System | Controlled by workflow. |
| Created Date | Date/time | Yes | System | Audit field. |
| Last Updated Date | Date/time | Yes | System | Audit field. |

### 11.2 Budget and Value Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Financial Year | Dropdown | Yes | Requester | Links request to budget year. |
| Budget Reference | Lookup | Conditional | Requester/FiB | Required when budget allocation is available. |
| Current Cost/Budget | Decimal | Yes | Requester | OMR value. |
| Estimated Request Value | Decimal | Yes | Requester | Used for value band until PO value exists. |
| ACV / PO Value | Decimal | Conditional | Requester/CP/Finance | Used for final threshold classification. |
| Currency | Dropdown | Yes | Requester | Default OMR. |
| Value Band | System calculated | Yes | System | Low, Medium, High. |
| ROI | Decimal/Text | Conditional | Requester/Finance | Required where applicable. |
| Savings | Decimal | Conditional | Requester/FiB/Finance | Compared with current cost, budget, or average quote. |

### 11.3 Scope Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Scope Details | Long text | Yes | Requester | Business need and scope. |
| Frequency of Requirement | Dropdown | Yes | Requester | Example: one-time, annual, 2 years. |
| Volume / Quantity Per Year | Number/text | Conditional | Requester | Required for recurring requirements. |
| Required Date | Date | No | Requester | Target need date. |
| Scope Attachment | Attachment | Yes | Requester | Required before submission. |

### 11.4 Risk and Compliance Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| HSSE Risk | Dropdown | Yes | Requester | Low, Medium, High. |
| Worker Welfare Risk | Dropdown | Yes | Requester | Low, Medium, High. |
| HSSE Focal | User | Conditional | System/Admin | Required for Medium/High risk. |
| HSSE Approval Status | System | Conditional | System | Pending, Approved, Rejected, Returned. |
| HSSE Evidence | Attachment | Conditional | Requester/HSSE | Required based on risk and policy. |
| Ethics and Compliance Flag | Boolean | Conditional | Requester/Approver | Required where applicable. |

### 11.5 Quotation Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Supplier Name | Text/lookup | Yes | Requester | One row per quotation. |
| Quote Value | Decimal | Yes | Requester | Used for average quote and comparison. |
| Quote Currency | Dropdown | Yes | Requester | Default OMR. |
| Payment Term | Dropdown/text | No | Requester | Example: 75 days, 90 days. |
| Quote Attachment | Attachment | Yes | Requester | Required for each quotation. |
| Selected Supplier | Boolean | Yes | Requester | One supplier must be selected before submission. |
| Average Quote | System calculated | No | System | Average of quote values. |
| Fewer-than-3 Justification | Long text | Conditional | Requester | Required when quote count is less than 3. |

### 11.6 Approval Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Approval Step | System | Yes | System | Generated from workflow. |
| Approver Role | System | Yes | System | Example: FiB, GM, CFO. |
| Assigned Approver | User | Yes | System/Admin | Can be configured or derived. |
| Decision | Dropdown | Conditional | Approver | Approve, Reject, Return. |
| Comment | Long text | Conditional | Approver | Required for reject/return. |
| Decision Date | Date/time | Conditional | System | Captured on action. |
| Evidence Attachment | Attachment | No | Approver | Optional unless configured. |

### 11.7 Procurement Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| NDA Required | Boolean | No | CP/Project Engineer | Defaults to No. |
| NDA Status | Dropdown | Conditional | CP/Project Engineer | Not required, Pending, Completed. |
| DPA Required | Boolean | No | CP/Project Engineer | Defaults to No. |
| DPA Status | Dropdown | Conditional | CP/Project Engineer | Not required, Pending, Completed. |
| Vendor Registration Status | Dropdown | Yes | CP/Project Engineer | Not required, Pending, Completed. |
| Agreement Status | Dropdown | No | CP/Project Engineer | Not required, Pending, Completed. |
| GSAP Project Reference | Text | Conditional | Project Engineer | Required once GSAP project is created. |
| PR Number | Text | Conditional | Project Engineer/CP | Required once PR is created. |
| PO Number | Text | Conditional | Project Engineer/CP | Required once PO is created. |
| PO Value | Decimal | Conditional | Project Engineer/CP | Required when PO exists. |
| PO Attachment | Attachment | Conditional | Project Engineer/CP | Required to mark PO uploaded. |

### 11.8 Execution and Closure Fields

| Field | Type | Required | Editable By | Notes |
| --- | --- | --- | --- | --- |
| Stage Name | Text | Conditional | Project Engineer | Required during execution. |
| Milestone Name | Text | Conditional | Project Engineer | Required during execution. |
| Planned Date | Date | Conditional | Project Engineer | Required for milestone. |
| Actual Date | Date | Conditional | Project Engineer | Required to complete milestone. |
| Payment Percentage | Decimal | Conditional | Project Engineer | Exact rules to be confirmed. |
| Payment Amount | Decimal | Conditional | Project Engineer | Can be calculated from PO value. |
| Completion Evidence | Attachment | Conditional | Project Engineer | Required to complete milestone if configured. |
| Actual Spend | Decimal | Conditional | Finance | Required for closure. |
| Final ROI | Decimal/text | Conditional | Finance | Required where applicable. |
| Final Savings | Decimal | Conditional | Finance | Required where applicable. |
| CAPEX Closure Form | Attachment/generated | Yes | Finance | Required to close. |

## 12. Business Rules

| Rule ID | Rule |
| --- | --- |
| FS-BR-001 | Request cannot be submitted without request title, department, business/function, budget holder, scope details, value, HSSE risk, and worker welfare risk. |
| FS-BR-002 | Scope attachment is mandatory before submission. |
| FS-BR-003 | Value band shall be calculated from ACV / PO value where available; otherwise from estimated request value. |
| FS-BR-004 | A request with fewer than 3 quotations must include fewer-than-3 justification. |
| FS-BR-005 | Each quotation row must include supplier name, quote value, currency, and attachment. |
| FS-BR-006 | One selected supplier is required before submission. |
| FS-BR-007 | Medium or High HSSE risk triggers HSSE Focal approval. |
| FS-BR-008 | Medium or High worker welfare risk triggers HSSE Focal approval. |
| FS-BR-009 | Low-value fewer-than-3-quotation request triggers Head of CP approval. |
| FS-BR-010 | Medium-value fewer-than-3-quotation request triggers CFO approval. |
| FS-BR-011 | High-value request triggers Contract Board approval. |
| FS-BR-012 | Rejection must include approver comment. |
| FS-BR-013 | Return for correction must include approver comment. |
| FS-BR-014 | PO cannot be marked uploaded unless PO number, PO value, and PO attachment are available. |
| FS-BR-015 | Request cannot be closed until final actual spend and CAPEX closure form are available. |
| FS-BR-016 | Closed requests cannot be edited except by authorized administrator through controlled correction process. |

## 13. Permissions Matrix

| Function | Requester | Line Manager | FiB | HSSE | CP | Management | Project Engineer | Finance | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create request | Yes | No | No | No | Yes | No | Yes | No | Yes |
| Edit draft request | Own only | No | No | No | Own only | No | Own only | No | Yes |
| Submit request | Own only | No | No | No | Own only | No | Own only | No | Yes |
| View request | Own/assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | All |
| Approve request | No | Assigned | Assigned | Assigned | Assigned | Assigned | No | Assigned | No |
| Reject request | No | Assigned | Assigned | Assigned | Assigned | Assigned | No | Assigned | No |
| Return request | No | Assigned | Assigned | Assigned | Assigned | Assigned | No | Assigned | No |
| Edit procurement fields | No | No | No | No | Yes | No | Yes | No | Yes |
| Edit execution fields | No | No | No | No | No | No | Yes | No | Yes |
| Edit closure fields | No | No | No | No | No | No | No | Yes | Yes |
| Configure workflow | No | No | No | No | No | No | No | No | Yes |
| Export reports | Limited | Limited | Yes | Limited | Yes | Yes | Limited | Yes | Yes |

## 14. Data Entity Specification

### 14.1 Core Entities

| Entity | Purpose |
| --- | --- |
| CapexRequest | Main request record and lifecycle status. |
| BudgetAllocation | Approved annual budget by year, department, business/function, and budget holder. |
| SupplierQuotation | Supplier quote details linked to a request. |
| ApprovalStep | Workflow step assigned to an approver role/user. |
| ApprovalAction | Historical decision record for approval steps. |
| Attachment | Document metadata linked to request, quotation, approval, PO, milestone, or closure. |
| ProcurementTracking | NDA, DPA, vendor, GSAP, PR, and PO tracking information. |
| ProjectStage | Execution stage linked to request. |
| ProjectMilestone | Milestone and staged payment details. |
| FinancialClosure | Final actuals, ROI, savings, CAPEX form, closure status. |
| AuditLog | Immutable event history. |
| Department | Department and department code master data. |
| BusinessFunction | Business/function master data. |
| UserRoleAssignment | User role and permission mapping. |
| WorkflowRule | Configured workflow routing rule. |

### 14.2 Key Relationships

- One `CapexRequest` can have many `SupplierQuotation` records.
- One `CapexRequest` can have many `ApprovalStep` records.
- One `ApprovalStep` can have many `ApprovalAction` records if returned and resubmitted.
- One `CapexRequest` can have many `Attachment` records.
- One `CapexRequest` can have one `ProcurementTracking` record.
- One `CapexRequest` can have many `ProjectStage` records.
- One `ProjectStage` can have many `ProjectMilestone` records.
- One `CapexRequest` can have one `FinancialClosure` record.
- One `CapexRequest` can have many `AuditLog` records.

## 15. Notifications

| Event | Recipient |
| --- | --- |
| Request submitted | Requester, first approver. |
| Approval step assigned | Assigned approver. |
| Request approved | Requester and next approver, if any. |
| Request rejected | Requester. |
| Request returned for correction | Requester. |
| Request resubmitted | Pending approver. |
| HSSE approval required | HSSE Focal. |
| Fewer-than-3 approval required | Head of CP or CFO based on value band. |
| Request approved for procurement | CP Focal and Project Engineer. |
| PO uploaded | Project Engineer and Finance where applicable. |
| Execution completed | Finance. |
| Request closed | Requester, Budget Holder, FiB, CP. |

## 16. Dashboard and Reports

### 16.1 Dashboard KPIs

- Total CAPEX requests.
- Requests by status.
- Requests by department.
- Requests by business/function.
- Requests by value band.
- Pending approvals.
- Overdue approvals.
- Fewer-than-3-quotation requests.
- PO-after-job exceptions.
- Approved budget vs actual spend.
- Savings.

### 16.2 Report Columns

The request report shall include:

- Request number.
- Request title.
- Requester.
- Department code.
- Business/function.
- Budget holder.
- Financial year.
- Value.
- Value band.
- HSSE risk.
- Worker welfare risk.
- Quotation count.
- Selected supplier.
- Status.
- Current pending approver.
- PR number.
- PO number.
- PO value.
- Created date.
- Approved date.
- Closed date.

### 16.3 Report Filters

- Financial year.
- Department.
- Business/function.
- Requester.
- Budget holder.
- Value band.
- Status.
- Risk level.
- Supplier.
- Approval pending with.
- Date range.
- Single-source/fewer-than-3 flag.
- PO-after-job flag.

## 17. Integration Specification

### 17.1 Identity Provider

The module should integrate with corporate identity for:

- Login.
- User profile.
- Email address.
- Department.
- Role assignment.
- Approver mapping where available.

### 17.2 SAP SAC

MVP behavior:

- Allow manual upload or manual maintenance of approved budget allocations.
- Store SAC budget reference where available.

Future behavior:

- Import approved annual budgets from SAP SAC through API or scheduled file.

### 17.3 GSAP

MVP behavior:

- Manually capture GSAP project reference, PR number, and PO number.
- Upload PO evidence.

Future behavior:

- Read GSAP project, PR, and PO status from GSAP interface if available.

### 17.4 Document Storage

The module shall store or reference:

- Scope documents.
- Supplier quotations.
- Approval evidence.
- NDA and DPA evidence.
- Vendor registration evidence.
- PO documents.
- Milestone evidence.
- CAPEX closure forms.

## 18. UAT Scenarios

| Scenario ID | Scenario | Expected Result |
| --- | --- | --- |
| UAT-001 | Create low-value request with 3 quotations and Low risk. | Request follows standard low-value route and can be approved. |
| UAT-002 | Create low-value request with 1 quotation. | System requires justification and routes to Head of CP. |
| UAT-003 | Create medium-value request with 3 quotations. | Request routes through medium-value CP and management approvals. |
| UAT-004 | Create medium-value request with fewer than 3 quotations. | System requires justification and CFO approval. |
| UAT-005 | Create high-value request. | System routes to CP and Contract Board approval. |
| UAT-006 | Select Medium HSSE risk. | HSSE Focal approval is inserted into workflow. |
| UAT-007 | Select High worker welfare risk. | HSSE Focal approval is inserted into workflow. |
| UAT-008 | Approver returns request for correction. | Requester can edit and resubmit; audit history is retained. |
| UAT-009 | Approver rejects request. | Request becomes Rejected and cannot proceed. |
| UAT-010 | Approved request moves to procurement tracking. | CP/Project Engineer can enter NDA, DPA, vendor, GSAP, PR, and PO details. |
| UAT-011 | Try to upload PO without PO number or PO value. | System blocks upload status completion. |
| UAT-012 | Complete project milestones. | Request can move to pending financial closure. |
| UAT-013 | Finance closes request. | Final actuals, ROI/savings, and CAPEX form are stored; status becomes Closed. |
| UAT-014 | Run dashboard by department. | Dashboard shows request counts by department code. |
| UAT-015 | Export request report. | Excel or CSV export includes filtered request records. |

## 19. Open Items Before Development Sign-Off

The following items must be resolved or accepted as configurable assumptions before development starts:

1. Confirm `CO` and `CH` definitions.
2. Confirm final high-value threshold: OMR 250,000 or OMR 300,000.
3. Confirm whether IT Manager approval applies only to IT-related CAPEX.
4. Confirm Contract Board members and approval procedure.
5. Confirm exact staged-payment rules.
6. Confirm mid-year budget re-approval process.
7. Confirm required Ethics and Compliance checks.
8. Confirm SAP SAC integration method for MVP.
9. Confirm GSAP integration method for MVP.
10. Confirm document storage platform and retention policy.

## 20. Development Readiness Checklist

Development can begin when:

- Business has reviewed this functional specification.
- Approval workflow matrix is accepted or marked configurable.
- Field-level requirements are accepted.
- Role and permission matrix is accepted.
- MVP integration approach is agreed.
- UAT scenarios are accepted as first test baseline.
- Open items are either resolved or assigned owners and target dates.
