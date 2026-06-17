import { fillField } from '../common';
import type { Profile } from '../storage';

export const indeedSelectors: Record<string, string> = {
  firstName: 'input[name="firstName"], input[data-testid="firstName-input"]',
  lastName: 'input[name="lastName"], input[data-testid="lastName-input"]',
  fullName: 'input[name="fullName"], input[data-testid="fullName-input"]',
  email: 'input[name="email"], input[data-testid="email-input"]',
  phone: 'input[name="phone"], input[data-testid="phone-input"]',
  address: 'input[name="address"], input[data-testid="address-input"]',
  city: 'input[name="city"], input[data-testid="city-input"]',
  state: 'input[name="state"], input[data-testid="state-input"]',
  zip: 'input[name="postalCode"], input[data-testid="postalCode-input"]',
  country: 'select[name="country"], select[data-testid="country-select"]',
};

export function detectIndeedForm(): string | null {
  const app = document.querySelector(
    '#IndeedApplyForm, [data-testid="apply-form"]',
  );
  if (app) return 'inline';
  const modal = document.querySelector(
    '.ia-Application, [data-testid="application-modal"]',
  );
  if (modal) return 'modal';
  return null;
}

export async function fillIndeedForm(profile: Profile): Promise<number> {
  let filled = 0;
  for (const [field, selector] of Object.entries(indeedSelectors)) {
    const value = getValueFromProfile(profile, field);
    if (!value) continue;
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      if (!(el as HTMLInputElement).value) {
        await fillField(el as HTMLElement, value, Math.random() * 200 + 100);
        filled++;
      }
    }
  }
  return filled;
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