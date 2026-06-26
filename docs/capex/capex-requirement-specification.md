# CAPEX Module Requirement Specification

Date: 2026-06-12

## Source Documents

- `Shell_Capex_PR_Process_Map.pptx`
- `Purchase Request Platform (2).xlsx`
- `CP Governance Framework.png`

## Abbreviations and Terms

| Abbreviation / Term | Meaning |
| --- | --- |
| ACV | Authorized Contract Value. The total approved contract value used for governance threshold checks. |
| Board | Shell Oman Marketing Board or designated board-level approval body for annual CAPEX budget approval. |
| CAPEX | Capital Expenditure. Spend on long-term assets, projects, or capital investments. |
| CFO | Chief Financial Officer. |
| CH | Contract Holder. Exact role definition to be confirmed with Shell Oman Marketing. |
| CO | Contract Owner or Commercial Owner. Exact role definition to be confirmed with Shell Oman Marketing. |
| CP | Contracting and Procurement. |
| CP Focal | Contracting and Procurement focal point assigned to a business/function or request. |
| DPA | Data Processing Agreement. Required where vendor work involves personal data or data processing obligations. |
| EMT | Executive Management Team. |
| FiB / FIB | Finance in Business. Finance representative supporting budget and financial validation. |
| GM | General Manager. |
| GSAP | Shell's SAP-based enterprise system used for project, purchase request, purchase order, and finance processes. |
| HSSE | Health, Safety, Security, and Environment. |
| IT | Information Technology. |
| NDA | Non-Disclosure Agreement. |
| OMR | Omani Rial, the currency used for value thresholds in this specification. |
| PO | Purchase Order. |
| PR | Purchase Request or Purchase Requisition, depending on the final Shell Oman Marketing terminology. |
| ROI | Return on Investment. |
| SAC | SAP Analytics Cloud. Used in the source process for annual budget preparation. |
| SAP | Systems, Applications, and Products enterprise software platform. |
| Single-source | A procurement case with fewer than the normally expected 3 supplier quotations. |
| Worker Welfare | Compliance area covering worker welfare risk and related approval/evidence requirements. |

## 1. Purpose

The CAPEX module shall digitize the Shell Oman Marketing capital expenditure and purchase request process from annual budget allocation through request initiation, approval, procurement, project execution, financial tracking, and closure.

The module shall provide one controlled workflow for business users, Finance in Business, Contracting and Procurement, HSSE, management approvers, project engineers, and finance teams to manage CAPEX requests with governance, evidence, auditability, and reporting.

## 2. Scope

### 2.1 In Scope

- Annual CAPEX budget capture and allocation by business/function.
- CAPEX request creation for low, medium, and high value spend.
- Information checklist for low/medium spend requests.
- Quotation capture and vendor selection evidence.
- HSSE and worker welfare risk capture and approvals.
- Approval routing based on value band, quotation count, and risk level.
- PR, PO, and CP execution tracking.
- Project milestone, staged payment, and financial tracking.
- Dashboards and reports for requests, single-source cases, PO timing, and value-wise projects.
- Audit trail for submissions, approvals, rejections, comments, attachments, and status changes.

### 2.2 Out of Scope for Initial Specification

- Direct replacement of SAP SAC, GSAP, or enterprise finance systems.
- Automated financial posting to SAP/GSAP unless integration is separately approved.
- Final delegation-of-authority configuration beyond the rules documented here.
- Contract board workflow details for high-value spend beyond the governance trigger.

## 3. Users and Roles

| Role | Responsibilities |
| --- | --- |
| Requester / Business Requisitioner | Creates CAPEX or purchase request, enters scope, budget, frequency, supplier quotes, justification, and attachments. |
| Line Manager | Endorses scope and request need. |
| Budget Holder | Owns allocated budget and request accountability. |
| Finance in Business (FiB) | Validates budget, current cost, savings, financial completeness, and low-value requests. |
| HSSE Focal | Reviews and approves medium/high HSSE risk and worker welfare risk. |
| Business / Function CP Focal | Routes requests with sufficient quotations and supports CP process. |
| CP Manager / Head of CP / CP Lead | Reviews procurement governance, especially fewer-than-3-quotation cases and medium/high value routes. |
| IT Manager | Approves applicable low-value route items as captured in the process map. |
| GM / Business GM | Approves relevant business/function requests according to governance. |
| EMT | Approves medium-value requests for the relevant class of business. |
| CFO | Approves medium spend with fewer than 3 quotations and annual budget challenge. |
| Board | Approves annual CAPEX budget, normally in October. |
| Project Engineer | Completes NDA, DPA, vendor registration, agreements, GSAP project creation support, PR/PO tracking, execution milestones, and handover. |
| Finance | Consolidates actuals, ROI, savings, capex form, closure, and reporting. |
| System Administrator | Maintains master data, workflow rules, thresholds, roles, and integrations. |

