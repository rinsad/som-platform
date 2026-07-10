import { useRef, useEffect } from 'react';
import './Checkbox.css';

// Drop-in replacement for a native checkbox. Keeps a real (visually hidden)
// <input type="checkbox"> for accessibility, focus and label semantics, and
// renders a brand-styled box beside it. `onChange` receives the boolean checked
// state (not an event). Pass `label` (or children) for the text; pass `style`
// to tweak the wrapping <label> (e.g. a fixed-width matrix cell).
export default function Checkbox({
  checked = false,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  children,
  id,
  style,
  'aria-label': ariaLabel,
}) {
  const ref = useRef(null);

  // `indeterminate` is a DOM property, not an attribute — set it via ref.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const content = label ?? children;

  // The check/dash marks are always rendered; their visibility (and the box
  // fill) is driven by the native input's :checked / :indeterminate state in
  // CSS, so the box updates the instant you click — without waiting for React
  // to re-render the (large) parent.
  return (
    <label className={'som-checkbox' + (disabled ? ' som-checkbox--disabled' : '')} style={style}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className="som-checkbox-input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="som-checkbox-box" aria-hidden="true">
        <svg className="som-checkbox-check" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="som-checkbox-dash" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M6 12h12" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </span>
      {content != null && content !== '' && <span className="som-checkbox-label">{content}</span>}
    </label>
  );
}
