import { render, screen } from '@testing-library/react';
import SelectField from './SelectField';

describe('SelectField', () => {
  test('shows placeholder when value is empty', () => {
    render(<SelectField value="" onChange={() => {}} options={['A', 'B']} placeholder="Pick one…" aria-label="x" />);
    expect(screen.getByText('Pick one…')).toBeInTheDocument();
  });

  test('stays controlled when value goes empty -> set (no uncontrolled/controlled warning)', () => {
    // This is the bug that blanked the page: an empty select becoming set
    // flipped Radix from uncontrolled to controlled and crashed in the browser.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const props = { onChange: () => {}, options: ['Not required', 'Pending', 'Completed'], 'aria-label': 'status' };

    const { rerender } = render(<SelectField value="" {...props} />);
    rerender(<SelectField value="Pending" {...props} />);
    rerender(<SelectField value="" {...props} />);

    const warned = errSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === 'string' && /uncontrolled|controlled/i.test(a))
    );
    errSpy.mockRestore();
    expect(warned).toBe(false);
  });
});
