# CAPEX Governance Platform Product Requirements Document

Date: 2026-06-29

Source artifacts:

- `docs/CAPEX PROJECT SCOPE.docx`
- `docs/Shell_Capex_PR_Process_Map.pptx`

Related internal documents:

- `som-platform/docs/capex/capex-requirement-specification.md`
- `som-platform/docs/capex/capex-functional-specification.md`
- `som-platform/docs/capex/capex-development-plan.md`

## 1. Product Summary

The CAPEX Governance Platform shall provide Shell Oman Marketing with an end-to-end digital solution to govern, monitor, approve, execute, capitalize, and close CAPEX projects.

The product is not only a purchase request tracker. It is a lifecycle governance platform covering:

1. Strategic planning and annual CAPEX budgeting.
2. CAPEX request and approval.
3. Procurement, quotation routing, CP review, PR creation, and PO creation.
4. Project execution and milestone tracking.
5. Financial governance, budget monitoring, commitments, actual spend, and forecast at completion.
6. Project completion and acceptance.
7. PO closure and commitment release.
8. AUC review and aging governance.
9. Capitalization and fixed asset register update.
10. Asset handover.
11. Benefits realization, ROI validation, and savings verification.
12. Final project closure.
13. Audit, compliance, risk, escalation, and executive reporting.

## 2. Problem Statement

CAPEX project governance is currently fragmented across budgeting, approval, procurement, project execution, finance, capitalization, and closure activities. Stakeholders need a single controlled platform that provides real-time visibility, workflow accountability, document evidence, approval traceability, and executive reporting from initial budget approval through final project closure.

The current process creates the following risks:

- CAPEX budgets, commitments, actuals, forecasts, AUC balances, and capitalization status are difficult to monitor in one place.
- Approval routing can vary by value tier, quotation count, risk level, and authority matrix, making manual tracking error-prone.
- PO closure, AUC clearing, capitalization, and final project closure can be delayed without timely escalation.
- Benefits, ROI, and procurement savings may not be validated after project completion.
- Audit evidence may be distributed across multiple systems and documents.
- Senior management lacks one consolidated view of portfolio risk, spend, governance exceptions, and value realization.

## 3. Product Goals

| Goal ID | Goal | Success Measure |
| --- | --- | --- |
| G-001 | Create a centralized CAPEX project repository. | All approved CAPEX projects have a unique project record with owner, budget, status, approvals, PO, AUC, capitalization, and closure details. |
| G-002 | Automate approval routing. | Requests are routed by project value, approval matrix, quotation count, HSSE/worker welfare risk, and delegation rules. |
| G-003 | Improve budget control. | Stakeholders can compare approved budget, committed spend, actual spend, forecast cost, and variance by project and business unit. |
| G-004 | Improve project delivery visibility. | Users can track milestones, planned dates, actual dates, completion percentage, delay days, and project status. |
| G-005 | Reduce delayed capitalization and AUC aging. | Finance can identify projects pending capitalization, AUC balances, and aging exceptions. |
| G-006 | Improve PO closure discipline. | Completed projects with open POs are visible, aged, assigned, and escalated. |
| G-007 | Enforce project closure controls. | Final closure requires checklist completion, Finance validation, asset handover, and sign-off evidence. |
| G-008 | Provide executive governance dashboards. | CEO, CFO, EMT, Board, Audit Committee, business GMs, Finance, and CP can view relevant KPIs and exceptions. |
| G-009 | Preserve audit readiness. | Every request, approval, revision, comment, attachment, and closure action is recorded in an audit trail. |

## 4. Non-Goals

The initial product shall not:

- Replace SAP SAC as the official budgeting system.
- Replace GSAP as the official ERP, PR, PO, finance posting, or fixed asset system.
- Automatically post financial entries unless a separately approved integration is delivered.
- Digitally replace Contract Board proceedings unless the Contract Board workflow is separately defined.
- Replace enterprise document retention policy.
- Make final delegation-of-authority decisions where business rules remain unconfirmed.

## 5. Users and Personas

