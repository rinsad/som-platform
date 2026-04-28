-- ============================================================
-- SOM Platform: Clear KB and load rich sample data
-- Migration 008
-- ============================================================

-- Cascade clears kb_chunks, kb_versions, user_pinned_docs references
TRUNCATE knowledge_base CASCADE;

-- ── Insert sample documents ───────────────────────────────────────────────────

INSERT INTO knowledge_base
  (id, title, category, version, last_updated, description, tags,
   source_type, original_filename, file_size, uploaded_by, extracted_at, content_text)
VALUES

('KB-001',
 'Purchase Request Approval Workflow',
 'Procedure', '3.0', '2026-03-10',
 'End-to-end procedure for raising, approving, and closing a purchase request in SOM Platform.',
 ARRAY['purchase','procurement','approval','workflow','three-quote','SOM'],
 'pdf', 'PR_Approval_Workflow_v3.pdf', 184320, 'Fatima Al Said', NOW(),
 'Purchase Request Approval Workflow — SOM Platform v3.0

1. SCOPE
This procedure applies to all Shell Oman Marketing (SOM) employees who need to procure goods or services with a value above OMR 100. All purchase requests must be submitted through the SOM Platform Purchase Request module.

2. RAISING A PURCHASE REQUEST
2.1  Log in to SOM Platform and navigate to Module B — Purchase Requests.
2.2  Click "New Purchase Request". Complete all mandatory fields: title, department, estimated cost, currency (OMR), justification, and required delivery date.
2.3  For requests above OMR 5,000 the three-quote rule applies. Upload at least three competitive vendor quotations as PDF attachments before submission.
2.4  Select the appropriate cost centre from the dropdown. If the cost centre is not listed, contact Finance to have it added.
2.5  Click "Submit for Approval". The system automatically routes the request to the line manager.

3. APPROVAL TIERS
LOW (< OMR 5,000):   Line Manager approval only.
MEDIUM (OMR 5,000 – 50,000): Line Manager + Department Head.
HIGH (> OMR 50,000): Line Manager + Department Head + Finance Director + CEO sign-off required.

4. THREE-QUOTE RULE
All requests in the MEDIUM and HIGH tiers must include a minimum of three independent vendor quotations. Quotations must be dated within 90 days of submission. Single-source justification forms are available from Procurement and must be approved by the Department Head before a request can bypass the three-quote requirement.

5. ESCALATION
If a request is not actioned within 5 business days at any approval tier, the system automatically escalates it to the next level and sends an email alert to the approver and the requestor. If escalation reaches CEO level with no action after 3 further days, the Head of Procurement is notified.

6. CLOSURE
Once all approvals are received, the system issues a Purchase Order (PO) number. The requestor is notified by email. The PO must be quoted on all supplier invoices. On delivery, the requestor confirms receipt in the system to trigger payment processing.

7. REJECTIONS
Rejected requests must include a written reason. The requestor may resubmit with amendments within 10 business days. A second rejection is final and must be escalated to the Department Head if the requestor disputes the outcome.

8. RECORD KEEPING
All approved purchase requests are archived in SOM Platform for 7 years in accordance with SOM document retention policy.'),

('KB-002',
 'Capex Budget Approval Policy',
 'Policy', '4.0', '2026-01-20',
 'Defines authority limits, approval tiers, and escalation paths for all capital expenditure at Shell Oman Marketing.',
 ARRAY['capex','budget','approval','authority','policy','finance','OMR'],
 'pdf', 'Capex_Budget_Approval_Policy_v4.pdf', 210944, 'Mohammed Al Rashdi', NOW(),
 'Capital Expenditure Budget Approval Policy — SOM v4.0

1. PURPOSE
This policy establishes the authority matrix for approving capital expenditure (Capex) requests at Shell Oman Marketing (SOM). It ensures appropriate governance, financial control, and alignment with the approved annual Capex budget.

2. DEFINITIONS
Capex: Expenditure on assets with an expected useful life of more than one year and a value exceeding OMR 1,000.
Committed Capex: Approved expenditure for which a purchase order has been raised.
Actual Capex: Expenditure for which invoices have been received and posted.

3. AUTHORITY MATRIX
TIER A — Up to OMR 50,000: Department Head approval.
TIER B — OMR 50,001 to OMR 300,000: Department Head + Finance Director approval.
TIER C — OMR 300,001 to OMR 1,000,000: Department Head + Finance Director + CEO approval.
TIER D — Above OMR 1,000,000: Board approval required. CEO submits to Board Investment Committee.

4. BUDGET ALIGNMENT
All Capex requests must be aligned to the current approved annual budget. Requests that exceed the departmental budget line require a budget transfer approval from Finance before submission. Unbudgeted Capex above OMR 100,000 requires Board notification.

5. QHSE SIGN-OFF
All Capex requests with a QHSE implication (new equipment, facility modification, hazardous material storage) must carry a QHSE sign-off from the Head of QHSE before Finance Director approval.

6. GSAP SYNCHRONISATION
Approved Capex is recorded in GSAP (SAP). SOM Platform syncs with GSAP every 4 hours to update committed and actual figures on the Capex dashboard. Discrepancies of more than OMR 5,000 between SOM Platform and GSAP must be reported to Finance within 24 hours.

7. AMENDMENTS
Amendments to approved Capex (scope changes, cost increases up to 10%) may be approved at the same tier as the original. Cost increases exceeding 10% require re-approval at the appropriate tier for the revised total value.

8. ANNUAL REVIEW
This policy is reviewed annually by the Finance Director and approved by the CEO. The current version supersedes all previous versions.'),

('KB-003',
 'Asset Registration and RADP Guidelines',
 'Procedure', '2.0', '2025-12-01',
 'How to register new physical assets in the RADP hierarchy: Region, Site, Facility, Equipment.',
 ARRAY['asset','RADP','registration','equipment','tagging','hierarchy','site'],
 'pdf', 'Asset_Registration_RADP_v2.pdf', 163840, 'Khalid Al Siyabi', NOW(),
 'Asset Registration and RADP Guidelines — SOM Platform v2.0

1. OVERVIEW
All physical assets owned or operated by Shell Oman Marketing must be registered in the RADP (Region – Area – District – Point) hierarchy within the SOM Platform Assets module within 30 days of acquisition or commissioning.

2. RADP HIERARCHY
Region: Top-level geographic grouping (e.g., Muscat Region, Salalah Region).
Site: A specific location within a region (e.g., Qurum Station, Sohar Main Depot).
Facility: A functional area within a site (e.g., Fuel Dispensing Area, LPG Storage, Workshop).
Equipment: An individual asset within a facility (e.g., Pump Unit PMP-001, Generator GEN-002).

3. ASSET CODES
Each asset receives a unique code in the format: REG-SITE-FAC-TYPE-NNN
Example: MUS-QUR-FDA-PMP-001 = Muscat Region / Qurum Station / Fuel Dispensing Area / Pump / 001
Approved equipment type codes: GEN (Generator), DSP (Dispenser), HVC (HVAC), PMP (Pump), TNK (Tank), TRF (Transformer), FLT (Filter), CMP (Compressor).

4. REGISTRATION STEPS
4.1  Navigate to Module C — Assets in SOM Platform.
4.2  Select the Region, then Site, then Facility from the dropdown hierarchy.
4.3  Click "Register New Equipment".
4.4  Complete all mandatory fields: asset name, equipment type code, serial number, manufacturer, installation date, purchase cost (OMR), and responsible department.
4.5  Upload the commissioning certificate or purchase invoice as a PDF attachment.
4.6  Click Submit. The asset record is created and assigned the next sequential code.

5. UTILITY BILLING
Sites with utility metering (electricity, water, LPG) must link meter IDs to the corresponding facility record. Monthly meter readings are entered by the Site Engineer. SOM Platform calculates and posts utility charges to the relevant cost centre automatically on the 1st of each month.

6. ANNUAL ASSET VERIFICATION
All assets must be physically verified annually by the responsible Site Engineer and confirmed in SOM Platform. Assets not confirmed within the calendar year are flagged for write-off review.'),

('KB-004',
 'Incident and Near-Miss Reporting Procedure',
 'QHSE', '5.0', '2026-02-15',
 'Mandatory 24-hour reporting procedure for all workplace incidents, near-misses, and environmental events at SOM sites.',
 ARRAY['incident','near-miss','safety','QHSE','reporting','24-hour','HSE'],
 'pdf', 'Incident_Reporting_Procedure_v5.pdf', 196608, 'Nadia Al Harthy', NOW(),
 'Incident and Near-Miss Reporting Procedure — SOM QHSE v5.0

1. PURPOSE AND SCOPE
This procedure sets out the mandatory requirements for reporting, investigating, and closing workplace incidents, near-misses, and environmental events at all Shell Oman Marketing (SOM) sites and offices. It applies to all SOM employees, contractors, and visitors.

2. DEFINITIONS
Incident: An unplanned event that results in, or has the potential to result in, injury, illness, property damage, or environmental impact.
Near-Miss: An unplanned event that did not result in harm but had the potential to do so under slightly different circumstances.
Environmental Event: Any unplanned release of a substance (fuel, lubricant, chemical, waste) to the environment.
Lost Time Injury (LTI): An injury that results in the employee being unable to return to work the following calendar day.

3. REPORTING TIMELINE
All incidents and near-misses MUST be reported within 24 hours of occurrence to the Site Manager and the QHSE Department.
LTIs and High-Potential incidents must be reported to the QHSE Director and the CEO within 4 hours.
Environmental releases above the threshold quantities defined in Appendix A must be reported to the Ministry of Environment within 24 hours.

4. HOW TO REPORT
4.1  Ensure the immediate safety of people and contain the incident if safe to do so.
4.2  Notify the Site Manager immediately by phone.
4.3  Log in to SOM Platform, navigate to QHSE > Incident Reporting.
4.4  Complete the Incident Report Form: date, time, location, description, immediate causes, persons involved, and initial actions taken.
4.5  Attach photographs where available.
4.6  Submit the report. A unique Incident Reference Number (IRN) is assigned automatically.

5. INVESTIGATION
All LTIs and High-Potential near-misses require a formal Root Cause Analysis (RCA) within 5 business days. The RCA must use the 5-Why methodology and be reviewed by the QHSE Manager. Corrective actions must be assigned with owners and due dates in SOM Platform.

6. CLOSE-OUT
Incidents are closed in SOM Platform only when all corrective actions are verified as complete. Close-out requires sign-off from the QHSE Manager and the Department Head.

7. STATISTICS AND REPORTING
SOM Platform generates monthly QHSE dashboards including Total Recordable Incident Rate (TRIR) and Lost Time Injury Frequency (LTIF). These are reviewed at the monthly Leadership Team meeting.'),

('KB-005',
 'Annual Leave and Absence Policy',
 'HR', '3.0', '2026-01-01',
 'Entitlements, approval process, carry-forward rules, and blackout periods for annual leave at SOM.',
 ARRAY['leave','annual leave','HR','entitlement','carry-forward','absence','holiday'],
 'pdf', 'Annual_Leave_Policy_v3.pdf', 147456, 'HR Department', NOW(),
 'Annual Leave and Absence Policy — Shell Oman Marketing HR v3.0

1. ENTITLEMENTS
All permanent SOM employees are entitled to 30 calendar days of annual leave per completed year of service.
Employees in their first year accrue leave at 2.5 days per completed month of service.
Employees with more than 10 years of service are entitled to 35 calendar days per year.
Contractual employees receive leave entitlement as specified in their individual employment contracts.

2. PUBLIC HOLIDAYS
SOM observes all Omani national public holidays as declared by the Government of Oman. The HR department publishes the confirmed public holiday schedule for the coming year before 1 December each year. Public holidays falling on a weekend are not carried over.

3. APPLICATION PROCESS
3.1  Employees must apply for annual leave via SOM Platform HR module at least 5 business days in advance for leave of up to 5 days.
3.2  For leave exceeding 5 days, applications must be submitted at least 15 business days in advance.
3.3  The line manager must approve or reject the application within 3 business days.
3.4  Approved leave is automatically reflected in the team calendar and HR records.

4. CARRY-FORWARD
A maximum of 15 days of unused annual leave may be carried forward to the following year. Leave carried forward must be taken by 31 March of the following year. Unused carried-forward leave is forfeited and will not be encashed except upon termination of employment.

5. BLACKOUT PERIODS
Annual leave may not be approved during the following blackout periods without prior approval from the HR Director:
- Final two weeks of the financial year (mid to end of December).
- National Day period (17–19 November).
- Individual department blackout periods as notified by Department Heads.

6. EMERGENCY LEAVE
Up to 5 days of emergency leave may be granted by the line manager for serious family emergencies. Emergency leave is deducted from the annual leave balance. Additional emergency leave beyond 5 days requires HR Director approval.

7. UNPAID LEAVE
Unpaid leave may be granted by the HR Director in exceptional circumstances after all paid leave entitlements are exhausted. Applications must be supported by documentary evidence of the circumstances.'),

('KB-006',
 'IT Security and Acceptable Use Policy',
 'Policy', '6.0', '2026-02-01',
 'Governs acceptable use of SOM IT systems, password standards, AI tool usage, and data classification.',
 ARRAY['IT','security','password','acceptable use','data','AI','MFA','NCA','classification'],
 'pdf', 'IT_Security_AUP_v6.pdf', 229376, 'IT Security Team', NOW(),
 'IT Security and Acceptable Use Policy — SOM IT v6.0

1. PURPOSE
This policy defines the rules for acceptable use of all Shell Oman Marketing (SOM) information technology resources, including hardware, software, networks, cloud services, and data. Compliance is mandatory for all employees, contractors, and third parties with access to SOM systems.

2. PASSWORD STANDARDS
All SOM system passwords must meet the following minimum requirements:
- Minimum 12 characters in length.
- Must include at least one uppercase letter, one lowercase letter, one numeral, and one special character.
- Passwords must not include the user''s name, employee ID, or the word "Shell" or "Oman".
- Passwords must be changed every 90 days.
- Password reuse: the last 10 passwords may not be reused.
Multi-Factor Authentication (MFA) is mandatory for all remote access connections, cloud services, and SOM Platform.

3. ACCEPTABLE USE
3.1  SOM IT resources may be used for business purposes only. Limited personal use during breaks is permitted provided it does not consume excessive bandwidth or violate any other clause of this policy.
3.2  The following activities are strictly prohibited on SOM networks and devices:
     - Downloading, storing, or sharing unlicensed software.
     - Accessing, creating, or distributing material that is offensive, discriminatory, or illegal.
     - Bypassing security controls, using VPNs not approved by IT, or installing unauthorised software.
     - Connecting personal storage devices (USB drives) to SOM equipment without prior IT approval.

4. AI TOOL USAGE
4.1  Approved AI tools may be used for business productivity purposes (drafting, summarising, coding assistance).
4.2  Employees must NOT input SOM confidential data, customer data, financial data, or personal data into any AI tool unless the tool is on the SOM-approved AI services list published by IT.
4.3  The SOM-approved AI services list is reviewed quarterly by the IT Security Team and published on the intranet.
4.4  Violations of the AI tool usage guidelines may result in disciplinary action.

5. DATA CLASSIFICATION
CONFIDENTIAL: Financial data, personal data, contract terms, strategic plans. Must be encrypted in transit and at rest. Access on a need-to-know basis.
INTERNAL: Operational data, policies, procedures. Not for external distribution.
PUBLIC: Information approved for external publication.

6. INCIDENT REPORTING
Any suspected IT security incident (phishing, malware, data breach, lost device) must be reported to the IT Security Team within 1 hour of discovery by calling the IT Security Hotline or emailing itsecurity@shell-oman.com.

7. COMPLIANCE
This policy aligns with the Oman National Cybersecurity Authority (NCA) Essential Cybersecurity Controls (ECC). Non-compliance may result in disciplinary action up to and including termination of employment and criminal prosecution.'),

('KB-007',
 'Vendor Onboarding and Pre-qualification Procedure',
 'Procedure', '2.0', '2025-10-01',
 'Process for registering, pre-qualifying, and activating new vendors in the SOM procurement system.',
 ARRAY['vendor','supplier','onboarding','procurement','pre-qualification','Omanisation','SAP'],
 'pdf', 'Vendor_Onboarding_Procedure_v2.pdf', 172032, 'Procurement Team', NOW(),
 'Vendor Onboarding and Pre-qualification Procedure — SOM Procurement v2.0

1. SCOPE
This procedure applies to all new vendors (suppliers of goods or services) seeking to do business with Shell Oman Marketing (SOM). No purchase order may be raised for a vendor that is not registered and active in the SOM procurement system.

2. ELIGIBILITY
Vendors must be legally registered entities in the Sultanate of Oman or the country of supply. Vendors supplying services on-site at SOM facilities must hold a valid Commercial Registration (CR) in Oman and comply with Omanisation requirements.

3. REQUIRED DOCUMENTATION
All vendors must submit the following documents as part of the onboarding application:
- Commercial Registration Certificate (valid, not expired).
- Tax Card (if applicable).
- Bank account details on company letterhead.
- Company profile and list of key personnel.
- References from at least two existing clients.
For high-risk vendor categories (fuel handling, electrical works, civil construction): additionally submit proof of QHSE pre-qualification, relevant ISO certificates, and a list of equipment owned.

4. OMANISATION REQUIREMENTS
Vendors providing services at SOM sites must demonstrate compliance with the Omanisation ratio stipulated by the Ministry of Labour for their business category. Evidence of Omanisation compliance must be submitted annually. Vendors failing to maintain the required Omanisation ratio will be suspended from receiving new POs until compliance is restored.

5. ONBOARDING STEPS
5.1  The SOM requestor nominates the vendor in SOM Platform (Procurement > Vendor Onboarding).
5.2  The vendor receives an automated email with a link to the SOM Vendor Portal to upload required documents.
5.3  Procurement reviews documents within 5 business days. Incomplete submissions are returned to the vendor with comments.
5.4  Finance verifies bank details and sets up the vendor in SAP (Vendor Master Data).
5.5  Procurement activates the vendor in SOM Platform. The requestor is notified and may now raise purchase requests for that vendor.

6. ANNUAL REVIEW
All vendor records are reviewed annually. Vendors with no PO activity in the preceding 12 months are placed on Dormant status. Dormant vendors must resubmit current documentation before a new PO can be raised.'),

('KB-008',
 'Health and Safety Site Induction Checklist',
 'QHSE', '2.0', '2026-03-01',
 'Mandatory induction checklist for new employees and contractors at all Shell Oman Marketing sites.',
 ARRAY['safety','induction','PPE','contractor','onboarding','checklist','site','fire','emergency'],
 'pdf', 'HS_Site_Induction_Checklist_v2.pdf', 139264, 'QHSE Department', NOW(),
 'Health and Safety Site Induction Checklist — SOM QHSE v2.0

1. PURPOSE
All new employees and contractors must complete this induction before commencing work at any Shell Oman Marketing (SOM) site. The completed checklist must be signed by the inductee and the Site Manager and retained on file for the duration of the assignment.

2. SITE RULES
- Speed limit on all SOM sites: 15 km/h. Pedestrians have right of way.
- Mobile phone use while driving on site is prohibited.
- Smoking is only permitted in designated smoking areas. Smoking is strictly prohibited within 15 metres of any fuel storage, dispensing, or LPG area.
- Consumption of alcohol or controlled substances on site is a zero-tolerance violation resulting in immediate removal and termination or contract cancellation.

3. PERSONAL PROTECTIVE EQUIPMENT (PPE)
The following PPE is mandatory in all operational areas unless signage indicates otherwise:
- Safety shoes (steel toecap, oil-resistant sole).
- High-visibility vest.
- Safety glasses or goggles.
- Hearing protection in areas marked with yellow hearing protection signs.
Hard hats are mandatory in all civil construction and overhead work areas. Cut-resistant gloves are required for all manual handling of sharp objects.

4. EMERGENCY PROCEDURES
4.1  FIRE: If you discover a fire, raise the alarm using the nearest break-glass call point. Evacuate immediately via the nearest emergency exit. Do not use lifts. Assemble at the designated muster point shown on the site map. Do not re-enter the building until the all-clear is given by the Site Manager.
4.2  FUEL SPILL: Stop the source if safe to do so. Activate the site spill kit. Contain the spill with absorbent boom. Do not allow fuel to enter drains. Notify the Site Manager and QHSE immediately. Complete an incident report in SOM Platform within 24 hours.
4.3  MEDICAL EMERGENCY: Call 999 (Oman emergency services). Notify the Site Manager. The location of the first aid kit and AED defibrillator is shown on the site map.

5. MUSTER POINTS
Muscat Region sites: primary muster point is marked on the site map provided at induction.
Salalah Region sites: primary muster point is at the main site entrance.
All muster points are reviewed and updated after any site modification.

6. SIGN-OFF
By signing this checklist, the inductee confirms that they have received, understood, and agree to comply with all SOM site health and safety rules.
Inductee signature: ____________   Date: ____________
Site Manager signature: __________  Date: ____________');

-- ── Insert chunks for full-text and semantic search ──────────────────────────
-- Split each document into 2–3 meaningful chunks

INSERT INTO kb_chunks (doc_id, chunk_index, content) VALUES

-- KB-001: Purchase Request Workflow
('KB-001', 0,
 'Purchase Request Approval Workflow SOM Platform v3.0. Scope: applies to all Shell Oman Marketing employees procuring goods or services above OMR 100. Raising a purchase request: log in to SOM Platform, navigate to Module B Purchase Requests, click New Purchase Request, complete mandatory fields including title department estimated cost currency OMR justification and required delivery date. For requests above OMR 5000 the three-quote rule applies requiring at least three competitive vendor quotations uploaded as PDF attachments. Select cost centre and submit for approval. The system automatically routes to the line manager.'),
('KB-001', 1,
 'Approval tiers for purchase requests: LOW tier under OMR 5000 requires line manager approval only. MEDIUM tier OMR 5000 to 50000 requires line manager and department head. HIGH tier above OMR 50000 requires line manager department head finance director and CEO sign-off. Three-quote rule: all MEDIUM and HIGH requests must include three independent vendor quotations dated within 90 days. Single-source justification forms require department head approval to bypass the three-quote requirement.'),
('KB-001', 2,
 'Escalation policy for purchase requests: if not actioned within 5 business days the system escalates automatically and sends email alerts. Closure: approved requests receive a Purchase Order PO number. Requestor confirms receipt on delivery to trigger payment. Rejections must include written reason and requestor may resubmit within 10 business days. All approved purchase requests are archived in SOM Platform for 7 years in accordance with document retention policy.'),

-- KB-002: Capex Policy
('KB-002', 0,
 'Capital Expenditure Budget Approval Policy SOM v4.0. Purpose: establishes authority matrix for approving capital expenditure Capex requests at Shell Oman Marketing. Definitions: Capex is expenditure on assets with expected useful life more than one year and value exceeding OMR 1000. Committed Capex means approved expenditure with a purchase order raised. Actual Capex means expenditure for which invoices have been received and posted.'),
('KB-002', 1,
 'Capex authority matrix: TIER A up to OMR 50000 requires department head approval. TIER B OMR 50001 to 300000 requires department head and finance director. TIER C OMR 300001 to 1000000 requires department head finance director and CEO. TIER D above OMR 1000000 requires board approval via CEO submission to Board Investment Committee. All Capex must align to approved annual budget. Unbudgeted Capex above OMR 100000 requires board notification. QHSE sign-off required for equipment facility modification or hazardous material storage Capex.'),
('KB-002', 2,
 'GSAP synchronisation: approved Capex recorded in GSAP SAP system. SOM Platform syncs with GSAP every 4 hours to update committed and actual figures on the Capex dashboard. Discrepancies over OMR 5000 between SOM Platform and GSAP must be reported to Finance within 24 hours. Amendments to scope up to 10 percent cost increase approved at same tier. Above 10 percent requires re-approval at appropriate tier for revised total. Policy reviewed annually by Finance Director and approved by CEO.'),

-- KB-003: Asset RADP
('KB-003', 0,
 'Asset Registration and RADP Guidelines SOM Platform v2.0. All physical assets owned by Shell Oman Marketing must be registered in the RADP Region Area District Point hierarchy within 30 days of acquisition. RADP hierarchy: Region is top-level geographic grouping such as Muscat Region or Salalah Region. Site is a specific location such as Qurum Station or Sohar Main Depot. Facility is a functional area such as Fuel Dispensing Area LPG Storage or Workshop. Equipment is an individual asset such as Pump Unit or Generator.'),
('KB-003', 1,
 'Asset codes follow the format REG-SITE-FAC-TYPE-NNN. Example MUS-QUR-FDA-PMP-001 means Muscat Region Qurum Station Fuel Dispensing Area Pump number 001. Approved equipment type codes: GEN Generator DSP Dispenser HVC HVAC PMP Pump TNK Tank TRF Transformer FLT Filter CMP Compressor. Registration steps: navigate to Module C Assets in SOM Platform, select Region Site Facility, click Register New Equipment, complete all mandatory fields including serial number manufacturer installation date and purchase cost in OMR, upload commissioning certificate or invoice.'),
('KB-003', 2,
 'Utility billing for assets: sites with utility metering for electricity water or LPG must link meter IDs to facility records. Monthly meter readings entered by Site Engineer. SOM Platform calculates and posts utility charges to cost centre on the 1st of each month. Annual asset verification required: all assets physically verified by Site Engineer each calendar year. Assets not confirmed within calendar year are flagged for write-off review.'),

-- KB-004: Incident Reporting
('KB-004', 0,
 'Incident and Near-Miss Reporting Procedure SOM QHSE v5.0. Purpose: mandatory requirements for reporting investigating and closing workplace incidents near-misses and environmental events at all SOM sites and offices. Definitions: Incident is an unplanned event resulting in injury illness property damage or environmental impact. Near-Miss is an unplanned event that did not result in harm but had the potential to under slightly different circumstances. Environmental Event is any unplanned release of fuel lubricant chemical or waste to the environment. Lost Time Injury LTI means employee unable to return to work the following day.'),
('KB-004', 1,
 'Reporting timelines: all incidents and near-misses must be reported within 24 hours to Site Manager and QHSE Department. Lost Time Injuries LTIs and High-Potential incidents must be reported to QHSE Director and CEO within 4 hours. Environmental releases above threshold quantities must be reported to Ministry of Environment within 24 hours. How to report: ensure immediate safety of people and contain incident, notify Site Manager by phone, log in to SOM Platform navigate to QHSE Incident Reporting, complete Incident Report Form with date time location description immediate causes persons involved and initial actions, attach photographs, submit to receive unique Incident Reference Number IRN.'),
('KB-004', 2,
 'Investigation requirements: all LTIs and High-Potential near-misses require formal Root Cause Analysis RCA within 5 business days using 5-Why methodology reviewed by QHSE Manager. Corrective actions assigned with owners and due dates in SOM Platform. Close-out requires sign-off from QHSE Manager and Department Head after all corrective actions verified complete. SOM Platform generates monthly QHSE dashboards including Total Recordable Incident Rate TRIR and Lost Time Injury Frequency LTIF reviewed at monthly Leadership Team meeting.'),

-- KB-005: Annual Leave
('KB-005', 0,
 'Annual Leave and Absence Policy Shell Oman Marketing HR v3.0. Entitlements: all permanent SOM employees are entitled to 30 calendar days annual leave per completed year of service. Employees in first year accrue 2.5 days per completed month. Employees with more than 10 years service are entitled to 35 calendar days per year. Contractual employees receive leave entitlement as specified in individual employment contracts. SOM observes all Omani national public holidays as declared by the Government of Oman.'),
('KB-005', 1,
 'Annual leave application process: apply via SOM Platform HR module at least 5 business days in advance for leave up to 5 days. For leave exceeding 5 days apply at least 15 business days in advance. Line manager must approve or reject within 3 business days. Carry-forward: maximum 15 days unused annual leave may be carried forward to following year. Carried forward leave must be taken by 31 March of following year. Unused carried-forward leave is forfeited and not encashed except upon termination of employment.'),
('KB-005', 2,
 'Blackout periods for annual leave: leave may not be approved during final two weeks of financial year mid to end December, National Day period 17 to 19 November, and department blackout periods notified by Department Heads. Emergency leave: up to 5 days granted by line manager for serious family emergencies, deducted from annual leave balance. Additional emergency leave beyond 5 days requires HR Director approval. Unpaid leave may be granted by HR Director in exceptional circumstances after all paid leave entitlements exhausted, requiring documentary evidence.'),

-- KB-006: IT Security
('KB-006', 0,
 'IT Security and Acceptable Use Policy SOM IT v6.0. Purpose: defines rules for acceptable use of all Shell Oman Marketing IT resources including hardware software networks cloud services and data. Mandatory for all employees contractors and third parties. Password standards: minimum 12 characters including uppercase lowercase numeral and special character. Passwords must not include user name employee ID or the words Shell or Oman. Passwords must be changed every 90 days. Last 10 passwords may not be reused. Multi-Factor Authentication MFA is mandatory for all remote access cloud services and SOM Platform.'),
('KB-006', 1,
 'Acceptable use rules: SOM IT resources may be used for business purposes with limited personal use during breaks. Prohibited activities include downloading unlicensed software, accessing offensive or illegal material, bypassing security controls, using unapproved VPNs, installing unauthorised software, and connecting personal USB drives without IT approval. AI tool usage guidelines: approved AI tools may be used for business productivity including drafting summarising and coding assistance. Employees must NOT input SOM confidential data customer data financial data or personal data into any AI tool unless on the SOM-approved AI services list.'),
('KB-006', 2,
 'Data classification at SOM: CONFIDENTIAL includes financial data personal data contract terms and strategic plans which must be encrypted in transit and at rest with access on need-to-know basis. INTERNAL includes operational data policies and procedures not for external distribution. PUBLIC is information approved for external publication. IT security incident reporting: suspected phishing malware data breach or lost device must be reported to IT Security Team within 1 hour. Policy aligns with Oman National Cybersecurity Authority NCA Essential Cybersecurity Controls ECC. Non-compliance may result in disciplinary action up to termination.'),

-- KB-007: Vendor Onboarding
('KB-007', 0,
 'Vendor Onboarding and Pre-qualification Procedure SOM Procurement v2.0. Scope: applies to all new vendors seeking to do business with Shell Oman Marketing. No purchase order may be raised for a vendor not registered and active in the SOM procurement system. Eligibility: vendors must be legally registered entities in Oman or country of supply. Vendors supplying on-site services must hold valid Commercial Registration CR in Oman and comply with Omanisation requirements. Required documentation includes Commercial Registration Certificate Tax Card bank account details company profile client references.'),
('KB-007', 1,
 'High-risk vendor categories including fuel handling electrical works and civil construction must additionally submit proof of QHSE pre-qualification relevant ISO certificates and list of equipment owned. Omanisation requirements: vendors providing services at SOM sites must demonstrate compliance with Omanisation ratio stipulated by Ministry of Labour. Evidence submitted annually. Vendors failing to maintain required Omanisation ratio suspended from receiving new purchase orders until compliance restored. Onboarding steps: requestor nominates vendor in SOM Platform Procurement Vendor Onboarding module, vendor receives email to upload documents to SOM Vendor Portal.'),
('KB-007', 2,
 'Vendor onboarding process continuation: Procurement reviews documents within 5 business days and returns incomplete submissions to vendor with comments. Finance verifies bank details and sets up vendor in SAP Vendor Master Data. Procurement activates vendor in SOM Platform and notifies requestor. Annual review of all vendor records: vendors with no purchase order activity in preceding 12 months are placed on Dormant status. Dormant vendors must resubmit current documentation before a new purchase order can be raised.'),

-- KB-008: QHSE Induction
('KB-008', 0,
 'Health and Safety Site Induction Checklist SOM QHSE v2.0. All new employees and contractors must complete this induction before commencing work at any Shell Oman Marketing site. Completed checklist must be signed by inductee and Site Manager and retained on file for duration of assignment. Site rules: speed limit on all SOM sites is 15 km per hour with pedestrians having right of way. Mobile phone use while driving on site is prohibited. Smoking only permitted in designated areas and strictly prohibited within 15 metres of fuel storage dispensing or LPG areas. Zero tolerance for alcohol or controlled substances on site.'),
('KB-008', 1,
 'Personal Protective Equipment PPE requirements: safety shoes with steel toecap and oil-resistant sole mandatory in all operational areas. High-visibility vest mandatory. Safety glasses or goggles mandatory. Hearing protection required in areas marked with yellow hearing protection signs. Hard hats mandatory in civil construction and overhead work areas. Cut-resistant gloves required for manual handling of sharp objects. Emergency procedures: fire discovery requires raising alarm via nearest break-glass call point then evacuate via nearest emergency exit and assemble at designated muster point. Do not use lifts during fire evacuation.'),
('KB-008', 2,
 'Emergency procedures continued: fuel spill response requires stopping the source if safe to do so, activating site spill kit, containing spill with absorbent boom, preventing fuel from entering drains, notifying Site Manager and QHSE, completing incident report in SOM Platform within 24 hours. Medical emergency procedure: call 999 Oman emergency services and notify Site Manager. First aid kit and AED defibrillator locations shown on site map provided at induction. Muster points: Muscat Region primary muster point marked on site map. Salalah Region primary muster point at main site entrance. All muster points reviewed after any site modification.');

-- ── Insert version history ────────────────────────────────────────────────────

INSERT INTO kb_versions (doc_id, version, updated_at, updated_by, changelog) VALUES
  ('KB-001','3.0','2026-03-10','Fatima Al Said','Raised MEDIUM tier upper threshold from OMR 30k to OMR 50k; clarified three-quote currency requirement.'),
  ('KB-001','2.1','2025-06-01','Fatima Al Said','Updated section 4 — single-source justification now requires Department Head approval.'),
  ('KB-001','2.0','2024-09-15','Ahmed Al Balushi','Major revision: added digital submission workflow and removed paper form references.'),
  ('KB-002','4.0','2026-01-20','Mohammed Al Rashdi','Raised TIER B ceiling to OMR 300k; added mandatory QHSE sign-off clause for all operational Capex.'),
  ('KB-002','3.1','2025-04-01','Mohammed Al Rashdi','Added GSAP sync discrepancy reporting requirement; clarified unbudgeted Capex board notification threshold.'),
  ('KB-002','3.0','2024-11-01','Sara Al Farsi','Introduced TIER D board approval for Capex above OMR 1M.'),
  ('KB-003','2.0','2025-12-01','Khalid Al Siyabi','Added full equipment type code table and revised annual verification requirement.'),
  ('KB-003','1.4','2025-07-20','Khalid Al Siyabi','Corrected RADP asset code format: facility segment changed from 2 to 3 characters.'),
  ('KB-004','5.0','2026-02-15','Nadia Al Harthy','Full rewrite to align with Shell Group HSSE Standards 2025. Added environmental event thresholds in Appendix A.'),
  ('KB-004','4.2','2025-08-01','Nadia Al Harthy','Added environmental near-miss reporting section; updated escalation contacts.'),
  ('KB-005','3.0','2026-01-01','HR Department','Increased carry-forward cap from 10 to 15 days; added emergency leave category.'),
  ('KB-005','2.1','2024-07-01','HR Department','Updated public holiday schedule reference; minor formatting corrections.'),
  ('KB-006','6.0','2026-02-01','IT Security Team','Added AI tool usage section; updated NCA ECC alignment notes; raised MFA requirement to all cloud services.'),
  ('KB-006','5.1','2025-06-15','IT Security Team','Added data residency requirements; clarified USB device prohibition.'),
  ('KB-006','5.0','2025-01-10','IT Security Team','Major update for NCA ECC compliance — new password complexity and 90-day rotation requirement.'),
  ('KB-007','2.0','2025-10-01','Procurement Team','Added Omanisation compliance section and high-risk vendor QHSE pre-qualification requirements.'),
  ('KB-007','1.3','2024-06-01','Procurement Team','Aligned vendor master data fields with updated SAP configuration.'),
  ('KB-008','2.0','2026-03-01','QHSE Department','Added fuel spill response procedure; updated muster point locations for Sohar and Salalah sites.'),
  ('KB-008','1.1','2025-01-15','QHSE Department','Added AED defibrillator location reference; updated fire assembly point for Qurum Station.');
