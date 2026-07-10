// Shared status/tag pill. Consistent shape (pill radius, border, padding,
// weight) everywhere a status/tier/role/priority chip appears.
//
//   <Badge status="Approved" />                 — tone looked up from status text
//   <Badge status="Admin" tone="danger" />       — explicit tone override
//   <Badge tone="info">{`${tier} — up to OMR 25,000`}</Badge>  — custom label, explicit tone
const TONES = {
  success: { bg: 'var(--success-bg)', color: 'var(--success)',  border: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: 'var(--danger)' },
  info:    { bg: 'var(--info-bg)',    color: 'var(--info)',     border: 'var(--info)' },
  neutral: { bg: 'var(--neutral-bg)', color: 'var(--neutral-text)', border: 'var(--gray-200)' },
};

// Default text -> tone mapping, merged from every status/tier/priority
// vocabulary in the app. Case variants (e.g. tier codes are upper-cased)
// are included explicitly rather than normalized, so a literal label always
// maps predictably.
const STATUS_TONE = {
  // success
  Posted: 'success', Approved: 'success', APPROVED: 'success', Completed: 'success', Complete: 'success',
  Signed: 'success', Low: 'success', LOW: 'success', Green: 'success', Active: 'success',
  // warning
  'Under Review': 'warning', 'Pending Approval': 'warning', PENDING_APPROVAL: 'warning', Pending: 'warning',
  Medium: 'warning', MEDIUM: 'warning', Amber: 'warning', 'Returned for correction': 'warning',
  Maintenance: 'warning', 'In Progress': 'warning',
  // danger
  High: 'danger', HIGH: 'danger', Red: 'danger', Rejected: 'danger', REJECTED: 'danger', Critical: 'danger',
  // info
  'Partially Delivered': 'info', Open: 'info',
  // neutral
  Draft: 'neutral', DRAFT: 'neutral', Superseded: 'neutral', Inactive: 'neutral',
};

export default function Badge({ status, tone, children, style }) {
  const text = children ?? status;
  const resolvedTone = tone || STATUS_TONE[status] || 'neutral';
  const t = TONES[resolvedTone] || TONES.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </span>
  );
}
