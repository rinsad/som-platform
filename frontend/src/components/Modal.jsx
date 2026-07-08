// Shared modal: backdrop + centered card with header (title/subtitle + close) and body.
// Click the backdrop or the × to dismiss. Render the footer/actions as children.
// `maxWidth` (default 560) widens the card for larger forms.
export default function Modal({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={{ ...s.card, maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={s.head}>
          <div>
            <h3 style={s.title}>{title}</h3>
            {subtitle && <p style={s.subtitle}>{subtitle}</p>}
          </div>
          <button style={s.close} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div style={s.body}>{children}</div>
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '64px 20px', zIndex: 1000, overflowY: 'auto',
  },
  card: {
    background: '#FFFFFF', border: '1px solid #ECEEF1', borderRadius: 16,
    width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(16,24,40,0.24)',
  },
  head: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 12, padding: '18px 22px', borderBottom: '1px solid #F1F2F4',
  },
  title: { fontSize: 17, fontWeight: 800, color: '#1A2233', margin: 0 },
  subtitle: { fontSize: 13, color: '#98A0AC', margin: '4px 0 0', fontWeight: 500 },
  close: {
    width: 32, height: 32, borderRadius: 8, border: '1px solid #E0E3E8',
    background: '#FFFFFF', color: '#6B7280', fontSize: 20, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body: { padding: '20px 22px' },
};