| Persona | Primary Need | Key Product Interactions |
| --- | --- | --- |
| CEO / Board | Strategic portfolio visibility and governance assurance. | Executive CAPEX portfolio dashboard, budget utilization, delayed projects, risk, value realization, compliance exceptions. |
| CFO | Financial governance, budget control, AUC, capitalization, commitments, and savings. | Budget dashboard, AUC dashboard, capitalization dashboard, forecast and variance reports, financial approvals. |
| EMT | Management review and medium/high-value approval oversight. | Approval queue, portfolio KPIs, risk and escalation dashboard. |
| Business GM | Business-unit spend and project delivery accountability. | Business unit dashboard, approvals, delayed project view, budget utilization, closure status. |
| Finance in Business (FIB) | Validate budgets, financials, savings, and compliance. | Budget validation, request review, variance checks, closure validation. |
| Corporate Controller / Finance | Maintain approved budget visibility and enforce financial closure. | Budget upload/maintenance, capitalization, AUC aging, closure, reporting. |
| Project Owner / Project Engineer | Execute projects and maintain milestone evidence. | Project record, milestone tracking, staged payments, completion evidence, PO upload, closure checklist. |
| CP / Procurement | Manage quotation routing, vendor selection, PR/PO progression, and procurement controls. | Quotation review, CP approvals, vendor registration, PR/PO tracking, PO closure reporting. |
| HSSE / Worker Welfare Reviewer | Ensure compliance evidence for risk-sensitive work. | Risk review, evidence validation, approval or return for correction. |
| Internal Audit / Risk Committee | Verify compliance, approvals, documents, and exceptions. | Audit trail, document repository, governance dashboard, exception reports. |
| System Administrator | Configure users, roles, thresholds, workflows, notifications, and master data. | Admin console, workflow rules, role assignments, dashboard configuration. |

## 6. Definitions

| Term | Definition |
| --- | --- |
| CAPEX | Capital expenditure project or investment resulting in asset creation, improvement, or long-term value. |
| AUC | Asset Under Construction; cost accumulated before final capitalization to fixed assets. |
| CP | Contracting and Procurement. |
| FIB | Finance in Business. |
| GSAP | Shell enterprise system used for project, PR, PO, and finance references. |
| SAP SAC | SAP Analytics Cloud, source process for annual budget planning. |
| MOA | Approval authority concept used in the source files. The final term must be confirmed because source material uses both "Memorandum of Approval" and "Manual of Authority" style meaning. |
| PR | Purchase Request or Purchase Requisition. Final label to be confirmed. |
| PO | Purchase Order. |
| Staged payment | Payment tied to milestone or project stage; exact percentage rules to be confirmed. |
| Closure | Formal completion of project, PO, AUC, capitalization, asset handover, benefits review, and documentation archive. |

## 7. Product Scope

### 7.1 In Scope

- CAPEX project repository.
- Annual budget and allocation visibility.
- CAPEX request creation and approval routing.
- MOA / authority matrix validation.
- Digital approval audit trail.
- Quotation capture and vendor selection evidence.
- CP, PR, PO, and vendor readiness tracking.
- Project milestone and timeline tracking.
- Budget, commitment, actual, forecast, variance, ROI, and savings tracking.
- AUC aging and exception monitoring.
- Capitalization workflow tracking.
- PO closure workflow tracking.
- Budget change, transfer, and variation control.
- Project completion and final closure checklist.
- Benefits realization review at 6, 12, and 24 months.
- Risk and escalation management.
- Audit, compliance, reporting, dashboards, exports, and scheduled reports.
- Notifications and escalation rules.
- Attachment and document repository.
- Administrative configuration.

### 7.2 Out of Scope for MVP

- Real-time SAP SAC integration.
- Real-time GSAP integration.
- Automated accounting postings.
- Automated fixed asset creation in ERP.
- Native Contract Board meeting management.
- Advanced predictive forecasting or machine-learning risk scoring.
- Mobile-native application.

## 8. End-to-End Lifecycle

The product shall support the following target lifecycle.

### Stage 1: Strategic Planning and Budgeting

1. CAPEX opportunity is identified.
2. Business case and ROI are assessed.
3. Budget is planned in SAP SAC.
4. EMT, CFO, and CEO review budget.
5. Board approves budget.
6. Corporate Controller communicates approved budget.
7. Budget is allocated to business units, functions, budget holders, and project owners.

### Stage 2: CAPEX Request and Approval

1. Requester creates CAPEX request.
2. Business justification and scope are entered.
3. FIB validates budget and financial assumptions.
4. System reads project value.
5. System determines authority matrix.
6. Request is routed automatically.
7. Approvers approve, reject, return, delegate, or escalate.
8. Full approval trail is stored.

### Stage 3: Procurement and Contracting

1. Tender or RFQ process begins.
2. Vendor quotations are captured.
3. Vendor evaluation is completed.
4. Commercial assessment is completed.
5. Vendor selection and savings are recorded.
6. Contract award is approved.
7. NDA, DPA, vendor registration, and agreements are tracked where required.
8. GSAP project, PR, and PO references are captured.

### Stage 4: Project Execution

1. Project kick-off is recorded.
2. Project schedule is defined.
3. Milestones and staged payments are tracked.
4. Actual progress is recorded against planned progress.
5. Delays are flagged and escalated.
6. Completion evidence is uploaded.

### Stage 5: Financial Governance

1. Budget monitoring is maintained.
2. Commitment tracking is maintained from open PO values.
3. Actual spend is tracked.
4. Variation orders and change controls are recorded.
5. Forecast at completion is updated.
6. Variance and overrun exceptions are escalated.

### Stage 6: Project Completion

