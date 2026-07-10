import { useEffect, useId } from 'react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'var(--shell-red)',
  onConfirm,
  onCancel,
  busy = false,
}) {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      style={s.overlay}
      onClick={(event) => event.target === event.currentTarget && !busy && onCancel()}
    >
      <div
        style={s.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} style={s.title}>{title}</h2>
        <p id={messageId} style={s.message}>{message}</p>
        <div style={s.actions}>
          <button type="button" style={s.cancelButton} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button"
            style={{ ...s.confirmButton, background: confirmColor }}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 900,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  dialog: {
    background: '#fff',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-xs)', padding: '28px 28px 20px',
    maxWidth: '380px', width: '100%',
    boxShadow: 'var(--shadow-xl)',
  },
  title: {
    fontSize: '17px', fontWeight: '800', color: 'var(--label)', margin: '0 0 10px',
  },
  message: {
    fontSize: '13px', color: 'var(--gray-500)', margin: '0 0 20px', lineHeight: 1.5,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelButton: {
    padding: '8px 18px', borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--gray-300)',
    background: '#fff', color: 'var(--gray-700)',
    fontSize: '13px', fontWeight: '800', cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 18px', borderRadius: 'var(--radius-xs)',
    border: 'none', color: '#fff',
    fontSize: '13px', fontWeight: '800', cursor: 'pointer',
  },
};
