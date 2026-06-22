export function detectPlatform(): string {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('indeed.com')) return 'indeed';
  return 'generic';
}

export function getFieldSelectors(
  platform: string,
): Record<string, string | string[]> {
  const commonSelectors: Record<string, string[]> = {
    firstName: [
      'input[name*="firstName" i][type="text"]',
      'input[name*="first" i][type="text"]',
      'input[aria-label*="first name" i]',
      'input[placeholder*="first name" i]',
      'input[id*="firstName" i]',
      'input[id*="first-name" i]',
    ],
    lastName: [
      'input[name*="lastName" i][type="text"]',
      'input[name*="last" i][type="text"]',
      'input[aria-label*="last name" i]',
      'input[placeholder*="last name" i]',
      'input[id*="lastName" i]',
      'input[id*="last-name" i]',
    ],
    fullName: [
      'input[name="name" i][type="text"]',
      'input[autocomplete="name"]',
      'input[aria-label*="full name" i]',
      'input[placeholder*="full name" i]',
      'input[name*="full" i]:not([name*="middle" i])',
      'input[id*="full" i]:not([id*="middle" i])',
      'input[name*="name" i]:not([name*="first" i]):not([name*="last" i]):not([name*="middle" i])',
      'input[id*="name" i]:not([id*="first" i]):not([id*="last" i]):not([id*="middle" i])',
    ],
    email: [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[aria-label*="email" i]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]',
    ],
    phone: [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="mobile" i]',
      'input[aria-label*="phone" i]',
      'input[placeholder*="phone" i]',
      'input[id*="phone" i]',
    ],
    address: [
      'input[name*="address" i]',
      'input[aria-label*="address" i]',
      'input[placeholder*="address" i]',
      'input[id*="address" i]',
    ],
    city: [
      'input[name*="city" i]',
      'input[aria-label*="city" i]',
      'input[placeholder*="city" i]',
      'input[id*="city" i]',
      'input[id*="location" i]',
      'input[role="combobox"][aria-autocomplete="list"][id*="location" i]',
      'input[aria-label*="location" i]',
    ],
    state: [
      'input[name*="state" i]',
      'input[name*="province" i]',
      'input[aria-label*="state" i]',
      'input[placeholder*="state" i]',
      'input[id*="state" i]',
    ],
    zip: [
      'input[name*="zip" i]',
      'input[name*="postal" i]',
      'input[aria-label*="zip" i]',
      'input[placeholder*="zip" i]',
      'input[id*="zip" i]',
    ],
    country: [
      'select[name*="country" i]',
      'input[name*="country" i]',
      'input[aria-label*="country" i]',
      'input[id*="country" i]',
    ],
    headline: [
      'input[name*="headline" i]',
      'input[name*="title" i]',
      'input[aria-label*="headline" i]',
    ],
    linkedin: [
      'input[name*="linkedin" i][type="url"], input[name*="linkedin" i][type="text"], input[aria-label*="linkedin" i], input[placeholder*="linkedin" i], input[id*="linkedin" i]',
    ],
    portfolio: [
      'input[name*="portfolio" i][type="url"], input[aria-label*="portfolio" i], input[placeholder*="portfolio" i], input[id*="portfolio" i]',
    ],
    website: [
      'input[name*="website" i][type="url"], input[name*="website" i][type="text"], input[aria-label*="website" i], input[placeholder*="website" i], input[id*="website" i]',
    ],
    summary: [
      'textarea[name*="summary" i]',
      'textarea[name*="about" i]',
      'textarea[aria-label*="summary" i]',
      'div[contenteditable="true"][aria-label*="summary" i]',
    ],
    skills: [
      'input[name*="skills" i]',
      'textarea[name*="skills" i]',
      'input[aria-label*="skills" i]',
    ],
    workAuthorized: [
      'input[type="radio"][name*="work" i]',
      'input[type="radio"][name*="author" i]',
      'select[name*="work" i]',
      'select[name*="author" i]',
      'input[type="checkbox"][name*="work" i]',
      'input[aria-label*="legally" i]',
      'input[aria-label*="work" i]',
    ],
  };

  const platformSpecific: Record<string, Record<string, string>> = {
    linkedin: {
      firstName: 'input[name="firstName"], input[autocomplete="given-name"]',
      lastName:
        'input[name="lastName"], input[autocomplete="family-name"]',
      fullName: 'input[name="fullName"], input[autocomplete="name"]',
      email: 'input[name="email"], input[autocomplete="email"]',
      phone: 'input[name="phone"], input[autocomplete="tel"]',
      address: 'input[name="address"], input[autocomplete="street-address"]',
      city: 'input[name="city"], input[autocomplete="address-level2"], input[id*="location" i], input[aria-label*="location" i], input[role="combobox"][aria-autocomplete="list"][id*="location" i]',
      state: 'input[name="state"], input[autocomplete="address-level1"]',
      zip: 'input[name="postalCode"], input[autocomplete="postal-code"]',
      country: 'select[name="country"], input[name="country"]',
      headline: 'input[name="headline"]',
      summary:
        'textarea[name="summary"], div[contenteditable="true"][aria-label*="summary"i]',
      skills: 'input[name="skills"]',
      workAuthorized:
        'input[type="radio"][name*="work" i], input[type="radio"][name*="author" i], select[name*="work" i], select[name*="author" i], input[type="checkbox"][name*="work" i], input[aria-label*="legally" i], input[aria-label*="work" i]',
    },
    indeed: {
      firstName: 'input[name="firstName"], input[data-testid="firstName"]',
      lastName: 'input[name="lastName"], input[data-testid="lastName"]',
      fullName: 'input[name="fullName"], input[data-testid="fullName"]',
      email: 'input[name="email"], input[data-testid="email"]',
      phone: 'input[name="phone"], input[data-testid="phone"]',
      address: 'input[name="address"], input[data-testid="address"]',
      city: 'input[name="city"], input[data-testid="city"]',
      state: 'input[name="state"], input[data-testid="state"]',
      zip: 'input[name="zip"], input[data-testid="postalCode"]',
      country: 'select[name="country"], select[data-testid="country"]',
      workAuthorized:
        'input[type="radio"][name*="work" i], input[type="radio"][name*="author" i], select[name*="work" i], select[name*="author" i], input[type="checkbox"][name*="work" i], input[aria-label*="legally" i], input[aria-label*="work" i]',
    },
  };

  if (platformSpecific[platform]) {
    return platformSpecific[platform];
  }

  return commonSelectors;
}

