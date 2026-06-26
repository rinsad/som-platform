# CAPEX Module Development Plan

Date: 2026-06-12

## 1. Objective

This development plan defines the recommended implementation approach for the CAPEX module. The goal is to deliver the module in controlled phases, starting with the core CAPEX request and approval workflow, then expanding into procurement tracking, execution tracking, financial closure, dashboards, and integrations.

## 2. Recommended Approach

The CAPEX module should be built as a workflow-driven business application with configurable approval rules. The first release should focus on replacing manual request tracking and approval routing. Deeper integrations with SAP SAC and GSAP can be added after the workflow is stable, unless Shell Oman Marketing requires integration from day one.

Recommended build sequence:

1. Data model and permissions.
2. CAPEX request form.
3. Validation rules.
4. Approval workflow.
5. Attachments and audit trail.
6. PR/PO tracking.
7. Project execution tracking.
8. Financial closure.
9. Dashboards and reports.
10. Integrations.

## 3. Phase 1: Foundation

### 3.1 Confirm Business Rules

Before development starts, confirm the open business items from the requirement specification:

- Exact meaning of `CO` and `CH`.
- Whether IT Manager approval applies to all low-value CAPEX requests or only IT-related requests.
- Final high-value threshold: OMR 250,000 or OMR 300,000.
- Contract Board approval process and membership.
- Medium and high value delegation-of-authority details.
- Exact staged-payment rules.
- SAP SAC and GSAP integration expectations.

### 3.2 Define Data Model

Create the initial data model for:

- CAPEX request.
- Budget allocation.
- Supplier quotation.
- Approval workflow.
- Approval action/history.
- Attachment.
- HSSE and worker welfare review.
- CP/procurement tracking.
- PR and PO tracking.
- Project milestone.
- Financial closure.
- Audit log.
- User, role, department, and approval delegation.

### 3.3 Define Roles and Permissions

Configure permissions for:

- Requester.
- Line Manager.
- Budget Holder.
- Finance in Business.
- HSSE Focal.
- Business/Function CP Focal.
- CP Manager.
- Head of CP.
- CP Lead.
- GM.
- EMT.
- CFO.
- Project Engineer.
- Finance.
- System Administrator.

## 4. Phase 2: Core CAPEX Request Workflow

### 4.1 Request Creation

Build the CAPEX request creation screen with:

- Request title.
- Requester details.
- Department code.
- Business/function.
- Budget holder.
- Scope details.
- Scope attachment.
- Frequency of requirement.
- Volume or quantity per year.
- Current cost or budget.
- Estimated value.
- Urgent requirement flag.
- HSSE risk.
- Worker welfare risk.
- Supplier quotation section.
- Selected supplier.
- Payment terms.
- Supporting attachments.

### 4.2 Value Band Calculation

The system should automatically calculate the request value band:

| Value Band | Threshold |
| --- | --- |
| Low Value | Less than or equal to OMR 25,000 |
| Medium Value | OMR 25,100 to OMR 300,000 |
| High Value | Greater than OMR 300,000 |

The threshold values should be configurable by administrators.

### 4.3 Validation Rules

Implement validations for:

- Mandatory scope details.
- Mandatory scope attachment.
- Mandatory request value.
- Mandatory HSSE and worker welfare risk levels.
- Minimum expected 3 supplier quotations.
- Justification when fewer than 3 quotations are provided.
- Mandatory quotation attachments.
- Mandatory selected supplier.
- Mandatory payment term confirmation.

## 5. Phase 3: Approval Engine

### 5.1 Workflow Routing

Build a configurable approval engine that routes requests based on:

- Value band.
- Quotation count.
- HSSE risk level.
- Worker welfare risk level.
- Business/function.
- Request category.
- Budget holder.

### 5.2 Approval Routes

Initial workflow routes should support:

- Low-value route.
- Medium-value route.
- High-value route.
- Fewer-than-3-quotation route.
- Medium/High HSSE risk route.
- Medium/High worker welfare risk route.

### 5.3 Approval Actions

Approvers should be able to:

- View request details.
- View attachments.
- Add comments.
- Approve.
- Reject.
- Return for correction.
- Delegate approval where permitted.

### 5.4 Audit Trail

The system should record:

- Request creation.
- Request submission.
- Field changes.
- Attachment upload, replacement, and deletion.
- Approval decision.
- Rejection decision.
- Return for correction.
- Status changes.
- Delegation or reassignment.

## 6. Phase 4: Procurement Tracking

### 6.1 CP and Project Engineer Activities

Add procurement tracking fields for:

- NDA required/completed.
- DPA required/completed.
- Vendor registration status.
- Agreement status.
- GSAP project reference.
- PR number.
- PR creation date.
- PR status.
- PO number.
- PO creation date.
- PO value.
- PO status.
- PO upload attachment.

### 6.2 Exception Tracking

Track exceptions for:

- Fewer-than-3-quotation requests.
- Single-source requests.
- PO released after job completion.
- Missing vendor registration.
- Missing PR or PO reference after approval.