1. Technical completion is recorded.
2. Physical completion is recorded.
3. Final contractor acceptance is recorded.
4. Completion certificate is uploaded.
5. Project enters closure controls.

### Stage 7: Closure Controls

1. Final invoice is verified.
2. PO closure is tracked.
3. Contract closure is tracked.
4. Retention release is tracked.
5. Commitment release is confirmed.

### Stage 8: AUC Management

1. Completed project enters AUC review.
2. AUC balance and age are reviewed by Finance.
3. Projects pending capitalization are identified.
4. AUC aging thresholds trigger escalation.

### Stage 9: Capitalization

1. Finance verifies capitalization readiness.
2. Asset master creation is tracked.
3. Asset classification is confirmed.
4. Capitalization approval is obtained.
5. Fixed asset register update is confirmed.
6. Depreciation start is recorded where applicable.

### Stage 10: Asset Handover

1. Operational acceptance is recorded.
2. Asset handover is recorded.
3. Supporting documents are archived.

### Stage 11: Benefits Realization

1. 6-month review is scheduled and completed.
2. 12-month review is scheduled and completed where applicable.
3. 24-month review is scheduled and completed where applicable.
4. Actual ROI is compared with planned ROI.
5. Savings and business benefits are validated.
6. Variance is reported to management.

### Stage 12: Project Closure

1. Lessons learned are captured.
2. Final sign-off is obtained.
3. Documentation is archived.
4. Project is marked closed.
5. Project remains available for audit and reporting.

## 9. Value Bands and Approval Routes

The system shall support configurable value thresholds. Initial baseline thresholds are:

| Value Band | Value | Baseline Approval Route |
| --- | ---: | --- |
| Low | Less than OMR 25,000 | Project Lead / Contract Owner, FIB validation, GM approval; HSSE or worker welfare review where required. |
| Medium | OMR 25,000 to OMR 300,000 | Project Lead / Contract Owner, FIB validation, GM, CFO, EMT; CP involvement; HSSE or worker welfare review where required. |
| High | Greater than OMR 300,000 | CP-led tender or contract strategy, FIB validation, Contract Board approval; HSSE or worker welfare review where required. |

Quotation routing rules:

- Standard route expects at least 3 quotations.
- Fewer than 3 quotations shall require justification and additional governance approval.
- For low value fewer-than-3 cases, source deck indicates CP Manager approval.
- For medium value fewer-than-3 cases, source deck indicates CFO approval.
- For high value cases, source deck indicates Contract Board approval.
- Vendor selection shall identify the lowest quote, but the Project Lead may select another vendor with justification.
- System shall calculate savings against budget, current cost, awarded value, or average quote as configured.

## 10. Product Modules

### 10.1 CAPEX Project Repository

The repository shall store all CAPEX projects with:

- Project ID.
- Project name.
- Business unit or function.
- Project owner.
- Budget holder.
- Approved budget.
- Revised budget.
- Commitments.
- Actual spend.
- Forecast cost.
- Budget utilization percentage.
- Project status.
- Start date.
- Target completion date.
- Actual completion date.
- Expected capitalization date.
- Asset category.
- MOA / approval details.
- Vendor information.
- PR and PO details.
- AUC status.
- Capitalization status.
- Closure status.
- Supporting documents.

### 10.2 Budget Monitoring

The product shall provide:

- Approved CAPEX budget vs actual expenditure.
- Budget utilization percentage.
- Budget variance analysis.
- Forecasted completion cost.
- Business unit CAPEX spend.
- Project-wise CAPEX spend.
- Monthly and annual spend trends.
- Exception reporting for projects exceeding thresholds.
- Open commitment tracking from POs.
- Revised budget after variations.

### 10.3 Project Timeline and Completion Tracking

The product shall provide:

- Lifecycle stage tracking.
- Milestone tracking.
- Planned vs actual progress.
- Percentage completion.
- Delay days.
- Delayed project alerts.
- Gantt-style or timeline visualization.
- Completion certificate capture.

### 10.4 AUC Monitoring

The product shall provide:

- Total AUC balance by business unit.
- AUC by project.
- AUC movement analysis.
- AUC aging.
- Projects pending capitalization.
- High-value AUC monitoring.
- Outstanding AUC exceptions.
- Escalation at configured aging thresholds.

Baseline AUC escalation thresholds from the deck:

| AUC Age | Escalation |
| --- | --- |
| Greater than 90 days | Business Owner |
| Greater than 180 days | EMT Review |
| Greater than 270 days | CFO |

### 10.5 Capitalization Monitoring

The product shall provide:

- Projects ready for capitalization.
- Pending capitalizations.
- Capitalized value.
- Capitalized value vs approved budget.
- Capitalization aging.
- Average days to capitalize.
- Capitalization compliance percentage.
- Business-wise capitalization summary.
- Asset master creation status.
- Fixed asset register update status.
- Depreciation start confirmation.

