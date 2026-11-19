import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfill window.scrollTo in JSDOM
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}

afterEach(() => {
  cleanup();
});