## 4. End-to-End Process

### 4.1 Annual CAPEX Budgeting

1. Annual budget is prepared in SAP SAC with ROI information.
2. CFO conducts an internal challenge session with the Executive Management Team.
3. Board reviews and approves the CAPEX budget, normally in October.
4. Corporate Controller locks the final approved figures.
5. Corporate Controller cascades approved budgets to budget holders, GMs, Project Engineers, and FiB.
6. Business/functions confirm start-of-year timelines and estimated budgets.

### 4.2 CAPEX Request and Allocation

1. Requester creates a CAPEX request against an approved budget allocation.
2. System classifies the request into a value band:
   - Low value: ACV / PO value less than or equal to OMR 25,000.
   - Medium value: ACV / PO value from OMR 25,100 to OMR 300,000.
   - High value: ACV / PO value greater than OMR 300,000.
3. Requester completes required information and attaches evidence.
4. System determines approval route based on value band, quotation count, and HSSE/worker welfare risk.

### 4.3 Procurement, PR, and PO

1. Requester attaches supplier quotations, normally minimum 3 and up to 10.
2. If fewer than 3 quotations are attached, requester must provide justification.
3. System routes fewer-than-3-quotation cases to the required CP and business/finance approvers.
4. Business/function CP focal or CP Manager reviews based on route.
5. Project Engineer completes NDA, DPA, vendor registration, and agreements where required.
6. GSAP project creation, PR creation, and PO creation are tracked in the module.
7. CP executes the procurement process.
8. PO is uploaded and handed over to the Project Engineer for execution tracking.

### 4.4 Project Execution and Financial Tracking

1. Project Engineer manages execution against stages, milestones, timelines, and staged payments.
2. System tracks full-project financials:
   - Approved budget.
   - Actual spend.
   - ROI.
   - Savings.
   - Payment stages.
3. Finance consolidates final financial information into the CAPEX form.
4. Project is financially closed and available for reporting.

## 5. Functional Requirements

### 5.1 Budget Management

| ID | Requirement |
| --- | --- |
| CAPEX-FR-001 | The system shall allow authorized Finance or Controller users to maintain annual approved CAPEX budgets by year, business/function, department, budget holder, and project/category. |
| CAPEX-FR-002 | The system shall capture ROI information against annual budget items or project budgets. |
| CAPEX-FR-003 | The system shall record Board approval status and approval date for the annual budget. |
| CAPEX-FR-004 | The system shall support budget cascade visibility for budget holders, GMs, Project Engineers, and FiB. |
| CAPEX-FR-005 | The system shall validate each CAPEX request against available budget where budget data is maintained in the module. |

### 5.2 Request Creation

| ID | Requirement |
| --- | --- |
| CAPEX-FR-006 | The system shall allow a requester to create a CAPEX purchase request with a unique request number. |
| CAPEX-FR-007 | The system shall capture requester, department, business/function, budget holder, project title, scope details, required date, estimated budget, current cost/budget, frequency of requirement, and expected volume/quantity per year. |
| CAPEX-FR-008 | The system shall support an urgent requirement flag. |
| CAPEX-FR-009 | The system shall require a scope document or equivalent attachment before submission. |
| CAPEX-FR-010 | The system shall classify requests automatically by value band using ACV / PO value in OMR. |
| CAPEX-FR-011 | The system shall allow request draft, submit, withdraw, amend, resubmit, approve, reject, cancel, and close actions according to role permissions. |

### 5.3 Risk and Compliance

| ID | Requirement |
| --- | --- |
| CAPEX-FR-012 | The system shall capture HSSE risk level as Low, Medium, or High. |
| CAPEX-FR-013 | The system shall capture worker welfare risk level as Low, Medium, or High. |
| CAPEX-FR-014 | The system shall require HSSE focal approval when HSSE or worker welfare risk is Medium or High. |
| CAPEX-FR-015 | The system shall require evidence of HSSE and worker welfare compliance where applicable. |
| CAPEX-FR-016 | The system shall prevent final approval when mandatory HSSE approvals or evidence are missing. |