## 7. Phase 5: Project Execution and Financial Closure

### 7.1 Project Execution Tracking

Allow Project Engineers to maintain:

- Project stages.
- Milestones.
- Planned milestone dates.
- Actual milestone dates.
- Staged payment percentages.
- Staged payment amounts.
- Completion evidence.
- Delivery comments.

### 7.2 Financial Tracking

Track:

- Approved budget.
- Committed PO value.
- Actual spend.
- ROI.
- Savings.
- Variance against budget.
- Final financial comments.

### 7.3 Financial Closure

Finance should be able to:

- Review final project financials.
- Attach or generate the CAPEX closure form.
- Confirm final actuals.
- Confirm final ROI and savings.
- Close the request.

## 8. Phase 6: Dashboards and Reports

### 8.1 Dashboard

Build dashboard views for:

- Total requests.
- Requests by status.
- Requests by department.
- Requests by value band.
- Requests by business/function.
- Open approvals.
- Overdue approvals.
- Fewer-than-3-quotation requests.
- PO-after-job exceptions.
- Budget vs actual.

### 8.2 Reports

Build reports for:

- Department code-wise request count.
- Number of single-source or fewer-than-3-quotation requests.
- PO released after job done.
- Value-wise projects.
- Approval history.
- Financial closure status.
- Budget utilization.

### 8.3 Export

Support export to:

- Excel.
- CSV.

## 9. Phase 7: Integrations

### 9.1 Identity Integration

Integrate with the corporate identity provider for:

- Single sign-on.
- User profile.
- Department.
- Role assignment.
- Approver hierarchy where available.

### 9.2 SAP SAC Integration

Recommended phased approach:

| Stage | Integration Method |
| --- | --- |
| MVP | Manual budget upload/import. |
| Later Release | Scheduled import or API integration. |

### 9.3 GSAP Integration

Recommended phased approach:

| Stage | Integration Method |
| --- | --- |
| MVP | Manual capture of GSAP project, PR, and PO references. |
| Later Release | API or batch integration, subject to GSAP interface availability. |

### 9.4 Notifications

Integrate with email or enterprise notification service for:

- Submission confirmation.
- Pending approval alerts.
- Approval reminders.
- Return/rejection notifications.
- PO upload notifications.
- Financial closure notifications.

## 10. Recommended MVP Scope

The first usable release should include:

- CAPEX request creation.
- Scope, budget, quotation, and risk capture.
- Attachment upload.
- Value-band calculation.
- Fewer-than-3-quotation justification.
- HSSE and worker welfare approval routing.
- Low, medium, and high value approval routing.
- Approval actions and comments.
- Audit trail.
- PR/PO reference tracking.
- PO upload tracking.
- Basic dashboard.
- Basic export.

The MVP should not depend on full SAP SAC or GSAP automation unless mandated by business or IT governance.

## 11. Suggested Delivery Milestones

| Milestone | Deliverable |
| --- | --- |
| M1 | Confirmed business rules, workflow matrix, and data model. |
| M2 | Request creation, draft, submission, and validation. |
| M3 | Approval engine and role-based approval screens. |
| M4 | Attachments, audit trail, and notifications. |
| M5 | PR/PO and procurement tracking. |
| M6 | Project execution and financial closure. |
| M7 | Dashboards, reports, and export. |
| M8 | Identity, SAP SAC, and GSAP integration enhancements. |

## 12. Testing Plan

Test the module using scenarios for:

- Low-value request with 3 quotations.
- Low-value request with fewer than 3 quotations.
- Medium-value request with 3 quotations.
- Medium-value request with fewer than 3 quotations.
- High-value request requiring Contract Board approval.
- Medium/High HSSE risk request.
- Medium/High worker welfare risk request.
- Request returned for correction and resubmitted.
- Request rejected.
- Request approved and moved to PR/PO tracking.
- PO uploaded and moved to execution.
- Project closed by Finance.

## 13. Key Risks

| Risk | Mitigation |
| --- | --- |
| Approval rules are not fully confirmed. | Keep workflow rules configurable and confirm delegation-of-authority before UAT. |
| SAP SAC and GSAP integration complexity delays delivery. | Start with manual reference/import process in MVP. |
| High-value Contract Board process is not documented. | Treat as configurable approval stage until detailed process is confirmed. |
| Users bypass evidence requirements. | Enforce mandatory attachments and validation rules before submission or approval. |
| Reports do not match management expectations. | Validate dashboard and report mockups early with Finance and CP. |

## 14. Acceptance Criteria for Development Completion

Development can be considered complete for initial release when:

- Users can create, submit, approve, reject, and return CAPEX requests.
- Value-band calculation works correctly.
- Quotation and fewer-than-3-quotation rules are enforced.
- HSSE and worker welfare approvals are triggered correctly.
- Approval workflow follows configured governance rules.
- Attachments and audit trail are available.
- PR and PO references can be tracked.
- PO upload can be recorded.
- Project execution and finance closure can be completed.
- Dashboards and reports cover the agreed MVP metrics.
- Role-based access control is enforced.
