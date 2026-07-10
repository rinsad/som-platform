import * as Select from '@radix-ui/react-select';
import './SelectField.css';

// Drop-in replacement for a native <select> with short, fixed option lists.
// Renders a fully brand-styled listbox (via Radix) instead of the OS dropdown.
//
//   <SelectField value={x} onChange={setX} options={['A', 'B']} style={s.fieldInput} />
//
// `options` accepts plain strings or { value, label } objects. `onChange`
// receives the selected value string — same shape the old `e.target.value`
// handlers expected. Pass the same `style` you used on sibling inputs so the
// closed trigger matches the surrounding form. An empty-string `value` shows
// the `placeholder` (Radix items themselves must have non-empty values).
function normalize(options) {
  return options.map((o) =>
    o !== null && typeof o === 'object'
      ? { value: String(o.value), label: o.label ?? String(o.value) }
      : { value: String(o), label: String(o) }
  );
}

export default function SelectField({
  value,
  onChange,
  options,
  style,
  id,
  name,
  required = false,
  placeholder = 'Select…',
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const opts = normalize(options);
  // Always pass a defined string so Radix stays controlled for the component's
  // whole lifetime. Empty string = no selection (Radix shows the placeholder).
  // Passing `undefined` for empty and a string otherwise would flip Radix
  // between uncontrolled and controlled, which crashes on the transition.
  const selectedValue = value == null ? '' : String(value);

  return (
    <Select.Root
      value={selectedValue}
      onValueChange={onChange}
      disabled={disabled}
      name={name}
      required={required}
    >
      <Select.Trigger
        id={id}
        className="som-select-trigger"
        aria-label={ariaLabel}
        style={{ ...style, ...triggerLayout }}
      >
        <span className="som-select-value">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon className="som-select-chevron">
          <Chevron />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="som-select-content" position="popper" sideOffset={6}>
          <Select.ScrollUpButton className="som-select-scroll">▲</Select.ScrollUpButton>
          <Select.Viewport>
            {opts.map((o) => (
              <Select.Item key={o.value} value={o.value} className="som-select-item">
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator className="som-select-check">
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="som-select-scroll">▼</Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Applied after the caller's `style` so the trigger stays a flex row even when
// the form's input style sets `display: block`.
const triggerLayout = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
};