export function findField(
  fieldName: string,
  selectors: string | string[],
): { element: HTMLElement | null; selector: string | null } {
  if (typeof selectors === 'string') {
    return {
      element: document.querySelector(selectors),
      selector: selectors,
    };
  }

  if (Array.isArray(selectors)) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return { element: el as HTMLElement, selector };
    }
  }

  return { element: null, selector: null };
}

export async function fillField(
  field: HTMLElement,
  value: string,
  delay = 0,
): Promise<void> {
  if (!field || value === undefined || value === null) return;
  return new Promise((resolve) => {
    setTimeout(() => {
      const tag = field.tagName.toLowerCase();
      const type = (field as HTMLInputElement).type
        ? (field as HTMLInputElement).type.toLowerCase()
        : '';

      if (type === 'radio') {
        const allRadios = document.querySelectorAll(
          `input[type="radio"][name="${(field as HTMLInputElement).name}"]`,
        );
        for (const radio of allRadios) {
          if (
            (radio as HTMLInputElement).value.toLowerCase() ===
            value.toLowerCase()
          ) {
            (radio as HTMLInputElement).checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      } else if (type === 'checkbox') {
        if (
          value.toLowerCase() === 'yes' ||
          value.toLowerCase() === 'true'
        ) {
          (field as HTMLInputElement).checked = true;
        } else if (
          value.toLowerCase() === 'no' ||
          value.toLowerCase() === 'false'
        ) {
          (field as HTMLInputElement).checked = false;
        }
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (tag === 'select') {
        const select = field as HTMLSelectElement;
        const option = Array.from(select.options).find(
          (o) =>
            o.value.toLowerCase() === value.toLowerCase() ||
            o.text.toLowerCase() === value.toLowerCase(),
        );
        if (option) select.value = option.value;
      } else if ((field as HTMLElement).isContentEditable) {
        field.textContent = value;
      } else {
        (field as HTMLInputElement).value = value;
      }
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      resolve();
    }, delay);
  });
}