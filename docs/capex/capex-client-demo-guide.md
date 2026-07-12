# CAPEX Client Demo Guide

This guide is a practical demo script for presenting the CAPEX module to the client.

It answers one simple question: where should the demo start, and where should it end?

## Demo objective

By the end of the demo, the client should understand that the CAPEX module:

- starts from a controlled CAPEX request
- routes approvals by business rules
- continues into procurement and execution tracking
- finishes with finance, closure, governance, and audit visibility

This is not a deep admin or UAT walkthrough. It is the recommended client-facing story.

## Best demo start point

Start with a single CAPEX request record, not the admin setup screens.

The best opening flow is:

1. Open the CAPEX dashboard or request list.
2. Open one realistic sample request.
3. Begin from the request overview and explain the project context.

Why this is the best start:

- it is easy for the client to understand immediately
- it shows the system around a real business object
- it avoids getting lost in configuration too early

Do not start with:

- Admin Config
- raw permission setup
- MOA details
- decision gates
- audit history

Those are better shown later as supporting controls.

## Best demo end point

End with governance and audit visibility.

The strongest closing flow is:

1. Show that the request can be tracked through procurement, execution, and closure.
2. Open governance / dashboard views.
3. End on audit trail or executive reporting to prove control and traceability.

Why this is the best ending:

- it shows the client the full business value, not just data entry
- it reinforces governance, visibility, and compliance
- it leaves the audience with confidence that the process is controlled end to end

## Recommended demo storyline

Use this order.

### 1. Open with the business problem

Start with one short framing:

"This module gives Shell Oman one controlled CAPEX record from request, through approvals, procurement, execution, finance, and final closure."

Then immediately show the request.

### 2. Show the CAPEX request overview

Show:

- project title
- owner
- business/function
- budget / value
- current status
- request tabs or left-hand process sections

What to say:

- this is the central project record
- the request starts here
- all later steps stay linked to this same request

### 3. Show approvals

Move next to the approvals section.

Show:

- current pending approval
- step-by-step approval route
- approve / return / reject / delegate actions

What to say:

- the system routes approvals based on value band and rules
- only the current assigned approver should act
- the request cannot move forward if required approvals are missing

If asked who acts here:

- the assigned approver for the current step

### 4. Show procurement tracking

Only after approvals, move to procurement.

Show:

- NDA / DPA / vendor setup
- vendor registration / agreement status
- GSAP project reference
- PR number
- PO number
- PO value
- PO attachment upload

What to say:

- procurement starts after approval
- CP / Procurement and Project Engineer maintain these fields
- this area tracks readiness and PR/PO progression

This is also a good place to point out:

- fields should stay disabled until the request is approved for procurement

### 5. Show execution tracking

Move next to execution.

Show:

- milestones
- planned dates
- actual dates
- progress
- staged payments if available

What to say:

- once PO and delivery activity begin, the project team tracks execution here
- this gives progress visibility beyond just approvals

### 6. Show financial closure

Move next to financial closure.

Show:

- actual spend
- final ROI
- final savings
- finance comments
- closure form

What to say:

- Finance completes this after execution is complete
- this is where the project moves from delivery tracking into finance validation

Important message:

- this is not a requester-editable section
- it belongs to finance roles at the right lifecycle stage

### 7. Show AUC, capitalization, and PO closure

Show these as downstream controls after execution and finance activity.

Show:

- AUC account / AUC status
- capitalization readiness
- PR / PO references
- PO closure tracking

What to say:

- this is where the platform extends beyond approval and procurement
- the client gets visibility into open commitments, AUC aging, capitalization, and closure discipline

This is one of the strongest business-value sections in the demo.

### 8. Show closure checklist

Show:

- completion checklist items
- required evidence or completion state

What to say:

- final closure cannot be completed until the checklist and finance validation are complete

This helps the client see that closure is controlled, not just manually declared.

### 9. Show governance extras

Only now move into the advanced governance areas.

Show selectively:

- MOA section
- budget variation
- decision gates
- performance & risk

What to say:

- these are governance and control layers on top of the core workflow
- they are useful, but they are not the best place to start a first demo

If time is short, keep this section brief.

### 10. Finish with documents and audit history

Close the demo with proof of evidence and traceability.

Show:

- document repository / attachments / versions
- audit history

What to say:

- every important action stays attached to the same request
- the platform preserves document evidence and change history
- this is critical for compliance and management confidence

## Short version: exact demo path

If you want the simplest possible demo route, use this:

1. Dashboard or request list
2. Open one sample CAPEX request
3. Overview
4. Approvals
5. Procurement
6. Execution
7. Financial Closure
8. AUC / Capitalization / PO Closure
9. Closure checklist
10. Governance summary
11. Documents
12. Audit history or executive dashboard

That is the cleanest start-to-end story.

## What to avoid in the first 10 minutes

- deep role/permission discussion
- admin workflow configuration
- MOA terminology debate
- edge-case delegation logic
- raw database-style fields without business context

If the client asks, answer them, but do not open there.

## Suggested closing line

Use something like this:

"So the core value of the module is that one CAPEX request stays controlled from submission, through approvals, procurement, execution, finance, and final closure, with full visibility and auditability throughout."

## If time is limited

If you only have a short slot, show only:

1. Overview
2. Approvals
3. Procurement
4. Execution
5. Financial Closure
6. Audit history or dashboard

That still tells a complete story.

## If the client wants admin/configuration

Show Admin Config only at the end, and position it as:

- workflow rule maintenance
- thresholds
- role / user configuration
- master data

Do not let it replace the main business flow.

## Best overall recommendation

Start with a sample request and end with audit or executive visibility.

That gives the client the clearest understanding of:

- what the module is
- how work moves through it
- who uses it
- how control is enforced

## Related documents

- `docs/capex/capex-form-ownership-guide.md`
- `docs/capex/capex-functional-specification.md`
- `docs/capex/capex-product-requirements-document.md`
