import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { findUnmatchedPageFields } from '../utils/matcher';

describe('findUnmatchedPageFields', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
    });

    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).CSS = dom.window.CSS;

    Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetParent', {
      get() {
        return this.style.display === 'none' ? null : dom.window.document.body;
      },
      configurable: true,
    });

    dom.window.HTMLElement.prototype.getClientRects = () => [
      { x: 0, y: 0, width: 1, height: 1 } as DOMRect,
    ] as any;
  });

  afterEach(() => {
    dom.window.close();
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).CSS;
  });

  it('reports every visible unmatched page field', () => {
    document.body.innerHTML = `
      <label>First Name<input type="text" name="firstName"></label>
      <label>LinkedIn URL<input type="url" name="urls[LinkedIn]"></label>
      <label>Extra Field<input type="text" name="extraField"></label>
    `;

    const matchedElements = new Set<HTMLElement>([
      document.querySelector('input[name="firstName"]') as HTMLElement,
    ]);

    const unmatchedFields = findUnmatchedPageFields(matchedElements);

    expect(unmatchedFields).toHaveLength(2);
    expect(
      unmatchedFields.some((field) => field.descriptor.includes('name=urls[LinkedIn]')),
    ).toBe(true);
    expect(
      unmatchedFields.some((field) => field.descriptor.includes('name=extraField')),
    ).toBe(true);
    expect(
      unmatchedFields.some((field) => field.descriptor.includes('name=firstName')),
    ).toBe(false);
  });
});
