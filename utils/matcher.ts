/**
 * Improved field matching using autocomplete attributes + weighted multi-signal scoring.
 *
 * Priority order:
 * 1. Standard `autocomplete` attribute (most reliable)
 * 2. Weighted scoring across multiple DOM signals
 */

/** Maps profile field names to standard autocomplete values */
const AUTOCOMPLETE_MAP: Record<string, string[]> = {
  firstName: ['given-name', 'first-name'],
  lastName: ['family-name', 'last-name', 'surname'],
  fullName: ['name', 'full-name'],
  email: ['email'],
  phone: ['tel', 'phone', 'mobile'],
  address: ['street-address', 'address-line1', 'address'],
  city: ['address-level2', 'city'],
  state: ['address-level1', 'state', 'province', 'region'],
  zip: ['postal-code', 'zip', 'postcode'],
  country: ['country', 'country-name'],
  headline: ['organization-title', 'job-title'],
  linkedin: ['url'],
  portfolio: ['url'],
  website: ['url'],
};

/** Text hints for heuristic matching (used when autocomplete is not available) */
const FIELD_HINTS: Record<string, string[]> = {
  firstName: ['first name', 'given name', 'first', 'preferred first'],
  lastName: ['last name', 'surname', 'family name', 'last', 'preferred last'],
  fullName: ['full name', 'name', 'your name', 'applicant name', 'candidate name'],
  email: ['email', 'e-mail', 'email address', 'contact email'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
  address: ['address', 'street', 'street address', 'home address'],
  city: ['city', 'location', 'town', 'city name'],
  state: ['state', 'province', 'region'],
  zip: ['zip', 'postal', 'postal code', 'zip code'],
  country: ['country', 'nation'],
  headline: ['headline', 'job title', 'title', 'role'],
  summary: ['summary', 'about', 'about you', 'description'],
  skills: ['skills', 'skill set', 'technologies', 'expertise'],
  workAuthorized: ['work authorized', 'legally authorized', 'work authorization', 'right to work', 'sponsor', 'sponsorship', 'work from office', 'remote', 'work location'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'linked in'],
  portfolio: ['portfolio', 'website', 'website url', 'personal website'],
  website: ['website', 'website url', 'personal website', 'personal website'],
  privacyConsent: ['privacy policy', 'privacy agreement', 'acknowledge', 'agree', 'consent', 'terms and conditions'],
};

function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getLabelText(element: HTMLElement): string {
  if (!element) return '';
  let label = '';
  if (element.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (labelEl) label = labelEl.textContent!.trim();
  }
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) label = parentLabel.textContent!.trim();
  }
  return label.replace(/\s+/g, ' ').trim();
}

/**
 * Score how well a DOM element matches a profile field using weighted signals.
 *
 * Weights:
 * - autocomplete attribute: 100 (strongest — semantic HTML)
 * - label text: 40
 * - aria-label: 35
 * - name attribute: 30
 * - id attribute: 25
 * - placeholder: 20
 * - input type (email/tel/url): 15
 * - role combobox (for city/location): 10
 */
function scoreElementForField(field: string, element: HTMLElement): number {
  const el = element as HTMLInputElement;
  let score = 0;

  // Signal 1: autocomplete attribute (strongest)
  const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
  const standardValues = AUTOCOMPLETE_MAP[field] || [];
  if (autocomplete) {
    for (const sv of standardValues) {
      if (autocomplete === sv || autocomplete.includes(sv)) {
        score += 100;
        break;
      }
    }
  }

  // Signal 2: label text
  const labelText = normalizeText(getLabelText(element));
  const hints = FIELD_HINTS[field] || [];
  for (const hint of hints) {
    if (labelText.includes(normalizeText(hint))) {
      score += 40;
      break;
    }
  }

  // Signal 3: aria-label
  const ariaLabel = normalizeText(el.getAttribute('aria-label') || '');
  for (const hint of hints) {
    if (ariaLabel.includes(normalizeText(hint))) {
      score += 35;
      break;
    }
  }

  // Signal 4: name attribute
  const name = normalizeText(el.name || '');
  for (const hint of hints) {
    if (name.includes(normalizeText(hint))) {
      score += 30;
      break;
    }
  }

  // Signal 5: id attribute
  const id = normalizeText(el.id || '');
  for (const hint of hints) {
    if (id.includes(normalizeText(hint))) {
      score += 25;
      break;
    }
  }

  // Signal 6: placeholder
  const placeholder = normalizeText(el.placeholder || '');
  for (const hint of hints) {
    if (placeholder.includes(normalizeText(hint))) {
      score += 20;
      break;
    }
  }

  // Signal 7: input type
  const type = (el.type || '').toLowerCase();
  if (field === 'email' && type === 'email') score += 15;
  if (field === 'phone' && type === 'tel') score += 15;
  if ((field === 'linkedin' || field === 'portfolio' || field === 'website') && type === 'url') score += 15;

  // Bonus: checkbox for privacyConsent
  if (field === 'privacyConsent' && type === 'checkbox') score += 20;

  // Stronger heuristic for bracketed social URL field names like urls[LinkedIn]
  if (field === 'linkedin' && /\burls?\s*linkedin\b/.test(name)) score += 30;
  if (field === 'portfolio' && /\burls?\s*portfolio\b/.test(name)) score += 30;
  if (field === 'website' && /\burls?\s*website\b/.test(name)) score += 30;

  // Bonus: combobox for city/location fields
  if (field === 'city' && el.getAttribute('role') === 'combobox') score += 10;

  // Bonus: radio for workAuthorized
  if (field === 'workAuthorized' && type === 'radio') score += 10;

  // Bonus: select for country
  if (field === 'country' && element.tagName.toLowerCase() === 'select') score += 5;

  return score;
}

