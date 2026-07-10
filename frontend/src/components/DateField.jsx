import { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { enGB } from 'date-fns/locale';
import 'react-day-picker/style.css';
import './DateField.css';

// Drop-in replacement for <input type="date">. Value in/out is an ISO
// `YYYY-MM-DD` string (what the backend and Postgres expect); the visible
// trigger shows the date in en-GB `dd/MM/yyyy`. onChange receives the string
// directly (empty string when cleared). Pass the same `style` object you use
// on sibling inputs so it matches the surrounding form.
const WIRE_FMT = 'yyyy-MM-dd';
const DISPLAY_FMT = 'dd/MM/yyyy';

// Parse the wire value as a *local* date (avoids the UTC shift you get from
// `new Date('2026-07-10')`).
function parseWire(value) {
  if (!value) return undefined;
  const d = parse(value, WIRE_FMT, new Date());
  return isValid(d) ? d : undefined;
}

export default function DateField({
  value,
  onChange,
  style,
  id,
  placeholder = 'Select date…',
  disabled = false,
  clearable = true,
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = parseWire(value);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const toggle = () => {
    if (disabled) return;
    // Flip upward when there isn't room below (common for fields low in a modal).
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 360 && rect.top > 360);
    }
    setOpen((o) => !o);
  };

  const handleSelect = (date) => {
    onChange(date ? format(date, WIRE_FMT) : '');
    close();
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const label = selected ? format(selected, DISPLAY_FMT) : placeholder;

  return (
    <div ref={wrapRef} style={s.wrap}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ ...s.triggerBase, ...style, ...s.triggerLayout, ...(disabled ? s.disabled : null) }}
      >
        <span style={selected ? s.value : s.placeholder}>{label}</span>
        <span style={s.icons}>
          {clearable && selected && !disabled && (
            <span role="button" tabIndex={-1} aria-label="Clear date" onClick={clear} style={s.clear}>×</span>
          )}
          <CalendarIcon />
        </span>
      </button>

      {open && (
        <div style={{ ...s.popover, ...(dropUp ? s.popoverUp : s.popoverDown) }} role="dialog">
          <DayPicker
            className="som-datefield-calendar"
            mode="single"
            locale={enGB}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected}
            onSelect={handleSelect}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2100, 11)}
          />
        </div>
      )}
    </div>
  );
}

// Small inline calendar glyph — crisper and OS-consistent vs. an emoji.
function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--label-tertiary)' }}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const s = {
  wrap: { position: 'relative', width: '100%' },
  triggerBase: { textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' },
  // Applied AFTER the caller's `style` so the row layout can't be overridden by
  // an inherited `display: block` / `text-align` on the form's input style.
  triggerLayout: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%',
  },
  disabled: { cursor: 'not-allowed', opacity: 0.6 },
  value: { color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  placeholder: { color: 'var(--label-quaternary)' },
  icons: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  clear: {
    cursor: 'pointer', color: 'var(--label-tertiary)', fontSize: 16, lineHeight: 1,
    padding: '0 2px',
  },
  popover: {
    position: 'absolute', left: 0, zIndex: 1100,
    background: 'var(--surface)', border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(16,24,40,0.24)',
  },
  popoverDown: { top: 'calc(100% + 6px)' },
  popoverUp: { bottom: 'calc(100% + 6px)' },
};
