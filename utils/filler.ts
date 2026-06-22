import { getStorage, type Profile } from './storage';
import { detectPlatform, getFieldSelectors, findField, fillField } from './common';
import { findBestField, findUnmatchedPageFields } from './matcher';

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
    privacyConsent: personal.privacyConsent,
  };
  return map[field];
}

function describeSelector(selectorOrArray: string | string[]): string {
  if (Array.isArray(selectorOrArray)) {
    return selectorOrArray.join(' | ');
  }
  return selectorOrArray || '[unknown selector]';
}

function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
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
  return null;
}

async function fillCheckbox(
  element: HTMLElement,
  value: string,
): Promise<HTMLElement | null> {
  const input = element as HTMLInputElement;
  if (input.type === 'checkbox' && (value === 'true' || value === '1')) {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return element;
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

  sendProgress('Beginning form fill...', 'info');

  // Diagnostic: report platform, control counts, and frame structure
  try {
    const allControls = Array.from(document.querySelectorAll('input, textarea, select'));
    const allContenteditables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    const visibleControls = allControls.filter((el) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0);
    const visibleContentEditable = allContenteditables.filter((el) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0);
    const iframes = Array.from(document.querySelectorAll('iframe, frame')) as Array<HTMLIFrameElement>;
    const sameOriginFrames: string[] = [];
    let accessibleFrames = 0;
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          accessibleFrames += 1;
          sameOriginFrames.push(iframe.src || '[inline]');
        }
      } catch {
        // cross-origin frame, ignore
      }
    }
    const selectorKeys = Object.keys(selectors || {});
    const profileFieldsWithValues: string[] = [];
    for (const k of selectorKeys) {
      const v = getValueFromProfile(profile as Profile, k);
      if (v) profileFieldsWithValues.push(k);
    }
    const frameDescriptor = window.self === window.top ? 'top' : 'nested frame';
    sendProgress(`Platform: ${activePlatform}; page form controls: ${visibleControls.length}; contenteditable: ${visibleContentEditable.length}`, 'info');
    sendProgress(`Frame: ${frameDescriptor}; iframes: ${iframes.length}; accessible same-origin frames: ${accessibleFrames}`, 'info');
    sendProgress(`Profile has values for ${profileFieldsWithValues.length}/${selectorKeys.length} fields.`, 'info');
    chrome.runtime.sendMessage({
      type: 'FILL_DIAGNOSTIC',
      payload: {
        platform: activePlatform,
        frame: frameDescriptor,
        url: window.location.href,
        totalControls: allControls.length,
        visibleControls: visibleControls.length,
        contenteditableCount: allContenteditables.length,
        visibleContenteditableCount: visibleContentEditable.length,
        iframeCount: iframes.length,
        accessibleSameOriginFrames: accessibleFrames,
        sameOriginFrameUrls: sameOriginFrames,
        selectorsSearched: selectorKeys.length,
        profileFieldsWithValues,
      },
    });
  } catch (diagErr) {
    console.debug('Diagnostic send failed:', diagErr);
  }

  let filled = 0;

  for (const [field, selectorOrArray] of Object.entries(selectors)) {
    const value = getValueFromProfile(profile, field);
    const selectorText = describeSelector(selectorOrArray);

    if (!value) {
      sendProgress(
        `Skipping "${field}": no profile value available.`,
        'info',
      );
      continue;
    }

    if (field === 'workAuthorized') {
      sendProgress(
        `Looking for work authorization field.`,
        'info',
      );
      const matchedElement = await fillWorkAuthorization(selectorOrArray, value);
      if (matchedElement) {
        matchedElements.add(matchedElement);
        filled++;
        sendProgress(
          `Filled work authorization with value "${value}".`,
          'success',
        );
      } else {
          console.debug('Could not find work authorization field.');
      }
      continue;
    }

    // Handle privacy consent checkbox
    if (field === 'privacyConsent') {
      sendProgress(
        `Looking for privacy consent field.`,
        'info',
      );
      const result = findBestField(field);
      if (result.element && (value === 'true' || value === '1')) {
        const checkboxElement = await fillCheckbox(result.element, value);
        if (checkboxElement) {
          matchedElements.add(checkboxElement);
          filled++;
          sendProgress(
            `Checked privacy consent field.`,
            'success',
          );
        } else {
          console.debug('Could not check privacy consent field.');
        }
      } else {
        console.debug('No matching privacy consent field found or value is not true/1.');
      }
      continue;
    }

    // Try CSS selectors first (fast path)
    let lookup = findField(field, selectorOrArray);
    let element = lookup.element;
    let matchType = lookup.selector ? 'selector' : 'none';

    // Fallback: use the new weighted matcher (autocomplete + heuristics)
    if (!element) {
      const result = findBestField(field);
    if (result.element && result.score >= 5) {
      element = result.element;
      matchType = result.matchType;
    }
    }

    if (!element) {
      console.debug(`No matching field found for ${field || '[unknown]'}`);
      continue;
    }

    matchedElements.add(element);

    if (
      (element as HTMLInputElement).value ||
      element.textContent
    ) {
      sendProgress(
        `A matching field already has a value (matched by ${matchType}).`,
        'info',
      );
      continue;
    }

    try {
      await fillField(element, value, delay);
      filled++;
      sendProgress(
        `Filled "${field}" using ${matchType}.`,
        'success',
      );
    } catch (err: any) {
      console.error('Fill field error:', err);
      sendProgress(
        `Error filling "${field}": ${err.message || err}`,
        'error',
      );
    }
  }

  sendProgress(
    `Summary: ${filled}/${Object.keys(selectors).length} fields filled.`,
    'info',
  );

  // Attach resume if available
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
        sendProgress('Resume file attached.', 'success');
      } catch (err: any) {
        console.error('Attach resume error:', err);
        sendProgress(
          `Error attaching resume: ${err.message || err}`,
          'error',
        );
      }
    }
  }

  // Report unmatched fields
  const unmatchedPageFields = findUnmatchedPageFields(matchedElements);
  sendProgress(`Unmatched page fields: ${unmatchedPageFields.length}`, 'info');
  console.debug('UNMATCHED_PAGE_FIELDS payload:', unmatchedPageFields);
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

function sendProgress(text: string, level = 'info'): void {
  chrome.runtime.sendMessage({ type: 'FILL_PROGRESS', text, level });
}
