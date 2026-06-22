import { describe, it, expect, beforeEach } from 'vitest';
import { renderUnmatchedFields } from '../entrypoints/popup/main';

describe('popup unmatched page fields render', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="unmatchedList"></div>
    `;
  });

  it('displays unmatched fields in the unmatched page fields section', () => {
    const fields = [
      {
        descriptor: 'input type=text id=extraField name=extraField label="Extra Field"',
        bestField: 'unknown',
        score: 0,
      },
      {
        descriptor: 'input type=url name=urls[LinkedIn] label="LinkedIn URL"',
        bestField: 'linkedin',
        score: 45,
      },
    ];

    renderUnmatchedFields(fields);

    const list = document.getElementById('unmatchedList');
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('.unmatched-item').length).toBe(2);
    expect(list?.textContent).toContain('LinkedIn URL');
    expect(list?.textContent).toContain('Extra Field');
    expect(list?.textContent).toContain('Best match: linkedin (45)');
  });

  it('shows the empty message when no fields are provided', () => {
    renderUnmatchedFields([]);
    const list = document.getElementById('unmatchedList');
    expect(list?.textContent).toContain('No unmatched page fields found.');
  });
});