### 10.6 PO Closure Monitoring

The product shall provide:

- Open CAPEX POs.
- Open commitment value.
- Pending PO closures.
- PO value vs actual invoiced value.
- Unutilized PO commitment.
- Completed projects with open POs.
- PO aging buckets.
- PO closure SLA compliance.
- Commitment released confirmation.

PO aging buckets:

- 0 to 30 days.
- 31 to 60 days.
- 61 to 90 days.
- More than 90 days.

### 10.7 Post-Project Closure Checklist

The product shall require a closure checklist before final sign-off.

Checklist items shall include at minimum:

- Project physically completed.
- Final vendor invoice received.
- Goods receipt completed.
- All POs closed.
- Contract closed.
- Retention released where applicable.
- AUC transferred to fixed assets.
- Asset master created.
- Asset capitalization completed.
- Asset handover completed.
- HSE documentation closed.
- Supporting documents uploaded.
- Finance validation completed.
- Project owner sign-off completed.
- Internal audit compliance verification completed where required.
- Lessons learned captured.
- Project closure approved.

The closure dashboard shall display:

- Closure readiness percentage.
- Outstanding action items.
- Responsible owner.
- Due dates.
- Escalation alerts.
- Closure aging.
- Closure SLA compliance.

### 10.8 MOA / Approval Management

The product shall provide:

- MOA creation or registration.
- Digital attachment storage.
- Approval workflow tracking.
- Approval status monitoring.
- Approval authority matrix validation.
- Expiry and renewal notifications where applicable.
- Searchable MOA database linked to CAPEX projects.
- Auto-routing by project value.
- Approval escalation.
- Delegation management.
- Full approval audit trail.

Workflow:

1. Project request submitted.
2. System reads project value.
3. System determines approval matrix.
4. System routes automatically.
5. Approval is obtained.
6. Audit trail is stored.

### 10.9 Notifications and Escalations

The product shall notify or escalate for:

- Budget exceeded.
- Budget variance greater than configured tolerance.
- Project delayed.
- Project delay greater than configured days.
- PO pending closure.
- PO open more than configured days after completion.
- Capitalization overdue.
- AUC aging.
- Missing approvals.
- Expiring contracts or approvals.
- MOA escalation.
- Open audit actions.
- Closure checklist overdue.

Baseline notification thresholds from the deck:

| Trigger | Recipient |
| --- | --- |
| Budget variance greater than 10 percent | Project Owner |
| Project delay greater than 30 days | GM |
| AUC greater than 180 days | Corporate Controller |
| Capitalization pending greater than 60 days | Finance Manager / Corporate Controller |
| PO open greater than 90 days after completion | Escalation workflow |

### 10.10 Audit and Compliance

The product shall provide:

- Full approval history.
- Document version control.
- Approver comments.
- Electronic signatures or digital approval evidence.
- Audit trail logs.
- Supporting document repository.
- Policy compliance reporting.
- Approval SLA compliance.
- Policy deviation tracking.
- Audit findings and action tracking.
- Unauthorized approval or matrix violation reporting.

## 11. Dashboard Requirements

### 11.1 Executive CAPEX Portfolio Dashboard

Audience:

- CEO.
- CFO.
- EMT.
- Board.

KPIs:

- Approved CAPEX budget.
- Actual CAPEX spend.
- Committed spend / open PO value.
- Forecast year-end spend.
- Budget utilization percentage.
- Savings achieved.
- Portfolio ROI.
- Total projects.
- Ongoing projects.
- Delayed projects.
- Completed projects.
- Pending capitalization.
- Open AUC.
- Open POs.
- Projects pending closure.
- MOA compliance.
- Audit findings.
- Red / amber / green project status.

### 11.2 Business Unit CAPEX Dashboard

Audience:

- GM Retail.
- GM Lubricants.
- GM Aviation.
- GM Fleet.
- Corporate Functions.
- Other business/function heads.

Views:

- Budget allocated.
- Actual spend.
- Commitments.
- Savings.
- Open projects.
- Completed projects.
- Delayed projects.
- Project completion percentage.
- Average project duration.
- Spend by project.

### 11.3 Project Performance Dashboard

Audience:

- Project Engineers.
- Project Sponsors.
- Business Managers.

Metrics:

- Project status.
- Planned completion date.
- Actual completion date.
- Delay days.
- Milestone completion percentage.
- Not started / in progress / delayed / completed / closed counts.

### 11.4 Budget and Cost Control Dashboard

Audience:

- CFO.
- FIB.
- Controllers.
- GMs.

Metrics:

- Original budget.
- Revised budget.
- Commitments.
- Actual spend.
- Forecast completion cost.
- Budget overrun percentage.
- Cost variance.
- Spend forecast accuracy.
- Cost overrun projects.

### 11.5 AUC Governance Dashboard