/**
 * Find the best matching form element for a profile field.
 *
 * Strategy:
 * 1. First try autocomplete attribute (highest confidence)
 * 2. Then try weighted heuristic scoring across all visible form elements
 * 3. Return the element with the highest score above a minimum threshold
 */
export function findBestField(
  fieldName: string,
): { element: HTMLElement | null; score: number; matchType: string } {
  // Strategy 1: Direct autocomplete match (highest priority)
  const standardValues = AUTOCOMPLETE_MAP[fieldName] || [];
  if (standardValues.length > 0) {
    for (const av of standardValues) {
      const el = document.querySelector(
        `input[autocomplete="${av}"], select[autocomplete="${av}"]`,
      );
      if (el && isVisible(el as HTMLElement)) {
        return {
          element: el as HTMLElement,
          score: 100,
          matchType: `autocomplete="${av}"`,
        };
      }
    }
  }

  // Strategy 2: Weighted heuristic scoring
  const candidates = Array.from(
    document.querySelectorAll('input, textarea, select'),
  ).filter((el) => {
    const htmlEl = el as HTMLElement;
    return isVisible(htmlEl) && !(el as HTMLInputElement).disabled;
  });

  let best = { element: null as HTMLElement | null, score: 0, matchType: 'heuristic' };

  for (const element of candidates) {
    const score = scoreElementForField(fieldName, element as HTMLElement);
    if (score > best.score) {
      best = { element: element as HTMLElement, score, matchType: 'heuristic' };
    }
  }

  return best;
}

/**
 * Find all unmatched form fields on the page.
 * Any visible page field that was not matched during autofill should be reported.
 */
export function findUnmatchedPageFields(
  matchedElements: Set<HTMLElement>,
): Array<{ descriptor: string; bestField: string | null; score: number }> {
  const candidates = Array.from(
    document.querySelectorAll('input, textarea, select'),
  ).filter((el) => isVisible(el as HTMLElement) && !(el as HTMLInputElement).disabled);

  const results: Array<{ descriptor: string; bestField: string | null; score: number }> = [];
  for (const element of candidates) {
    if (matchedElements.has(element as HTMLElement)) continue;

    let bestField: string | null = null;
    let bestScore = 0;
    for (const field of Object.keys(FIELD_HINTS)) {
      const score = scoreElementForField(field, element as HTMLElement);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }

    results.push({
      descriptor: describeElement(element as HTMLElement),
      bestField,
      score: bestScore,
    });
  }
  return results;
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

function describeElement(element: HTMLElement | null): string {
  if (!element) return '[unknown page field]';
  const parts: string[] = [element.tagName.toLowerCase()];
  const el = element as HTMLInputElement;
  if (el.type) parts.push(`type=${el.type}`);
  if (el.id) parts.push(`id=${el.id}`);
  if (el.name) parts.push(`name=${el.name}`);
  if (el.placeholder) parts.push(`placeholder=${el.placeholder}`);
  const aria = el.getAttribute('aria-label');
  if (aria) parts.push(`aria-label=${aria}`);
  const label = getLabelText(element);
  if (label) parts.push(`label="${label}"`);
  return parts.join(' ');
}
