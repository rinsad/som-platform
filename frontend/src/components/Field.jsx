// Shared labeled field: renders a label above its control (input/select/etc.).
// Pass `full` to span all columns in a grid. Style controls with `fieldInputStyle`
// from ./fieldStyles.
export default function Field({ label, full, children }) {
  return (
    <div style={{ ...s.wrap, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' },
};