Audience:

- CFO.
- Finance.
- Asset Team.
- Corporate Controller.

Metrics:

- Total AUC.
- AUC less than 90 days.
- AUC 90 to 180 days.
- AUC greater than 180 days.
- AUC by business.
- AUC by project.
- AUC aging.
- Capitalization-ready projects.
- Top 10 aging projects.

### 11.6 Capitalization Dashboard

Audience:

- CFO.
- Finance Team.
- Asset Team.

Metrics:

- Projects ready for capitalization.
- Pending capitalizations.
- Capitalized value.
- Capitalization aging.
- Average days to capitalize.
- Capitalization compliance percentage.
- Capitalized by business.

### 11.7 PO Closure Dashboard

Audience:

- Finance.
- CP Team.
- Internal Audit.

Metrics:

- Open CAPEX POs.
- Open commitment value.
- PO aging.
- Projects with open POs.
- Pending closures.
- Closed POs.
- Overdue closures.
- Average closure days.

### 11.8 Procurement Performance Dashboard

Audience:

- CP Manager.
- CFO.

Metrics:

- RFQ cycle time.
- Tender cycle time.
- Vendor response rate.
- Procurement savings.
- PO processing time.
- Budget estimate.
- Awarded value.
- Savings.

### 11.9 MOA Compliance Dashboard

Audience:

- CEO.
- CFO.
- Internal Audit.

Metrics:

- Projects approved.
- Projects pending approval.
- MOA violations.
- Approval SLA compliance.
- Compliant projects.
- Non-compliant projects.
- Pending approvals.

### 11.10 Benefits Realization Dashboard

Audience:

- EMT.
- CFO.
- Business GMs.

Metrics:

- Planned ROI.
- Actual ROI.
- Savings achieved.
- Business benefits delivered.
- ROI achievement percentage.
- Savings realized.
- Project benefit scorecard.
- 6-month review status.
- 12-month review status.
- 24-month review status.

### 11.11 Project Closure Dashboard

Audience:

- Finance.
- PMO.
- Audit.

Metrics:

- Projects pending closure.
- Closure aging.
- Closure SLA compliance.
- Checklist completion percentage.
- Open checklist items.
- Closure readiness percentage.

### 11.12 Risk and Escalation Dashboard

Audience:

- CEO.
- CFO.
- EMT.
- Risk Committee.

Metrics:

- Budget risk.
- Schedule risk.
- Vendor risk.
- HSE / HSSE risk.
- Operational risk.
- Capitalization risk.
- Red projects.
- Amber projects.
- Green projects.

### 11.13 Governance and Compliance Dashboard

Audience:

- Internal Audit.
- CFO.
- Risk Committee.

Metrics:

- Policy compliance percentage.
- Audit findings.
- Open audit actions.
- Documentation compliance.
- MOA compliance percentage.
- Approval SLA.
- Policy deviations.
- Unauthorized approvals.
- Exception requests.

## 12. Functional Requirements

### 12.1 Repository and Master Data

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-001 | The system shall create a unique CAPEX project record for every approved CAPEX request. | Must |
| PRD-FR-002 | The system shall store business unit, function, project owner, budget holder, finance owner, CP owner, and project engineer. | Must |
| PRD-FR-003 | The system shall support configurable business units and functions. | Must |
| PRD-FR-004 | The system shall support configurable asset categories and CAPEX types. | Must |
| PRD-FR-005 | The system shall support configurable value thresholds and approval routes. | Must |

### 12.2 Budget and Financial Tracking

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-006 | The system shall capture approved budget, revised budget, commitments, actual spend, forecast cost, and variance. | Must |
| PRD-FR-007 | The system shall calculate budget utilization percentage. | Must |
| PRD-FR-008 | The system shall track budget variations and transfers. | Must |
| PRD-FR-009 | The system shall require project engineer justification and FIB review for budget variation or transfer requests. | Must |
| PRD-FR-010 | The system shall update project forecast after approved budget revision. | Must |
| PRD-FR-011 | The system shall support budget views by year, business unit, function, owner, and project. | Must |

### 12.3 CAPEX Request and Approval

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-012 | The system shall allow authorized users to create CAPEX requests. | Must |
| PRD-FR-013 | The system shall capture scope, justification, estimated cost, ROI, target dates, owner, business unit, function, and attachments. | Must |
| PRD-FR-014 | The system shall read project value and determine approval route automatically. | Must |
| PRD-FR-015 | The system shall validate approval authority matrix before routing. | Must |
| PRD-FR-016 | The system shall support approve, reject, return, delegate, escalate, and resubmit actions. | Must |
| PRD-FR-017 | The system shall store approval comments, timestamps, approvers, and revised submissions. | Must |
| PRD-FR-018 | The system shall prevent final approval when mandatory route steps are incomplete. | Must |

