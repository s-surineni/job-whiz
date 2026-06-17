import { getStorage } from './storage';
import {
  detectPlatform,
  getFieldSelectors,
  findField,
  fillField,
} from './common';
import type { Profile } from './storage';

const FIELD_HINTS: Record<string, string[]> = {
  firstName: ['first name', 'given name', 'first'],
  lastName: ['last name', 'surname', 'family name', 'last'],
  fullName: [
    'full name',
    'name',
    'your name',
    'applicant name',
    'candidate name',
  ],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'telephone', 'mobile', 'cell'],
  address: ['address', 'street', 'street address', 'home address'],
  city: ['city', 'location', 'town', 'city name', 'location (city)'],
  state: ['state', 'province', 'region'],
  zip: ['zip', 'postal', 'postal code', 'zip code'],
  country: ['country', 'nation'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
  portfolio: ['portfolio', 'website', 'website url', 'portfolio url'],
  headline: ['headline', 'job title', 'title', 'role'],
  summary: ['summary', 'about', 'about you', 'description'],
  skills: ['skills', 'skill set', 'technologies', 'expertise'],
  workAuthorized: [
    'work authorized',
    'legally authorized',
    'work authorization',
    'right to work',
    'authorized to work',
  ],
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
    const labelEl = document.querySelector(
      `label[for="${CSS.escape(element.id)}"]`,
    );
    if (labelEl) label = labelEl.textContent!.trim();
  }
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) label = parentLabel.textContent!.trim();
  }
  return label.replace(/\s+/g, ' ').trim();
}

function getElementTextHints(element: HTMLElement): string {
  const hints: string[] = [];
  const el = element as HTMLInputElement;
  if (el.name) hints.push(el.name);
  if (el.id) hints.push(el.id);
  if (el.placeholder) hints.push(el.placeholder);
  const aria = el.getAttribute('aria-label');
  if (aria) hints.push(aria);
  const label = getLabelText(element);
  if (label) hints.push(label);
  const title = el.getAttribute('title');
  if (title) hints.push(title);
  const role = el.getAttribute('role');
  if (role) hints.push(role);
  return normalizeText(hints.join(' '));
}

function scoreElementForField(field: string, element: HTMLElement): number {
  const text = getElementTextHints(element);
  const hints = FIELD_HINTS[field] || [];
  let score = 0;
  for (const hint of hints) {
    const normalized = normalizeText(hint);
    if (text.includes(normalized)) {
      score += 2;
    }
  }
  if (field === 'city' && element.getAttribute('role') === 'combobox') {
    score += 2;
  }
  if (field === 'workAuthorized' && (element as HTMLInputElement).type === 'radio') {
    score += 2;
  }
  if (
    element.tagName.toLowerCase() === 'select' &&
    field === 'country'
  ) {
    score += 1;
  }
  return score;
}

function findBestPageField(field: string): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll('input, textarea, select'),
  ).filter(
    (el) => !(el as HTMLInputElement).disabled && (el as HTMLElement).offsetParent !== null,
  );
  let best = { score: 0, element: null as HTMLElement | null };
  for (const element of candidates) {
    const score = scoreElementForField(field, element as HTMLElement);
    if (score > best.score) {
      best = { score, element: element as HTMLElement };
    }
  }
  return best.element;
}

function getBestFieldHint(element: HTMLElement): {
  bestField: string | null;
  score: number;
} {
  let bestScore = 0;
  let bestField: string | null = null;
  for (const field of Object.keys(FIELD_HINTS)) {
    const score = scoreElementForField(field, element);
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }
  return { bestField, score: bestScore };
}