### 5.4 Supplier Quotations and Vendor Selection

| ID | Requirement |
| --- | --- |
| CAPEX-FR-017 | The system shall allow attachment and entry of supplier quotations, with supplier name, quote value, currency, payment terms, and quote document. |
| CAPEX-FR-018 | The system shall support a minimum expected quotation count of 3 and a maximum of 10 quotations for low/medium spend requests. |
| CAPEX-FR-019 | The system shall require justification when fewer than 3 quotations are attached. |
| CAPEX-FR-020 | The system shall calculate or capture average quote value where quote values are available. |
| CAPEX-FR-021 | The system shall capture selected supplier name and selected quote value. |
| CAPEX-FR-022 | The system shall capture savings compared to current cost, budget, or average quote. |
| CAPEX-FR-023 | The system shall capture whether 75/90 day payment terms have been agreed and the agreed term. |
| CAPEX-FR-024 | The system shall route fewer-than-3-quotation cases according to governance rules. |

### 5.5 Approval Workflow

| ID | Requirement |
| --- | --- |
| CAPEX-FR-025 | The system shall generate approval workflow steps dynamically based on value band, quotation count, risk level, and request category. |
| CAPEX-FR-026 | The system shall capture approver name, decision, timestamp, comments, and evidence for each approval step. |
| CAPEX-FR-027 | The system shall support approval delegation and substitution with audit trail. |
| CAPEX-FR-028 | The system shall prevent a user from approving a step for which they are not authorized. |
| CAPEX-FR-029 | The system shall notify pending approvers and requesters on submission, approval, rejection, return for correction, and closure. |
| CAPEX-FR-030 | The system shall maintain approval history for every request. |

### 5.6 Governance Rules

| ID | Requirement |
| --- | --- |
| CAPEX-FR-031 | For low-value spend up to OMR 25,000, the process shall be led by the Business Requisitioner. |
| CAPEX-FR-032 | Low-value spend shall require 3 quotations or justification for fewer than 3 quotations. |
| CAPEX-FR-033 | Low-value spend shall require pre-support of FiB and CP Lead. |
| CAPEX-FR-034 | Low-value spend shall not require contract strategy. |
| CAPEX-FR-035 | Low-value fewer-than-3-quotation cases shall require Head of CP approval. |
| CAPEX-FR-036 | Low-value cases shall require Business GM approval for the relevant class of business, subject to HSSE approval for Medium/High risk and Ethics and Compliance requirements. |
| CAPEX-FR-037 | For medium-value spend from OMR 25,100 to OMR 300,000, the process shall be led by CP. |
| CAPEX-FR-038 | Medium-value spend shall require tender/3 quotations or justification for fewer than 3 quotations. |
| CAPEX-FR-039 | Medium-value spend shall require pre-support of Contract Holder, Owner, and FiB. |
| CAPEX-FR-040 | Medium-value spend shall not require contract strategy/award unless later confirmed otherwise. |
| CAPEX-FR-041 | Medium-value spend shall require EMT approval for the relevant class of business and Head of CP / CP Manager approval. |
| CAPEX-FR-042 | Medium-value fewer-than-3-quotation cases shall require CFO approval. |
| CAPEX-FR-043 | Medium-value cases shall be subject to HSSE approval for Medium/High risk and Ethics and Compliance requirements. |
| CAPEX-FR-044 | For high-value spend greater than OMR 300,000, the process shall be led by CP. |
| CAPEX-FR-045 | High-value spend shall require contract strategy, award proposal, and/or tender process. |
| CAPEX-FR-046 | High-value spend shall require Contract Board approval. |

### 5.7 CP, PR, PO, and Vendor Activities

| ID | Requirement |
| --- | --- |
| CAPEX-FR-047 | The system shall track whether NDA is required and completed. |
| CAPEX-FR-048 | The system shall track whether DPA is required and completed. |
| CAPEX-FR-049 | The system shall track vendor registration status. |
| CAPEX-FR-050 | The system shall track agreement status. |
| CAPEX-FR-051 | The system shall capture GSAP project creation reference and date. |
| CAPEX-FR-052 | The system shall capture PR number, PR creation date, PR status, and supporting attachment. |
| CAPEX-FR-053 | The system shall capture PO number, PO creation date, PO upload, PO value, PO status, and supporting attachment. |
| CAPEX-FR-054 | The system shall track whether a PO was released after job completion for reporting and exception review. |

