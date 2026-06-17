import { fillField } from '../common';
import type { Profile } from '../storage';

export const linkedinSelectors: Record<string, string> = {
  firstName:
    'input[name="firstName"], input[autocomplete="given-name"], input[id*="firstName"]',
  lastName:
    'input[name="lastName"], input[autocomplete="family-name"], input[id*="lastName"]',
  fullName:
    'input[name="fullName"], input[autocomplete="name"], input[id*="name"]',
  email:
    'input[name="email"], input[autocomplete="email"], input[id*="email"]',
  phone: 'input[name="phone"], input[autocomplete="tel"], input[id*="phone"]',
  address: 'input[name="address"], input[autocomplete="street-address"]',
  city: 'input[name="city"], input[autocomplete="address-level2"]',
  state: 'input[name="state"], input[autocomplete="address-level1"]',
  zip: 'input[name="postalCode"], input[autocomplete="postal-code"]',
  country: 'select[name="country"], input[name="country"]',
  headline: 'input[name="headline"]',
  summary:
    'textarea[name="summary"], div[aria-label*="summary"i][contenteditable]',
  skills: 'input[name="skills"]',
};

export function detectLinkedInForm(): string | null {
  const easyApply = document.querySelector(
    '.jobs-easy-apply-modal, [data-job-id]',
  );
  if (easyApply) return 'easy-apply';
  const external = document.querySelector('iframe[src*="apply"]');
  if (external) return 'external';
  return null;
}

export async function fillLinkedInEasyApply(profile: Profile): Promise<number> {
  const modal = document.querySelector('.jobs-easy-apply-modal');
  if (!modal) return 0;

  let filled = 0;
  const forms = modal.querySelectorAll('form');
  for (const form of forms) {
    for (const [field, selector] of Object.entries(linkedinSelectors)) {
      const value = getValueFromProfile(profile, field);
      if (!value) continue;
      const el = form.querySelector(selector);
      if (el && !(el as HTMLInputElement).value) {
        const delay = Math.random() * 200 + 100;
        await fillField(el as HTMLElement, value, delay);
        filled++;
      }
    }
  }
  return filled;
}

export async function waitForEasyApplyModal(
  timeout = 10000,
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const modal = document.querySelector('.jobs-easy-apply-modal');
    if (modal && (modal as HTMLElement).offsetParent !== null) return modal;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
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