### 12.4 Quotations and Procurement

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-019 | The system shall capture supplier quotations and quote attachments. | Must |
| PRD-FR-020 | The system shall identify when fewer than 3 quotations are provided. | Must |
| PRD-FR-021 | The system shall require justification for fewer than 3 quotations. | Must |
| PRD-FR-022 | The system shall highlight the lowest quotation. | Should |
| PRD-FR-023 | The system shall allow selection of a non-lowest vendor with justification. | Must |
| PRD-FR-024 | The system shall calculate procurement savings where budget, estimate, average quote, and awarded value are available. | Should |
| PRD-FR-025 | The system shall track NDA, DPA, vendor registration, and agreement completion. | Must |
| PRD-FR-026 | The system shall capture GSAP project reference, PR number, PO number, PO value, and PO upload. | Must |

### 12.5 Project Execution

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-027 | The system shall allow project milestones to be defined and tracked. | Must |
| PRD-FR-028 | The system shall capture planned and actual milestone dates. | Must |
| PRD-FR-029 | The system shall calculate delay days. | Must |
| PRD-FR-030 | The system shall capture staged payment percentage and amount. | Should |
| PRD-FR-031 | The system shall capture progress percentage. | Must |
| PRD-FR-032 | The system shall alert responsible users when a milestone is delayed. | Must |
| PRD-FR-033 | The system shall support milestone evidence attachments. | Must |

### 12.6 AUC and Capitalization

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-034 | The system shall track whether completed project costs remain in AUC. | Must |
| PRD-FR-035 | The system shall calculate AUC aging. | Must |
| PRD-FR-036 | The system shall alert on AUC aging thresholds. | Must |
| PRD-FR-037 | The system shall track capitalization readiness. | Must |
| PRD-FR-038 | The system shall track asset creation, classification, capitalization approval, fixed asset register update, and depreciation start. | Must |
| PRD-FR-039 | The system shall calculate average days to capitalize. | Should |

### 12.7 PO Closure

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-040 | The system shall track open CAPEX POs. | Must |
| PRD-FR-041 | The system shall calculate PO aging after project completion. | Must |
| PRD-FR-042 | The system shall alert when PO remains open beyond configured threshold. | Must |
| PRD-FR-043 | The system shall capture final invoice receipt, PO review, vendor confirmation, PO closure, and commitment release. | Must |
| PRD-FR-044 | The system shall report completed projects with open POs. | Must |

### 12.8 Closure and Benefits Realization

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-045 | The system shall require closure checklist completion before project closure. | Must |
| PRD-FR-046 | The system shall require Finance validation before closure. | Must |
| PRD-FR-047 | The system shall require asset handover confirmation where applicable. | Must |
| PRD-FR-048 | The system shall record final sign-off and closure certificate. | Must |
| PRD-FR-049 | The system shall schedule benefits realization reviews at 6, 12, and 24 months where applicable. | Should |
| PRD-FR-050 | The system shall compare planned ROI and actual ROI. | Should |
| PRD-FR-051 | The system shall compare planned savings and actual savings. | Should |

### 12.9 Reporting and Dashboards

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-FR-052 | The system shall provide executive, business-unit, project, budget, AUC, capitalization, PO closure, procurement, MOA, benefits, closure, risk, and compliance dashboards. | Must |
| PRD-FR-053 | Dashboards shall support filtering by business unit, project, year, status, owner, value band, and risk status. | Must |
| PRD-FR-054 | Dashboards shall support drill-down from portfolio to project level. | Must |
| PRD-FR-055 | Reports shall export to Excel or PDF. | Should |
| PRD-FR-056 | The system shall support scheduled reporting. | Should |

## 13. Data Requirements

### 13.1 Core Entities

| Entity | Purpose |
| --- | --- |
| CapexProject | Master project record across the full lifecycle. |
| CapexRequest | Request and approval record before and during project creation. |
| BudgetAllocation | Annual and revised budget by year, business unit, function, owner, and category. |
| ApprovalRoute | Generated or configured approval workflow for a request/project. |
| ApprovalAction | Historical approval, rejection, return, delegation, or escalation event. |
| Quotation | Vendor quotation and quotation evidence. |
| VendorSelection | Selected vendor, lowest-quote comparison, savings, and justification. |
| ProcurementTracker | NDA, DPA, vendor registration, agreement, CP, PR, PO, and GSAP tracking. |
| Milestone | Planned and actual project milestone record. |
| PaymentStage | Staged payment percentage, amount, status, and evidence. |
| FinancialSnapshot | Approved budget, revised budget, actuals, commitments, forecast, variance, ROI, and savings over time. |
| AucRecord | AUC balance, age, status, and escalation. |
| CapitalizationRecord | Asset creation and capitalization status. |
| PoClosureRecord | PO closure, invoice, vendor confirmation, and commitment release. |
| ClosureChecklist | Required closure checklist items and sign-offs. |
| BenefitsReview | Planned vs actual ROI, savings, business benefits, and review cycle. |
| RiskRecord | Budget, schedule, vendor, HSSE, operational, capitalization, and compliance risks. |
| DocumentAttachment | Scope, quotation, approval, PO, completion, closure, and audit evidence. |
| AuditLog | Immutable event history. |