### 5.8 Project Execution

| ID | Requirement |
| --- | --- |
| CAPEX-FR-055 | The system shall allow Project Engineers to define project stages and milestones. |
| CAPEX-FR-056 | The system shall capture planned and actual milestone dates. |
| CAPEX-FR-057 | The system shall capture staged payment percentages and amounts. |
| CAPEX-FR-058 | The system shall support milestone completion evidence attachments. |
| CAPEX-FR-059 | The system shall track budget, actuals, ROI, and savings during execution. |
| CAPEX-FR-060 | The system shall support financial closure by Finance with final CAPEX form attachment or generated output. |

### 5.9 Dashboard and Reporting

| ID | Requirement |
| --- | --- |
| CAPEX-FR-061 | The system shall provide a dashboard showing number of requests by department code. |
| CAPEX-FR-062 | The system shall report number of single-source or fewer-than-3-quotation requests. |
| CAPEX-FR-063 | The system shall report POs released after job completion. |
| CAPEX-FR-064 | The system shall report value-wise projects by value band. |
| CAPEX-FR-065 | The system shall allow filtering by year, department, business/function, requester, value band, status, supplier, approver, and risk level. |
| CAPEX-FR-066 | The system shall export request lists and reports to Excel or CSV. |

## 6. Request Status Model

The module shall support at least the following statuses:

- Draft
- Submitted
- Returned for Correction
- Pending Line Manager Endorsement
- Pending FiB Validation
- Pending HSSE Approval
- Pending CP Review
- Pending Management Approval
- Approved for Procurement
- Pending Vendor Registration / NDA / DPA
- GSAP Project Created
- PR Created
- PO Created
- PO Uploaded
- In Execution
- Pending Financial Closure
- Closed
- Rejected
- Cancelled

## 7. Key Data Fields

| Category | Fields |
| --- | --- |
| Request Header | Request number, title, requester, department code, business/function, budget holder, creation date, urgency, status, value band. |
| Budget | Budget year, approved budget, current cost/budget, allocated budget, remaining budget, ROI, savings. |
| Scope | Scope details, frequency, volume/quantity per year, scope attachment. |
| Risk | HSSE risk, worker welfare risk, HSSE focal, compliance evidence. |
| Quotations | Supplier names, quote values, quote attachments, average quote, selected supplier, justification for fewer than 3 quotes. |
| Payment Terms | 75/90 day term agreed flag, agreed payment term. |
| Approvals | Line manager, CO, CH, FiB, EMT, CFO, CP Manager, CP Lead, Head of CP, GM, Contract Board, approval evidence. |
| Procurement | NDA, DPA, vendor registration, agreement status, GSAP project reference, PR number, PO number, PO upload. |
| Execution | Stages, milestones, timelines, staged payment percent, actual spend, completion evidence. |
| Closure | Finance review, CAPEX form, final actuals, final savings, final ROI, closure date. |

## 8. Business Rules

| ID | Rule |
| --- | --- |
| CAPEX-BR-001 | A request cannot be submitted without scope details and scope evidence. |
| CAPEX-BR-002 | A request cannot proceed without value amount and currency. |
| CAPEX-BR-003 | Value band shall be determined using ACV / PO value in OMR. |
| CAPEX-BR-004 | Fewer than 3 supplier quotations shall require justification and additional governance approval. |
| CAPEX-BR-005 | Medium or High HSSE risk shall require HSSE focal approval before final approval. |
| CAPEX-BR-006 | Medium or High worker welfare risk shall require HSSE focal approval before final approval. |
| CAPEX-BR-007 | Low-value requests with fewer than 3 quotations shall require Head of CP approval. |
| CAPEX-BR-008 | Medium-value requests with fewer than 3 quotations shall require CFO approval. |
| CAPEX-BR-009 | High-value requests shall require Contract Board approval before procurement execution. |
| CAPEX-BR-010 | A PO cannot be marked uploaded unless PO number, value, and attachment are provided. |
| CAPEX-BR-011 | A project cannot be closed until Finance records final actuals and closure confirmation. |

