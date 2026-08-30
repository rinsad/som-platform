import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import DateField from './DateField';

describe('DateField', () => {
  test('supports domain styling and an accessible label while retaining ISO values', () => {
    const onChange = vi.fn();
    render(<DateField value="2026-07-20" onChange={onChange} className="domain-date" aria-label="Board approval date" />);

    const trigger = screen.getByRole('button', { name: 'Board approval date' });
    expect(trigger).toHaveClass('domain-date');
    expect(trigger).toHaveTextContent('20/07/2026');
    fireEvent.keyDown(trigger, { key: 'Delete' });
    expect(onChange).toHaveBeenCalledWith('');
  });
});