### 13.2 Required Project Fields

- Project ID.
- Project name.
- Project description.
- Business unit.
- Function.
- Project owner.
- Budget holder.
- FIB owner.
- CP owner.
- Project engineer.
- Asset category.
- CAPEX type.
- Approval value.
- Value band.
- Approved budget.
- Revised budget.
- Actual spend.
- Commitments.
- Forecast cost.
- ROI planned.
- ROI actual.
- Savings planned.
- Savings actual.
- Project status.
- Start date.
- Target completion date.
- Actual completion date.
- Expected capitalization date.
- Actual capitalization date.
- AUC balance.
- AUC age.
- PO number.
- PO value.
- PO status.
- MOA / approval reference.
- Closure readiness percentage.
- Risk rating.

## 14. Status Model

The product shall support the following statuses at minimum:

- Draft.
- Submitted.
- Returned for correction.
- Pending FIB validation.
- Pending CP review.
- Pending HSSE / worker welfare review.
- Pending GM approval.
- Pending CFO approval.
- Pending EMT approval.
- Pending Contract Board approval.
- Approved.
- Procurement in progress.
- GSAP project created.
- PR created.
- PO created.
- PO uploaded.
- In execution.
- Delayed.
- Technically complete.
- Physically complete.
- Pending PO closure.
- Pending AUC review.
- Pending capitalization.
- Pending asset handover.
- Pending benefits review.
- Pending final closure.
- Closed.
- Rejected.
- Cancelled.

## 15. Permissions

| Capability | Requester | Project Engineer | FIB | CP | HSSE | GM / EMT / CFO / Board | Finance | Audit | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create request | Yes | Yes | Limited | Limited | No | No | No | No | Yes |
| Edit draft request | Own | Assigned | No | No | No | No | No | No | Yes |
| Submit request | Own | Assigned | No | No | No | No | No | No | Yes |
| Approve / reject | No | No | Assigned | Assigned | Assigned | Assigned | Assigned | No | No |
| Return for correction | No | No | Assigned | Assigned | Assigned | Assigned | Assigned | No | No |
| Maintain procurement fields | No | Assigned | View | Yes | View | View | View | View | Yes |
| Maintain milestones | No | Assigned | View | View | View | View | View | View | Yes |
| Maintain financial fields | No | View | Yes | View | View | View | Yes | View | Yes |
| Maintain AUC / capitalization | No | View | Yes | View | View | View | Yes | View | Yes |
| Complete closure checklist | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | View | Yes |
| View audit trail | Own / assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | Yes | Yes |
| Configure workflows | No | No | No | No | No | No | No | No | Yes |
| Export reports | Limited | Limited | Yes | Yes | Limited | Yes | Yes | Yes | Yes |

## 16. Non-Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| PRD-NFR-001 | The system shall enforce role-based access control. | Must |
| PRD-NFR-002 | The system shall preserve immutable audit history for approvals, status changes, field changes, comments, and attachments. | Must |
| PRD-NFR-003 | The system shall support configurable thresholds, workflow routes, escalation rules, roles, and dashboard filters. | Must |
| PRD-NFR-004 | The system shall preserve historical approvals even if users or role assignments change later. | Must |
| PRD-NFR-005 | The system shall support document versioning or attachment replacement history. | Must |
| PRD-NFR-006 | The system shall protect confidential commercial and financial information according to Shell Oman Marketing data classification. | Must |
| PRD-NFR-007 | The system shall support desktop browser use for management, Finance, CP, and project users. | Must |
| PRD-NFR-008 | Dashboard pages should load within acceptable enterprise application response times under normal operating volume. | Should |
| PRD-NFR-009 | Exports should preserve filters, date ranges, and selected columns. | Should |
| PRD-NFR-010 | The system shall allow administrators to deactivate users without losing historical approval attribution. | Must |

## 17. Integrations

| System | MVP Requirement | Future Requirement |
| --- | --- | --- |
| SAP SAC | Manual upload or manual entry of approved annual budgets and ROI references. | Scheduled or API-based import of approved budgets. |
| GSAP | Manual entry of project reference, PR number, PO number, PO value, and PO status. | API or scheduled synchronization for project, PR, PO, commitment, actual spend, and asset references. |
| Identity Provider | User authentication and role assignment. | Automated approver hierarchy and delegation synchronization. |
| Email / Notification Service | Workflow notifications and reminders. | Escalation rules, digest emails, and scheduled report distribution. |
| Document Repository | Store or link attachments. | Retention policy, metadata search, versioning, and legal hold support. |

