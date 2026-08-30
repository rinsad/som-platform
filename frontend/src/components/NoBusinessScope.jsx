import { readUserScope } from '../utils/userScope';

// Shown when a business-scoped user has no Business / Function assigned.
//
// Scoping fails closed, so such a user sees an empty list — which is
// indistinguishable from "nothing to do" and reads as a broken page. This says
// what actually happened and who can fix it.
export default function NoBusinessScope({ subject = 'requests' }) {
  const { isPortfolioScope, businessFunctionId } = readUserScope();
  if (isPortfolioScope || businessFunctionId) return null;

  return (
    <div style={s.wrap} role="status">
      <div style={s.title}>No Business / Function assigned</div>
      <p style={s.body}>
        Your account is not attached to a business, so CAPEX and purchase {subject} are hidden.
        Ask an administrator to set your Business / Function in User Management.
      </p>
    </div>
  );
}

const s = {
  wrap: {
    border: '1px solid var(--accent-amber-line, var(--separator))',
    background: 'var(--accent-amber-bg, var(--gray-50))',
    borderRadius: 'var(--radius-xs)',
    padding: '16px 18px',
    margin: '12px 0',
    maxWidth: '620px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--label)',
    marginBottom: '6px',
  },
  body: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.5,
    color: 'var(--label-secondary, var(--gray-700))',
  },
};