function describeSelector(selectorOrArray: string | string[]): string {
  if (Array.isArray(selectorOrArray)) {
    return selectorOrArray.join(' | ');
  }
  return selectorOrArray || '[unknown selector]';
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

function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function findUnmatchedFields(matchedElements: Set<HTMLElement>): Array<{
  descriptor: string;
  bestField: string | null;
  score: number;
}> {
  const candidates = Array.from(
    document.querySelectorAll('input, textarea, select'),
  ).filter(
    (el) => !(el as HTMLInputElement).disabled && (el as HTMLElement).offsetParent !== null,
  );

  const results: Array<{
    descriptor: string;
    bestField: string | null;
    score: number;
  }> = [];
  for (const element of candidates) {
    if (matchedElements.has(element as HTMLElement)) continue;
    const { bestField, score } = getBestFieldHint(element as HTMLElement);
    if (score >= 2) {
      results.push({
        descriptor: describeElement(element as HTMLElement),
        bestField,
        score,
      });
    }
  }
  return results;
}

function getValueFromProfile(
  profile: Profile,
  field: string,
): string | undefined {
  const personal = profile.personal || ({} as Profile['personal']);
  const professional = profile.professional || ({} as Profile['professional']);
  const map: Record<string, any> = {
    firstName: personal.firstName,
    lastName: personal.lastName,
    fullName: `${personal.firstName || ''} ${personal.lastName || ''}`.trim(),
    email: personal.email,
    phone: personal.phone,
    address: personal.address,
    city: personal.city,
    state: personal.state,
    zip: personal.zip,
    country: personal.country,
    linkedin: personal.linkedin,
    portfolio: personal.portfolio,
    website: personal.website,
    headline: professional.headline,
    summary: professional.summary,
    skills: Array.isArray(professional.skills)
      ? professional.skills.join(', ')
      : '',
    workAuthorized: personal.workAuthorized,
  };
  return map[field];
}

async function fillWorkAuthorization(
  selectorOrArray: string | string[],
  value: string,
): Promise<HTMLElement | null> {
  if (Array.isArray(selectorOrArray)) {
    for (const selector of selectorOrArray) {
      const radios = document.querySelectorAll(selector);
      for (const radio of radios) {
        if (
          (radio as HTMLInputElement).type === 'radio' &&
          (radio as HTMLInputElement).value.toLowerCase() === value.toLowerCase()
        ) {
          (radio as HTMLInputElement).checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return radio as HTMLElement;
        }
      }
    }
    return null;
  }

  const radios = document.querySelectorAll(selectorOrArray);
  for (const radio of radios) {
    if (
      (radio as HTMLInputElement).type === 'radio' &&
      (radio as HTMLInputElement).value.toLowerCase() === value.toLowerCase()
    ) {
      (radio as HTMLInputElement).checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return radio as HTMLElement;
    }
  }

  // Fallback: heuristically locate work authorization controls
  const candidates = Array.from(
    document.querySelectorAll('input[type="radio"], input[type="checkbox"], select'),
  ).filter(
    (el) => !(el as HTMLInputElement).disabled && (el as HTMLElement).offsetParent !== null,
  );

  const radiosByName: Record<string, HTMLElement[]> = {};
  for (const el of candidates) {
    const input = el as HTMLInputElement;
    if (input.type === 'radio' && input.name) {
      radiosByName[input.name] = radiosByName[input.name] || [];
      radiosByName[input.name].push(el as HTMLElement);
    }
  }

  for (const name of Object.keys(radiosByName)) {
    const group = radiosByName[name];
    let groupScore = 0;
    for (const opt of group) {
      const { bestField, score } = getBestFieldHint(opt);
      if (bestField === 'workAuthorized')
        groupScore = Math.max(groupScore, score);
    }
    if (groupScore >= 2) {
      for (const opt of group) {
        const labelText = normalizeText(
          getLabelText(opt) ||
            (opt as HTMLInputElement).value ||
            opt.getAttribute('aria-label') ||
            '',
        );
        if (labelText.includes(normalizeText(String(value)))) {
          (opt as HTMLInputElement).checked = true;
          opt.dispatchEvent(new Event('change', { bubbles: true }));
          return opt;
        }
      }
      const lower = String(value || '').toLowerCase();
      const yesVals = [
        'yes',
        'y',
        'true',
        'eligible',
        'authorized',
        'right to work',
      ];
      const wantYes = yesVals.some((v) => lower.includes(v));
      for (const opt of group) {
        const label = normalizeText(
          getLabelText(opt) ||
            (opt as HTMLInputElement).value ||
            opt.getAttribute('aria-label') ||
            '',
        );
        if (wantYes && /yes|y|true|eligible|authorized|right to work/.test(label)) {
          (opt as HTMLInputElement).checked = true;
          opt.dispatchEvent(new Event('change', { bubbles: true }));
          return opt;
        }
        if (!wantYes && /no|n|false|not authorized|not eligible/.test(label)) {
          (opt as HTMLInputElement).checked = true;
          opt.dispatchEvent(new Event('change', { bubbles: true }));
          return opt;
        }
      }
    }
  }

  for (const el of candidates) {
    const { bestField, score } = getBestFieldHint(el as HTMLElement);
    if (bestField !== 'workAuthorized' || score < 2) continue;
    if (el.tagName.toLowerCase() === 'select') {
      const opts = Array.from((el as HTMLSelectElement).options);
      const found = opts.find((o) =>
        normalizeText(o.value || o.text).includes(normalizeText(String(value))),
      );
      if (found) {
        (el as HTMLSelectElement).value = found.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return el as HTMLElement;
      }
    }
    if ((el as HTMLInputElement).type === 'checkbox') {
      const lower = String(value || '').toLowerCase();
      const want = ['yes', 'true', '1', 'on', 'authorized', 'eligible'].some(
        (v) => lower.includes(v),
      );
      (el as HTMLInputElement).checked = !!want;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el as HTMLElement;
    }
  }

  return null;
}

export async function fillApplication(platform?: string): Promise<void> {
  const activePlatform = platform || detectPlatform();
  const { profiles, settings } = await getStorage();
  const profile =
    profiles.find((p) => p.id === settings.activeProfile) || profiles[0];
  const selectors = getFieldSelectors(activePlatform);
  const delay = settings.autoFillDelay || 300;
  const matchedElements = new Set<HTMLElement>();

  chrome.runtime.sendMessage({
    type: 'FILL_PROGRESS',
    text: 'Considering configured profile values for target page fields.',
    level: 'info',
  });

  let filled = 0;
  chrome.runtime.sendMessage({
    type: 'FILL_PROGRESS',
    text: 'Beginning form fill...',
    level: 'info',
  });

  for (const [field, selectorOrArray] of Object.entries(selectors)) {
    const value = getValueFromProfile(profile, field);
    const selectorText = describeSelector(selectorOrArray);

    if (!value) {
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `Skipping lookup for selectors: ${selectorText}. No profile value available.`,
        level: 'info',
      });
      continue;
    }

    if (field === 'workAuthorized') {
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `Looking for work authorization page field using selectors: ${selectorText}`,
        level: 'info',
      });
      const matchedElement = await fillWorkAuthorization(selectorOrArray, value);
      if (matchedElement) {
        matchedElements.add(matchedElement);
        filled++;
        const desc = describeElement(matchedElement);
        chrome.runtime.sendMessage({
          type: 'FILL_PROGRESS',
          text: `Filled target page field ${desc} with work authorization value ${value}.`,
          level: 'success',
        });
      } else {
        chrome.runtime.sendMessage({
          type: 'FILL_PROGRESS',
          text: `Could not find a matching work authorization page field. Selectors: ${selectorText}`,
          level: 'error',
        });
      }
      continue;
    }

    const lookup = findField(field, selectorOrArray);
    let element = lookup.element;
    let matchType = 'selector';
    let matchedSelector = lookup.selector || selectorText;

    if (!element) {
      const fallback = findBestPageField(field);
      if (fallback) {
        element = fallback;
        matchType = 'heuristic';
        matchedSelector = describeElement(fallback);
      }
    }

    if (!element) {
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `No matching page field found for selectors: ${selectorText}.`,
        level: 'error',
      });
      continue;
    }

    matchedElements.add(element);

    const pageFieldDesc = describeElement(element);
    if (
      (element as HTMLInputElement).value ||
      element.textContent
    ) {
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `Target page field already has a value: ${pageFieldDesc} (matched by ${matchType}).`,
        level: 'info',
      });
      continue;
    }

    try {
      await fillField(element, value, delay);
      filled++;
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `Filled target page field ${pageFieldDesc} using selector ${matchedSelector}.`,
        level: 'success',
      });
    } catch (err: any) {
      console.error('Fill field error:', err);
      chrome.runtime.sendMessage({
        type: 'FILL_PROGRESS',
        text: `Error filling target page field ${pageFieldDesc}: ${err.message || err}`,
        level: 'error',
      });
    }
  }

  chrome.runtime.sendMessage({
    type: 'FILL_PROGRESS',
    text: `Summary: ${filled}/${Object.keys(selectors).length} target page fields filled.`,
    level: 'info',
  });

  if (profile.resume && profile.resume.data) {
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      try {
        const blob = dataURLToBlob(profile.resume.data);
        const file = new File([blob], profile.resume.filename, {
          type: 'application/pdf',
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.runtime.sendMessage({
          type: 'FILL_PROGRESS',
          text: 'Resume file attached.',
          level: 'success',
        });
      } catch (err: any) {
        console.error('Attach resume error:', err);
        chrome.runtime.sendMessage({
          type: 'FILL_PROGRESS',
          text: `Error attaching resume: ${err.message || err}`,
          level: 'error',
        });
      }
    }
  }

  const unmatchedPageFields = findUnmatchedFields(matchedElements);
  chrome.runtime.sendMessage({
    type: 'UNMATCHED_PAGE_FIELDS',
    fields: unmatchedPageFields,
  });
  chrome.runtime.sendMessage({
    type: 'FILL_COMPLETE',
    fieldsFilled: filled,
  });
}

export function clearFilledFields(platform?: string): void {
  const activePlatform = platform || detectPlatform();
  const selectors = getFieldSelectors(activePlatform);
  for (const [field, selectorOrArray] of Object.entries(selectors)) {
    let lookup;
    if (Array.isArray(selectorOrArray)) {
      lookup = findField(field, selectorOrArray);
    } else {
      lookup = {
        element: document.querySelector(selectorOrArray) as HTMLElement,
        selector: selectorOrArray,
      };
    }

    const element = lookup.element;
    if (element) {
      if (element.tagName.toLowerCase() === 'select') {
        (element as HTMLSelectElement).selectedIndex = 0;
      } else if (
        (element as HTMLInputElement).type === 'checkbox' ||
        (element as HTMLInputElement).type === 'radio'
      ) {
        (element as HTMLInputElement).checked = false;
      } else {
        (element as HTMLInputElement).value = '';
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}