## 18. MVP Scope

The MVP shall deliver:

- CAPEX request creation.
- CAPEX project repository.
- Basic budget and value capture.
- Value band calculation.
- Approval workflow by value band.
- Quotation capture and fewer-than-3-quotation justification.
- HSSE / worker welfare risk capture and approval trigger.
- Attachments.
- Approval audit trail.
- GSAP project, PR, PO, and PO upload tracking.
- Milestone tracking.
- Budget, actual, commitment, forecast, ROI, and savings fields.
- AUC and capitalization status tracking.
- PO closure tracking.
- Closure checklist.
- Core executive, budget, project, AUC, capitalization, PO closure, and compliance dashboards.
- Notifications for pending approval, delays, AUC aging, capitalization overdue, and PO closure overdue.
- Export to Excel or CSV.

## 19. Later Releases

Later releases should add:

- SAP SAC integration.
- GSAP integration.
- Automated actual spend and commitment synchronization.
- Generated CAPEX forms.
- Advanced Gantt visualization.
- Scheduled PDF reports.
- Contract Board digital workflow.
- Benefits realization scorecards.
- Advanced risk scoring.
- Mobile-responsive approval experience.

## 20. Acceptance Criteria

The product shall be accepted when the following are demonstrably true:

1. A user can create a CAPEX request with business unit, function, owner, budget, value, justification, scope, risk, quotations, and attachments.
2. The system classifies the request into low, medium, or high value based on configured thresholds.
3. The system routes approvals automatically according to value band, quotation count, risk level, and authority matrix.
4. Approvers can approve, reject, return, delegate, and comment.
5. The approval audit trail is complete and visible to authorized users.
6. The system blocks progression when mandatory approvals, evidence, or fields are missing.
7. CP users can track vendor selection, NDA, DPA, vendor registration, agreements, GSAP project, PR, PO, and PO upload.
8. Project Engineers can track milestones, planned dates, actual dates, delay days, progress, and staged payments.
9. Finance can track approved budget, revised budget, commitments, actual spend, forecast cost, variance, ROI, savings, AUC, and capitalization status.
10. Completed projects with open POs are visible on the PO closure dashboard.
11. AUC aging exceptions are visible and escalated according to configured thresholds.
12. Capitalization readiness and pending capitalization are visible by project and business unit.
13. Final project closure cannot be completed until the closure checklist and Finance validation are complete.
14. Benefits realization reviews can be scheduled and recorded.
15. Executive dashboards show portfolio budget, actual spend, commitments, forecast spend, delayed projects, open AUC, pending capitalization, open POs, closure backlog, savings, ROI, compliance, and risk.
16. Reports can be filtered and exported.
17. The product preserves all audit history and document evidence.

## 21. Open Questions

| ID | Question | Impact |
| --- | --- | --- |
| OQ-001 | Should MOA be named "Memorandum of Approval", "Manual of Authority", or another Shell Oman term in the product UI? | Affects terminology, workflows, dashboard names, and user training. |
| OQ-002 | Are the final value thresholds less than OMR 25,000, OMR 25,000 to OMR 300,000, and greater than OMR 300,000? | Affects approval routing and reports. |
| OQ-003 | Does OMR 25,000 belong exclusively to low value or medium value? | Prevents boundary ambiguity in workflow rules. |
| OQ-004 | Is IT Manager approval required for all low-value requests or only IT-related CAPEX? | Affects low-value approval route. |
| OQ-005 | What is the final Contract Board workflow for high-value CAPEX? | Affects high-value approval design. |
| OQ-006 | What are the exact staged-payment rules, including the meaning of the noted 30 percent milestone reference? | Affects payment tracking and controls. |
| OQ-007 | Does "minimum 3" refer only to quotations, or also to HSSE / worker welfare compliance checks? | Affects validation requirements. |
| OQ-008 | What is the mid-year CAPEX re-approval process outside the October Board cycle? | Affects budget variation and reallocation workflow. |
| OQ-009 | Which system is the source of truth for actual spend, commitments, AUC, and capitalization status during MVP? | Affects integration and manual-entry design. |
| OQ-010 | What document retention policy applies to quotations, approvals, PO evidence, completion certificates, and closure documents? | Affects document repository design. |

## 22. Implementation Notes

- Approval routes, thresholds, escalation days, role assignments, and dashboard categories shall be configurable wherever practical.
- MVP shall permit manual reference entry for SAP SAC and GSAP data to avoid integration dependency.
- All financial metrics shall clearly identify whether they are manually entered, uploaded, calculated, or integrated.
- The product shall distinguish project status, PO status, AUC status, capitalization status, benefits status, and closure status; these are related but not interchangeable.
- Dashboards shall always allow drill-down from KPI to underlying project list.
- Audit views shall show who changed what, when, from what value, to what value, and why where comments are required.

