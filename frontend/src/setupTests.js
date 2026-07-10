import '@testing-library/jest-dom';

// Vitest exposes `vi` — alias to `jest` for Jest-style test syntax
global.jest = vi;

// jsdom lacks the pointer-capture / scroll / observer APIs that Radix
// primitives (e.g. Select) call. Stub them so those components can open in
// tests. See https://github.com/radix-ui/primitives/issues/1822.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture ??= () => false;
  window.HTMLElement.prototype.releasePointerCapture ??= () => {};
  window.HTMLElement.prototype.setPointerCapture ??= () => {};
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  global.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
