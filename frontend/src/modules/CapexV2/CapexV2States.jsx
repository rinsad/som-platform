export function CapexV2Loading({ lines = 5 }) {
  return (
    <div className="capex-v2-loading" aria-label="Loading CAPEX workspace" aria-busy="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} style={{ '--skeleton-width': `${92 - index * 7}%` }} />
      ))}
    </div>
  );
}

export function CapexV2Error({ error, onRetry }) {
  return (
    <div className="capex-v2-message capex-v2-message--error" role="alert">
      <div>
        <strong>CAPEX v2 could not load this workspace</strong>
        <p>{error?.message || 'An unexpected error occurred.'}</p>
      </div>
      {onRetry && <button type="button" className="capex-v2-btn capex-v2-btn--secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function CapexV2Empty({ title, description, action }) {
  return (
    <div className="capex-v2-empty">
      <span className="capex-v2-empty__rule" />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status, urgent = false }) {
  if (urgent) return <span className="capex-v2-badge capex-v2-badge--danger">Urgent</span>;
  const normalized = String(status || 'DRAFT').toUpperCase();
  const tone = ['APPROVED', 'POSTED', 'COMPLETED', 'OPEN', 'ACTIVE', 'VALIDATED'].includes(normalized)
    ? 'success'
    : ['RETURNED', 'REJECTED', 'INVALID', 'BLOCKED'].includes(normalized)
      ? 'danger'
      : ['IN_REVIEW', 'PENDING', 'PENDING_APPROVAL', 'STAGED'].includes(normalized)
        ? 'warning'
        : 'neutral';
  return <span className={`capex-v2-badge capex-v2-badge--${tone}`}>{normalized.replaceAll('_', ' ')}</span>;
}