## 9. Integrations

| System | Required Capability |
| --- | --- |
| SAP SAC | Reference or import approved annual CAPEX budgets and ROI information. |
| GSAP | Track or integrate GSAP project creation, PR creation, PO creation, and PO references. |
| Corporate Identity Provider | Authenticate users and resolve roles, departments, and approver hierarchy. |
| Email / Notification Service | Send workflow notifications, reminders, and escalations. |
| Document Storage | Store scope documents, quotations, approvals, PO uploads, milestone evidence, and CAPEX closure forms. |

## 10. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| CAPEX-NFR-001 | The module shall enforce role-based access control for request creation, viewing, approval, administration, and reporting. |
| CAPEX-NFR-002 | The module shall maintain a tamper-evident audit trail for all workflow and data changes. |
| CAPEX-NFR-003 | The module shall preserve historical approval decisions even when approver roles change later. |
| CAPEX-NFR-004 | The module shall support attachment versioning or replacement history. |
| CAPEX-NFR-005 | The module shall protect internal Shell Oman Marketing data according to internal classification requirements. |
| CAPEX-NFR-006 | The module shall support configurable thresholds, approver roles, and governance rules without code changes where practical. |
| CAPEX-NFR-007 | The module shall be usable on standard desktop browsers used by Shell Oman Marketing employees. |
| CAPEX-NFR-008 | Dashboards and request lists shall load within acceptable enterprise application response times for normal operating volumes. |

## 11. Administration Requirements

The module shall allow administrators to maintain:

- Financial year.
- Business/function and department codes.
- Budget holders.
- Value thresholds.
- Approval roles and users.
- HSSE focal users.
- CP focal users.
- Request categories.
- Supplier master references where applicable.
- Workflow escalation periods.
- Document type configuration.

## 12. Notifications and Escalations

The module shall notify:

- Requester when a request is submitted, returned, approved, rejected, or closed.
- Approver when a request is pending their action.
- Requester and CP focal when fewer-than-3-quotation justification is required.
- HSSE focal when Medium/High HSSE or worker welfare risk is selected.
- Project Engineer when PO is uploaded and execution tracking should begin.
- Finance when execution is complete and financial closure is pending.

The module should support reminders and escalation for overdue approval steps.

## 13. Open Questions and Assumptions

The following points require confirmation before final build or detailed workflow configuration:

1. The process map mentions an "OMR 250K" notation as possibly related to high-value threshold, while the governance framework defines high value as greater than OMR 300K. This specification uses OMR 300K until confirmed.
2. The complete approval route for values above OMR 25,000 should be validated against the final delegation-of-authority matrix.
3. The milestone annotation "25,000 -> 30% / OMR" appears to relate to staged payments. The exact payment-stage rules need confirmation.
4. The right edge of the PO-upload board in the process map is cut off. Any missing GSAP, vendor, or delivery references need confirmation.
5. It should be confirmed whether "minimum 3" in the HSSE/worker welfare area means minimum 3 quotations or minimum compliance checks.
6. The annual Board approval in October is assumed to be the standard cycle. Mid-year CAPEX re-approval rules need confirmation.
7. It should be confirmed whether IT Manager approval applies to all low-value CAPEX requests or only IT-related low-value requests.
8. The exact definition of CO and CH approval in the workbook should be confirmed for system role naming.
9. The Contract Board membership and approval process for high-value CAPEX should be documented.
10. Integration depth with SAP SAC and GSAP should be confirmed: reference-only, import/export, or real-time API integration.

## 14. Acceptance Criteria Summary

The CAPEX module shall be considered ready for user acceptance testing when:

- A requester can create and submit a low/medium/high value CAPEX request.
- The system calculates the correct value band.
- Mandatory fields, attachments, HSSE approvals, quotation rules, and fewer-than-3-quotation justifications are enforced.
- Approval workflow routes correctly for low, medium, and high value scenarios.
- PR, PO, GSAP reference, and PO upload details can be tracked.
- Project milestones, staged payments, budget, actuals, ROI, and savings can be tracked.
- Finance can close a request with final financial details and CAPEX form evidence.
- Dashboards show department-wise request count, single-source/fewer-than-3-quote count, PO-after-job exceptions, and value-wise projects.
- Full audit history is visible for each request.
