// ─── Module A: Capex ────────────────────────────────────────────────────────
function buildDept(name, totalBudget, committed, actual, monthlyData) {
  return {
    name,
    totalBudget,
    committed,
    actual,
    remaining: totalBudget - committed - actual,
    percentUsed: Math.round((actual / totalBudget) * 100),
    monthlyData,
  };
}

const mockCapexDepartments = [
  buildDept('HR & Real Estate', 800000, 120000, 350000, [
    { month: 'Oct', budgeted: 50000, actual: 45000 },
    { month: 'Nov', budgeted: 55000, actual: 58000 },
    { month: 'Dec', budgeted: 65000, actual: 72000 },
    { month: 'Jan', budgeted: 60000, actual: 55000 },
    { month: 'Feb', budgeted: 55000, actual: 62000 },
    { month: 'Mar', budgeted: 65000, actual: 58000 },
  ]),
  buildDept('Finance & Operations', 600000, 80000, 210000, [
    { month: 'Oct', budgeted: 30000, actual: 28000 },
    { month: 'Nov', budgeted: 35000, actual: 33000 },
    { month: 'Dec', budgeted: 40000, actual: 38000 },
    { month: 'Jan', budgeted: 38000, actual: 42000 },
    { month: 'Feb', budgeted: 35000, actual: 32000 },
    { month: 'Mar', budgeted: 40000, actual: 37000 },
  ]),
  buildDept('Trading, Lubricants & Supply Chain', 2000000, 250000, 890000, [
    { month: 'Oct', budgeted: 140000, actual: 128000 },
    { month: 'Nov', budgeted: 155000, actual: 165000 },
    { month: 'Dec', budgeted: 175000, actual: 182000 },
    { month: 'Jan', budgeted: 160000, actual: 155000 },
    { month: 'Feb', budgeted: 150000, actual: 142000 },
    { month: 'Mar', budgeted: 170000, actual: 118000 },
  ]),
  buildDept('Aviation', 1500000, 180000, 720000, [
    { month: 'Oct', budgeted: 110000, actual: 98000 },
    { month: 'Nov', budgeted: 120000, actual: 115000 },
    { month: 'Dec', budgeted: 130000, actual: 142000 },
    { month: 'Jan', budgeted: 125000, actual: 128000 },
    { month: 'Feb', budgeted: 115000, actual: 112000 },
    { month: 'Mar', budgeted: 130000, actual: 125000 },
  ]),
  buildDept('Mobility', 1200000, 150000, 480000, [
    { month: 'Oct', budgeted: 75000, actual: 68000 },
    { month: 'Nov', budgeted: 80000, actual: 85000 },
    { month: 'Dec', budgeted: 90000, actual: 95000 },
    { month: 'Jan', budgeted: 85000, actual: 82000 },
    { month: 'Feb', budgeted: 78000, actual: 72000 },
    { month: 'Mar', budgeted: 90000, actual: 78000 },
  ]),
  buildDept('General', 500000, 60000, 140000, [
    { month: 'Oct', budgeted: 20000, actual: 18000 },
    { month: 'Nov', budgeted: 23000, actual: 22000 },
    { month: 'Dec', budgeted: 25000, actual: 28000 },
    { month: 'Jan', budgeted: 24000, actual: 25000 },
    { month: 'Feb', budgeted: 22000, actual: 20000 },
    { month: 'Mar', budgeted: 26000, actual: 27000 },
  ]),
];

// Legacy — kept for backwards compat
const mockCapex = mockCapexDepartments;

// ─── Module B: Workflow Config ───────────────────────────────────────────────
// Department-specific approval chains per tier
const mockWorkflowConfig = {
  default: {
    LOW:    [{ role: 'Department Manager', label: 'Department Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Department Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }],
    HIGH:   [{ role: 'Department Manager', label: 'Department Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }, { role: 'Admin', label: 'Executive Committee Approval' }],
  },
  'HR & Real Estate': {
    LOW:    [{ role: 'Department Manager', label: 'HR & Real Estate Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'HR & Real Estate Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }],
    HIGH:   [{ role: 'Department Manager', label: 'HR & Real Estate Manager Approval' }, { role: 'Finance', label: 'Finance Review & Approval' }, { role: 'Admin', label: 'Executive Committee Approval' }],
  },
  Aviation: {
    LOW:    [{ role: 'Department Manager', label: 'Aviation Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Aviation Manager Approval' }, { role: 'Admin', label: 'Aviation Director Sign-off' }],
    HIGH:   [{ role: 'Department Manager', label: 'Aviation Manager Approval' }, { role: 'Admin', label: 'Aviation Director Sign-off' }, { role: 'Finance', label: 'Finance & Executive Approval' }],
  },
  'Trading, Lubricants & Supply Chain': {
    LOW:    [{ role: 'Department Manager', label: 'Trading & Supply Chain Manager Approval' }],
    MEDIUM: [{ role: 'Department Manager', label: 'Trading & Supply Chain Manager Approval' }, { role: 'Finance', label: 'Finance Review' }],
    HIGH:   [{ role: 'Department Manager', label: 'Trading & Supply Chain Manager Approval' }, { role: 'Finance', label: 'Finance Review' }, { role: 'Admin', label: 'Commercial Director & Finance Committee' }],
  },
};

// ─── Module B: Document Store ─────────────────────────────────────────────────
const mockDocuments = [
  { id: 'DOC-001', prId: 'PR-2026-002', name: 'Generator_Quote_AlMaha.pdf',     type: 'Quote',     size: '245 KB', uploadedBy: 'Sara Al Harthi',   uploadedAt: '2026-02-14' },
  { id: 'DOC-002', prId: 'PR-2026-002', name: 'Generator_Quote_OmanPower.pdf',  type: 'Quote',     size: '189 KB', uploadedBy: 'Sara Al Harthi',   uploadedAt: '2026-02-14' },
  { id: 'DOC-003', prId: 'PR-2026-002', name: 'TechnicalScope_Generators.docx', type: 'Scope',     size: '78 KB',  uploadedBy: 'Sara Al Harthi',   uploadedAt: '2026-02-15' },
  { id: 'DOC-004', prId: 'PR-2026-003', name: 'TankReplacement_Quote1.pdf',     type: 'Quote',     size: '312 KB', uploadedBy: 'Khalid Al Rashdi', uploadedAt: '2026-03-01' },
  { id: 'DOC-005', prId: 'PR-2026-003', name: 'TankReplacement_Quote2.pdf',     type: 'Quote',     size: '298 KB', uploadedBy: 'Khalid Al Rashdi', uploadedAt: '2026-03-01' },
  { id: 'DOC-006', prId: 'PR-2026-003', name: 'TankReplacement_Quote3.pdf',     type: 'Quote',     size: '276 KB', uploadedBy: 'Khalid Al Rashdi', uploadedAt: '2026-03-01' },
  { id: 'DOC-007', prId: 'PR-2026-003', name: 'EngineeringAssessment.pdf',      type: 'Technical', size: '1.2 MB', uploadedBy: 'Khalid Al Rashdi', uploadedAt: '2026-03-02' },
  { id: 'DOC-008', prId: 'PR-2026-005', name: 'CCTV_Quote_SecureTech.pdf',      type: 'Quote',     size: '156 KB', uploadedBy: 'Rashid Al Ghafri', uploadedAt: '2026-01-22' },
  { id: 'DOC-009', prId: 'PR-2026-005', name: 'CCTV_Quote_AlNoor.pdf',          type: 'Quote',     size: '143 KB', uploadedBy: 'Rashid Al Ghafri', uploadedAt: '2026-01-22' },
  { id: 'DOC-010', prId: 'PR-2026-005', name: 'CCTV_Quote_VisionPro.pdf',       type: 'Quote',     size: '167 KB', uploadedBy: 'Rashid Al Ghafri', uploadedAt: '2026-01-22' },
];

// ─── Module B: Purchase Requests ────────────────────────────────────────────
const mockPurchaseRequests = [
  {
    id: 'PR-2026-001',
    title: 'Office Supplies Q1',
    description: 'Stationery and consumables for the admin department for Q1 2026.',
    requestorName: 'Ahmed Al Balushi',
    department: 'Admin',
    totalValue: 1500,
    tier: 'LOW',
    status: 'APPROVED',
    quoteCount: 3,
    requiresJustification: false,
    createdAt: '2026-01-10',
    approvalHistory: [
      { approver: 'Sara Al Harthi', decision: 'APPROVED', comment: 'Routine supplies, approved.', date: '2026-01-11' },
    ],
  },
  {
    id: 'PR-2026-002',
    title: 'Generator Maintenance Equipment',
    description: 'Spare parts and servicing tools for station backup generators across Muscat region.',
    requestorName: 'Sara Al Harthi',
    department: 'Operations',
    totalValue: 85000,
    tier: 'MEDIUM',
    status: 'PENDING_APPROVAL',
    quoteCount: 3,
    requiresJustification: false,
    createdAt: '2026-02-14',
    approvalHistory: [],
  },
  {
    id: 'PR-2026-003',
    title: 'Fuel Storage Tank Replacement',
    description: 'Full replacement of aged underground fuel storage tanks at Al Khuwair station.',
    requestorName: 'Khalid Al Rashdi',
    department: 'Retail',
    totalValue: 450000,
    tier: 'HIGH',
    status: 'PENDING_APPROVAL',
    quoteCount: 4,
    requiresJustification: false,
    createdAt: '2026-03-01',
    approvalHistory: [
      { approver: 'Ahmed Al Balushi', decision: 'APPROVED', comment: 'Dept manager approved. Escalating to Finance.', date: '2026-03-03' },
    ],
  },
  {
    id: 'PR-2026-004',
    title: 'IT Hardware Refresh',
    description: 'Replacement laptops and monitors for the IT team — end of lifecycle.',
    requestorName: 'Fatma Al Maamari',
    department: 'IT',
    totalValue: 22000,
    tier: 'LOW',
    status: 'DRAFT',
    quoteCount: 1,
    requiresJustification: true,
    createdAt: '2026-03-10',
    approvalHistory: [],
  },
  {
    id: 'PR-2026-005',
    title: 'CCTV Upgrade — Salalah Stations',
    description: 'Installation of HD CCTV cameras across 3 Salalah stations for QHSE compliance.',
    requestorName: 'Rashid Al Ghafri',
    department: 'QHSE',
    totalValue: 67500,
    tier: 'MEDIUM',
    status: 'APPROVED',
    quoteCount: 3,
    requiresJustification: false,
    createdAt: '2026-01-22',
    approvalHistory: [
      { approver: 'Sara Al Harthi', decision: 'APPROVED', comment: 'Budget available, QHSE priority.', date: '2026-01-25' },
      { approver: 'Admin User', decision: 'APPROVED', comment: 'Final approval granted.', date: '2026-01-27' },
    ],
  },
  {
    id: 'PR-2026-006',
    title: 'Fleet Vehicle Leasing — 5 Units',
    description: 'Annual lease for 5 field inspection vehicles for the infrastructure team.',
    requestorName: 'Maryam Al Lawati',
    department: 'Infrastructure',
    totalValue: 312000,
    tier: 'HIGH',
    status: 'REJECTED',
    quoteCount: 3,
    requiresJustification: false,
    createdAt: '2026-02-01',
    approvalHistory: [
      { approver: 'Sara Al Harthi', decision: 'REJECTED', comment: 'Budget freeze in effect for Q1. Resubmit in Q2.', date: '2026-02-05' },
    ],
  },
  {
    id: 'PR-2026-007',
    title: 'Safety Signage Rebranding',
    description: 'Replace all station safety and brand signage to new Shell global standard.',
    requestorName: 'Ahmed Al Balushi',
    department: 'Retail',
    totalValue: 18400,
    tier: 'LOW',
    status: 'APPROVED',
    quoteCount: 3,
    requiresJustification: false,
    createdAt: '2026-02-20',
    approvalHistory: [
      { approver: 'Sara Al Harthi', decision: 'APPROVED', comment: 'Approved — brand compliance requirement.', date: '2026-02-22' },
    ],
  },
  {
    id: 'PR-2026-008',
    title: 'Canopy Structural Inspection',
    description: 'Third-party structural inspection of canopies at 12 stations per regulatory schedule.',
    requestorName: 'Rashid Al Ghafri',
    department: 'QHSE',
    totalValue: 9800,
    tier: 'LOW',
    status: 'PENDING_APPROVAL',
    quoteCount: 2,
    requiresJustification: true,
    createdAt: '2026-03-12',
    approvalHistory: [],
  },
];

// ─── Module C: Real Estate Assets (RADP) ───────────────────────────────────
const mockAssets = [
  // ── Muscat Region ──────────────────────────────────────────────────────────
  { assetCode: 'MSQ-001-F01-GEN001', name: 'Standby Generator Unit 1',    region: 'Muscat',  site: 'Al Khuwair Station', facility: 'Main Forecourt',    equipmentType: 'Generator',  status: 'Active',      department: 'Operations' },
  { assetCode: 'MSQ-001-F01-DSP001', name: 'Fuel Dispenser Unit 1',       region: 'Muscat',  site: 'Al Khuwair Station', facility: 'Main Forecourt',    equipmentType: 'Dispenser',  status: 'Active',      department: 'Retail' },
  { assetCode: 'MSQ-001-F01-DSP002', name: 'Fuel Dispenser Unit 2',       region: 'Muscat',  site: 'Al Khuwair Station', facility: 'Main Forecourt',    equipmentType: 'Dispenser',  status: 'Maintenance', department: 'Retail' },
  { assetCode: 'MSQ-002-F02-HVC001', name: 'HVAC Unit — Convenience Store', region: 'Muscat', site: 'Qurum Station',      facility: 'Convenience Store', equipmentType: 'HVAC',       status: 'Active',      department: 'Facilities' },
  { assetCode: 'MSQ-002-F02-SEC001', name: 'CCTV Camera Array',           region: 'Muscat',  site: 'Qurum Station',      facility: 'Convenience Store', equipmentType: 'Security',   status: 'Active',      department: 'QHSE' },

  // ── Salalah Region ─────────────────────────────────────────────────────────
  { assetCode: 'SLL-003-F03-GEN001', name: 'Standby Generator',           region: 'Salalah', site: 'Salalah Main Station', facility: 'Forecourt',        equipmentType: 'Generator',  status: 'Active',      department: 'Operations' },
  { assetCode: 'SLL-003-F03-DSP001', name: 'Fuel Dispenser Unit 1',       region: 'Salalah', site: 'Salalah Main Station', facility: 'Forecourt',        equipmentType: 'Dispenser',  status: 'Active',      department: 'Retail' },
  { assetCode: 'SLL-003-F03-CNP001', name: 'Canopy Lighting Array',       region: 'Salalah', site: 'Salalah Main Station', facility: 'Forecourt',        equipmentType: 'Lighting',   status: 'Inactive',    department: 'Facilities' },
  { assetCode: 'SLL-003-F04-TRN001', name: 'Transformer Unit',            region: 'Salalah', site: 'Salalah Main Station', facility: 'Utility Room',     equipmentType: 'Electrical', status: 'Active',      department: 'Infrastructure' },

  // ── Sohar Region ───────────────────────────────────────────────────────────
  { assetCode: 'SHR-004-F05-DSP001', name: 'Fuel Dispenser Unit 1',       region: 'Sohar',   site: 'Sohar Industrial Station', facility: 'Main Forecourt', equipmentType: 'Dispenser', status: 'Active',     department: 'Retail' },
  { assetCode: 'SHR-004-F05-DSP002', name: 'Fuel Dispenser Unit 2',       region: 'Sohar',   site: 'Sohar Industrial Station', facility: 'Main Forecourt', equipmentType: 'Dispenser', status: 'Active',     department: 'Retail' },
  { assetCode: 'SHR-004-F05-PMP001', name: 'Submersible Pump Unit',       region: 'Sohar',   site: 'Sohar Industrial Station', facility: 'Tank Farm',      equipmentType: 'Pump',      status: 'Maintenance', department: 'Operations' },
];

// ── Utility Bills ─────────────────────────────────────────────────────────────
const mockUtilityBills = [
  // Al Khuwair Station (SITE-001)
  { id: 'UB-001', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2025-10', amount: 4800,  meterReading: 142300, unit: 'kWh' },
  { id: 'UB-002', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2025-11', amount: 5100,  meterReading: 147600, unit: 'kWh' },
  { id: 'UB-003', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2025-12', amount: 5400,  meterReading: 153200, unit: 'kWh' },
  { id: 'UB-004', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2026-01', amount: 5250,  meterReading: 158600, unit: 'kWh' },
  { id: 'UB-005', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2026-02', amount: 4950,  meterReading: 163700, unit: 'kWh' },
  { id: 'UB-006', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Electricity', period: '2026-03', amount: 5050,  meterReading: 168900, unit: 'kWh' },
  { id: 'UB-007', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2025-10', amount: 320,   meterReading: 8400,   unit: 'm³'  },
  { id: 'UB-008', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2025-11', amount: 295,   meterReading: 8710,   unit: 'm³'  },
  { id: 'UB-009', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2025-12', amount: 340,   meterReading: 9060,   unit: 'm³'  },
  { id: 'UB-010', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2026-01', amount: 310,   meterReading: 9380,   unit: 'm³'  },
  { id: 'UB-011', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2026-02', amount: 290,   meterReading: 9680,   unit: 'm³'  },
  { id: 'UB-012', siteId: 'SITE-001', siteName: 'Al Khuwair Station', utilityType: 'Water',       period: '2026-03', amount: 305,   meterReading: 9990,   unit: 'm³'  },

  // Salalah Main Station (SITE-003)
  { id: 'UB-013', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2025-10', amount: 3800,  meterReading: 98200,  unit: 'kWh' },
  { id: 'UB-014', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2025-11', amount: 4100,  meterReading: 102400, unit: 'kWh' },
  { id: 'UB-015', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2025-12', amount: 4400,  meterReading: 106900, unit: 'kWh' },
  { id: 'UB-016', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2026-01', amount: 4200,  meterReading: 111200, unit: 'kWh' },
  { id: 'UB-017', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2026-02', amount: 3950,  meterReading: 115300, unit: 'kWh' },
  { id: 'UB-018', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Electricity', period: '2026-03', amount: 4050,  meterReading: 119500, unit: 'kWh' },
  { id: 'UB-019', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2025-10', amount: 620,   meterReading: 21400,  unit: 'MJ'  },
  { id: 'UB-020', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2025-11', amount: 680,   meterReading: 22100,  unit: 'MJ'  },
  { id: 'UB-021', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2025-12', amount: 720,   meterReading: 22850,  unit: 'MJ'  },
  { id: 'UB-022', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2026-01', amount: 695,   meterReading: 23580,  unit: 'MJ'  },
  { id: 'UB-023', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2026-02', amount: 640,   meterReading: 24250,  unit: 'MJ'  },
  { id: 'UB-024', siteId: 'SITE-003', siteName: 'Salalah Main Station', utilityType: 'Gas',         period: '2026-03', amount: 660,   meterReading: 24940,  unit: 'MJ'  },

  // Sohar Industrial Station (SITE-004)
  { id: 'UB-025', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2025-10', amount: 6200,  meterReading: 201000, unit: 'kWh' },
  { id: 'UB-026', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2025-11', amount: 6500,  meterReading: 207600, unit: 'kWh' },
  { id: 'UB-027', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2025-12', amount: 6800,  meterReading: 214500, unit: 'kWh' },
  { id: 'UB-028', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2026-01', amount: 6600,  meterReading: 221200, unit: 'kWh' },
  { id: 'UB-029', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2026-02', amount: 6300,  meterReading: 227600, unit: 'kWh' },
  { id: 'UB-030', siteId: 'SITE-004', siteName: 'Sohar Industrial Station', utilityType: 'Electricity', period: '2026-03', amount: 6450,  meterReading: 234100, unit: 'kWh' },
];

// ── Compliance Alerts ─────────────────────────────────────────────────────────
const mockComplianceAlerts = [
  { alertId: 'ALT-001', assetCode: 'MSQ-001-F01-GEN001', type: 'Contract Expiry',  message: 'Maintenance contract for Standby Generator Unit 1 expires in 14 days. Renew to avoid service gap.', daysRemaining: 14, severity: 'HIGH' },
  { alertId: 'ALT-002', assetCode: 'SHR-004-F05-PMP001', type: 'SLA Breach',       message: 'Submersible Pump Unit has been under maintenance for 18 days — SLA threshold of 15 days exceeded.', daysRemaining: 0,  severity: 'CRITICAL' },
  { alertId: 'ALT-003', assetCode: 'SLL-003-F03-CNP001', type: 'Contract Expiry',  message: 'Canopy Lighting maintenance contract expires in 45 days. Schedule renewal with facilities team.', daysRemaining: 45, severity: 'MEDIUM' },
];

// ── Maintenance Work Orders ───────────────────────────────────────────────────
const mockMaintenanceOrders = [
  { id: 'WO-2026-001', assetCode: 'MSQ-001-F01-GEN001', assetName: 'Standby Generator Unit 1',    type: 'Planned',   description: 'Annual servicing and oil change',                               scheduledDate: '2026-03-25', completedDate: null,         status: 'Open',        priority: 'Medium',   technician: 'Ahmed Al Rashdi',    department: 'Operations', estimatedHours: 4, notes: '' },
  { id: 'WO-2026-002', assetCode: 'MSQ-001-F01-DSP002', assetName: 'Fuel Dispenser Unit 2',       type: 'Unplanned', description: 'Meter calibration failure — urgent repair required',             scheduledDate: '2026-03-18', completedDate: '2026-03-19', status: 'Completed',   priority: 'High',     technician: 'Mohammed Al Balushi', department: 'Retail',     estimatedHours: 2, notes: 'Replaced flow meter board' },
  { id: 'WO-2026-003', assetCode: 'SHR-004-F05-PMP001', assetName: 'Submersible Pump Unit',       type: 'Unplanned', description: 'Pump seal failure causing intermittent shutdown',               scheduledDate: '2026-03-01', completedDate: null,         status: 'In Progress', priority: 'Critical', technician: 'Khalid Al Siyabi',   department: 'Operations', estimatedHours: 8, notes: 'Awaiting seal kit from supplier' },
  { id: 'WO-2026-004', assetCode: 'SLL-003-F03-CNP001', assetName: 'Canopy Lighting Array',       type: 'Planned',   description: 'Replace 12 LED fixtures as part of scheduled upgrade',          scheduledDate: '2026-04-05', completedDate: null,         status: 'Open',        priority: 'Low',      technician: 'Salim Al Harthi',    department: 'Facilities', estimatedHours: 6, notes: '' },
  { id: 'WO-2026-005', assetCode: 'MSQ-002-F02-HVC001', assetName: 'HVAC Unit — Convenience Store', type: 'Planned', description: 'Quarterly filter cleaning and refrigerant check',              scheduledDate: '2026-03-28', completedDate: null,         status: 'Open',        priority: 'Medium',   technician: 'Ibrahim Al Amri',    department: 'Facilities', estimatedHours: 3, notes: '' },
  { id: 'WO-2026-006', assetCode: 'SLL-003-F04-TRN001', assetName: 'Transformer Unit',             type: 'Planned',   description: 'Bi-annual thermal imaging and connection torque check',          scheduledDate: '2026-04-12', completedDate: null,         status: 'Open',        priority: 'High',     technician: 'Ahmed Al Rashdi',    department: 'Infrastructure', estimatedHours: 5, notes: '' },
];

// ─── Module D: Intra Portal ─────────────────────────────────────────────────
const mockApps = [
  { id: 'APP-001', name: 'SAP',            description: 'Enterprise resource planning — financials, procurement, and operations.', icon: '🏢', category: 'Enterprise',     url: '#', ssoEnabled: true,  allowedRoles: ['Admin', 'Finance', 'Manager'] },
  { id: 'APP-002', name: 'Leave Portal',   description: 'Apply for annual, sick, or emergency leave and track your balance.',      icon: '🗓️', category: 'HR',             url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-003', name: 'QHSE Portal',   description: 'Report incidents, manage safety audits, and track QHSE KPIs.',            icon: '🦺', category: 'QHSE',           url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-004', name: 'IT Helpdesk',   description: 'Raise IT support tickets and track resolution status.',                    icon: '🖥️', category: 'IT',             url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-005', name: 'Procurement',   description: 'Manage purchase requests, vendor quotes, and procurement workflows.',      icon: '🛒', category: 'Procurement',    url: '#', ssoEnabled: true,  allowedRoles: ['Admin', 'Finance', 'Manager'] },
  { id: 'APP-006', name: 'Finance Reports',description: 'Access monthly P&L, budget variance reports, and financial dashboards.', icon: '📊', category: 'Finance',        url: '#', ssoEnabled: true,  allowedRoles: ['Admin', 'Finance'] },
  { id: 'APP-007', name: 'HR Portal',     description: 'Employee directory, payslips, performance reviews, and onboarding.',      icon: '👥', category: 'HR',             url: '#', ssoEnabled: true,  allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-008', name: 'Training Portal',description: 'Browse and enrol in mandatory and elective training courses.',           icon: '🎓', category: 'HR',             url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-009', name: 'Asset Manager', description: 'Track real estate assets, utility bills, and compliance schedules.',      icon: '🏗️', category: 'Operations',    url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Finance', 'Manager'] },
  { id: 'APP-010', name: 'Project Tracker',description: 'Monitor project milestones, resource allocation, and delivery status.',  icon: '📋', category: 'Operations',    url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Finance', 'Manager'] },
  { id: 'APP-011', name: 'Document Hub',  description: 'Central repository for policies, procedures, and corporate documents.',   icon: '📁', category: 'Administration', url: '#', ssoEnabled: false, allowedRoles: ['Admin', 'Manager', 'Finance', 'Employee'] },
  { id: 'APP-012', name: 'Admin Console', description: 'User management, system configuration, and access control settings.',     icon: '⚙️', category: 'Administration', url: '#', ssoEnabled: false, allowedRoles: ['Admin'] },
];

const mockKnowledgeBase = [
  { id: 'KB-001', title: 'How to Raise a Purchase Request',   category: 'Procedure', version: '2.1', lastUpdated: '2026-01-15', description: 'Step-by-step guide to creating, submitting, and tracking a purchase request through the approval workflow.',                tags: ['purchase', 'procurement', 'approval', 'workflow', 'request'] },
  { id: 'KB-002', title: 'Capex Budget Approval Policy',       category: 'Policy',    version: '3.0', lastUpdated: '2025-11-01', description: 'Defines approval tiers, authority limits, and escalation paths for capital expenditure requests.',                        tags: ['capex', 'budget', 'approval', 'policy', 'finance'] },
  { id: 'KB-003', title: 'Asset Registration Guidelines',      category: 'Procedure', version: '1.4', lastUpdated: '2025-12-10', description: 'Instructions for registering new physical assets in RADP, including tagging standards and categorisation rules.',          tags: ['asset', 'registration', 'radp', 'tagging', 'equipment'] },
  { id: 'KB-004', title: 'Incident Reporting Procedure',       category: 'QHSE',      version: '4.2', lastUpdated: '2026-02-03', description: 'Mandatory procedure for reporting workplace incidents, near-misses, and environmental events within 24 hours.',             tags: ['incident', 'safety', 'reporting', 'near-miss', 'QHSE'] },
  { id: 'KB-005', title: 'Annual Leave Policy',                category: 'HR',        version: '2.0', lastUpdated: '2026-01-01', description: 'Outlines annual leave entitlements, approval process, carry-forward rules, and blackout periods.',                         tags: ['leave', 'holiday', 'HR', 'policy', 'entitlement'] },
  { id: 'KB-006', title: 'IT Security & Acceptable Use Policy',category: 'Policy',    version: '5.1', lastUpdated: '2025-10-20', description: 'Governs acceptable use of company IT systems, password standards, and data classification requirements.',                    tags: ['IT', 'security', 'password', 'data', 'acceptable use'] },
  { id: 'KB-007', title: 'Health & Safety Induction Checklist',category: 'QHSE',      version: '1.1', lastUpdated: '2026-02-28', description: 'Checklist for new employee and contractor site inductions covering emergency procedures and PPE requirements.',              tags: ['safety', 'induction', 'PPE', 'checklist', 'onboarding'] },
  { id: 'KB-008', title: 'Vendor Onboarding Procedure',        category: 'Procedure', version: '1.3', lastUpdated: '2025-09-15', description: 'Process for registering new vendors, obtaining required documentation, and setting up in the procurement system.',            tags: ['vendor', 'supplier', 'onboarding', 'procurement', 'registration'] },
];

// ── KB Version History ────────────────────────────────────────────────────────
const mockDocVersions = {
  'KB-001': [
    { version: '2.1', updatedAt: '2026-01-15', updatedBy: 'Fatima Al Said',      changelog: 'Updated section 4 to reflect the new 3-quote approval workflow.' },
    { version: '2.0', updatedAt: '2025-09-01', updatedBy: 'Fatima Al Said',      changelog: 'Major revision — added digital submission steps and removed paper form references.' },
    { version: '1.2', updatedAt: '2025-03-12', updatedBy: 'Ahmed Al Balushi',    changelog: 'Minor corrections to form references and approver contact details.' },
  ],
  'KB-002': [
    { version: '3.0', updatedAt: '2025-11-01', updatedBy: 'Mohammed Al Rashdi',  changelog: 'Raised HIGH tier threshold from OMR 200k to OMR 300k per updated authority matrix.' },
    { version: '2.1', updatedAt: '2024-06-15', updatedBy: 'Mohammed Al Rashdi',  changelog: 'Added mandatory QHSE sign-off for HIGH tier capex requests.' },
    { version: '2.0', updatedAt: '2023-12-01', updatedBy: 'Sara Al Farsi',       changelog: 'Introduced tiered approval framework — LOW / MEDIUM / HIGH.' },
  ],
  'KB-003': [
    { version: '1.4', updatedAt: '2025-12-10', updatedBy: 'Khalid Al Siyabi',    changelog: 'Added equipment type code table (GEN/DSP/HVC/PMP etc.) to appendix.' },
    { version: '1.3', updatedAt: '2025-07-20', updatedBy: 'Khalid Al Siyabi',    changelog: 'Corrected asset code format — facility segment changed from 2 to 3 chars.' },
  ],
  'KB-004': [
    { version: '4.2', updatedAt: '2026-02-03', updatedBy: 'Nadia Al Harthy',     changelog: 'Added section on environmental near-miss reporting; updated escalation contacts.' },
    { version: '4.1', updatedAt: '2025-08-14', updatedBy: 'Nadia Al Harthy',     changelog: 'Revised 24-hour reporting SLA to include digital submission channel.' },
    { version: '4.0', updatedAt: '2024-11-01', updatedBy: 'Ali Al Zadjali',      changelog: 'Full rewrite to align with Shell Group HSSE standards 2024 update.' },
  ],
  'KB-005': [
    { version: '2.0', updatedAt: '2026-01-01', updatedBy: 'HR Department',       changelog: 'Updated carry-forward cap to 15 days; added emergency leave category.' },
    { version: '1.1', updatedAt: '2024-07-01', updatedBy: 'HR Department',       changelog: 'Minor edits — updated public holiday list for 2024.' },
  ],
  'KB-006': [
    { version: '5.1', updatedAt: '2025-10-20', updatedBy: 'IT Security Team',    changelog: 'Added AI tool usage guidelines and data residency requirements.' },
    { version: '5.0', updatedAt: '2025-01-10', updatedBy: 'IT Security Team',    changelog: 'Major update for NCA compliance — new password complexity requirements.' },
    { version: '4.2', updatedAt: '2023-09-01', updatedBy: 'IT Security Team',    changelog: 'Added MFA mandate for remote access connections.' },
  ],
  'KB-007': [
    { version: '1.1', updatedAt: '2026-02-28', updatedBy: 'QHSE Department',     changelog: 'Added fire assembly point locations for new Sohar station.' },
    { version: '1.0', updatedAt: '2025-01-15', updatedBy: 'QHSE Department',     changelog: 'Initial release — replaces paper-based induction checklist.' },
  ],
  'KB-008': [
    { version: '1.3', updatedAt: '2025-09-15', updatedBy: 'Procurement Team',    changelog: 'Added mandatory Omanisation documentation requirements.' },
    { version: '1.2', updatedAt: '2024-12-01', updatedBy: 'Procurement Team',    changelog: 'Aligned with updated SAP vendor master data fields.' },
    { version: '1.1', updatedAt: '2024-06-01', updatedBy: 'Procurement Team',    changelog: 'Added QHSE pre-qualification criteria for high-risk vendor categories.' },
  ],
};

// ─── Module A: Capex Initiations ────────────────────────────────────────────
const mockCapexInitiations = [
  {
    id: 'CINIT-2026-001',
    title: 'Solar Panel Installation — Al Khuwair Station',
    description: 'Installation of 200 solar panels to reduce electricity consumption by 40% at Al Khuwair Station.',
    department: 'Infrastructure',
    initiator: 'Khalid Al Rashdi',
    projectType: 'New',
    estimatedBudget: 320000,
    priority: 'High',
    status: 'Under Review',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    stakeholders: 'Infrastructure Team, Finance, QHSE',
    justification: 'Aligns with Shell sustainability targets and reduces OPEX by approximately OMR 85,000 annually.',
    createdAt: '2026-03-01',
  },
  {
    id: 'CINIT-2026-002',
    title: 'EV Charging Hub — Qurum Station',
    description: 'Installation of 8 EV charging points to support the growing EV market in Oman.',
    department: 'Retail Operations',
    initiator: 'Ahmed Al Balushi',
    projectType: 'New',
    estimatedBudget: 180000,
    priority: 'Medium',
    status: 'Approved',
    startDate: '2026-04-15',
    endDate: '2026-09-30',
    stakeholders: 'Retail Operations, Technology, Finance',
    justification: 'Strategic investment to capture EV market share ahead of competitor installations.',
    createdAt: '2026-02-15',
  },
  {
    id: 'CINIT-2026-003',
    title: 'CCTV Network Upgrade — All Muscat Stations',
    description: 'Replace legacy analog CCTV with IP-based HD cameras across all 8 Muscat stations.',
    department: 'QHSE',
    initiator: 'Rashid Al Ghafri',
    projectType: 'Replacement',
    estimatedBudget: 95000,
    priority: 'High',
    status: 'Pending Approval',
    startDate: '2026-05-01',
    endDate: '2026-07-31',
    stakeholders: 'QHSE, IT, Operations',
    justification: 'Existing systems are end-of-life. Regulatory audit flagged CCTV coverage gaps across Muscat stations.',
    createdAt: '2026-03-10',
  },
];

// ─── Module A: Capex Manual Entries ─────────────────────────────────────────
const mockManualEntries = [
  {
    id: 'ME-2026-001',
    entryType: 'Actual',
    department: 'Retail Operations',
    period: '2026-03',
    amount: 15400,
    description: 'Signage replacement at Nizwa Road station — vendor invoice #INV-4421',
    referenceNumber: 'INV-4421',
    enteredBy: 'Sara Al Harthi',
    enteredAt: '2026-03-15',
    status: 'Posted',
  },
  {
    id: 'ME-2026-002',
    entryType: 'PO Commitment',
    department: 'Technology',
    period: '2026-03',
    amount: 42000,
    description: 'Network infrastructure upgrade — PO raised for Cisco switches',
    referenceNumber: 'PO-2026-0312',
    enteredBy: 'Fatma Al Maamari',
    enteredAt: '2026-03-12',
    status: 'Posted',
  },
  {
    id: 'ME-2026-003',
    entryType: 'Budget Adjustment',
    department: 'QHSE',
    period: '2026-02',
    amount: 25000,
    description: 'Emergency budget reallocation for fire suppression system maintenance',
    referenceNumber: 'BA-2026-004',
    enteredBy: 'Admin User',
    enteredAt: '2026-02-28',
    status: 'Posted',
  },
];

// ─── Module A: GSAP Sync Data ────────────────────────────────────────────────
const mockGsapData = {
  lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'success',
  source: 'GSAP',
  approvedBudgets: [
    { wbsCode: 'WBS-OM-2026-RET-001', description: 'Retail Ops — Station Refurbishment Programme', department: 'Retail Operations', approvedAmount: 1200000, postedAmount: 680000 },
    { wbsCode: 'WBS-OM-2026-INF-001', description: 'Infrastructure — Pipeline Integrity Works', department: 'Infrastructure', approvedAmount: 1500000, postedAmount: 920000 },
    { wbsCode: 'WBS-OM-2026-TEC-001', description: 'Technology — Digital Transformation Phase 2', department: 'Technology', approvedAmount: 900000, postedAmount: 190000 },
    { wbsCode: 'WBS-OM-2026-QHS-001', description: 'QHSE — HSE Compliance & Audit Readiness', department: 'QHSE', approvedAmount: 600000, postedAmount: 80000 },
  ],
  poCommitments: [
    { poNumber: 'PO-4500012344', vendor: 'Oman Construction Co.', wbsCode: 'WBS-OM-2026-INF-001', description: 'Pipeline inspection services — Q1 2026', amount: 95000, status: 'Open', dueDate: '2026-04-30' },
    { poNumber: 'PO-4500012298', vendor: 'Al Maha Technology LLC', wbsCode: 'WBS-OM-2026-TEC-001', description: 'Server hardware procurement', amount: 60000, status: 'Open', dueDate: '2026-03-31' },
    { poNumber: 'PO-4500012187', vendor: 'Shell Retail Contractors LLC', wbsCode: 'WBS-OM-2026-RET-001', description: 'Station canopy refurbishment — 3 sites', amount: 180000, status: 'Partially Delivered', dueDate: '2026-05-15' },
  ],
  grirActuals: [
    { grNumber: 'GR-5000043211', poNumber: 'PO-4500012187', wbsCode: 'WBS-OM-2026-RET-001', description: 'GR — canopy works partial completion', amount: 85000, postingDate: '2026-03-05' },
    { grNumber: 'GR-5000043108', poNumber: 'PO-4500012344', wbsCode: 'WBS-OM-2026-INF-001', description: 'GR — pipeline inspection services Phase 1', amount: 48000, postingDate: '2026-02-28' },
    { grNumber: 'GR-5000042990', poNumber: 'PO-4500012298', wbsCode: 'WBS-OM-2026-TEC-001', description: 'GR — server hardware delivery', amount: 55000, postingDate: '2026-02-15' },
  ],
};

// ─── Users ──────────────────────────────────────────────────────────────────
const mockUsers = [
  { id: 'USR-001', name: 'Admin User', email: 'admin@shelloman.com', role: 'Admin', department: 'IT' },
  { id: 'USR-002', name: 'Ahmed Al Balushi', email: 'ahmed@shelloman.com', role: 'Department Manager', department: 'Retail' },
  { id: 'USR-003', name: 'Sara Al Harthi', email: 'sara@shelloman.com', role: 'Finance', department: 'Finance' },
  { id: 'USR-004', name: 'Fatma Al Maamari', email: 'fatma@shelloman.com', role: 'Standard Employee', department: 'IT' },
];

module.exports = { mockCapex, mockCapexDepartments, mockCapexInitiations, mockManualEntries, mockGsapData, mockWorkflowConfig, mockDocuments, mockPurchaseRequests, mockAssets, mockUtilityBills, mockComplianceAlerts, mockMaintenanceOrders, mockApps, mockKnowledgeBase, mockDocVersions, mockUsers };
