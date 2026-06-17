const indeedSelectors = {
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
}

function detectIndeedForm() {
  const app = document.querySelector('# IndeedApplyForm, [data-testid="apply-form"]')
  if (app) return 'inline'
  const modal = document.querySelector('.ia-Application, [data-testid="application-modal"]')
  if (modal) return 'modal'
  return null
}

async function fillIndeedForm(profile) {
  let filled = 0
  for (const [field, selector] of Object.entries(indeedSelectors)) {
    const value = getValueFromProfile(profile, field)
    if (!value) continue
    const els = document.querySelectorAll(selector)
    for (const el of els) {
      if (!el.value) {
        await fillField(el, value, Math.random() * 200 + 100)
        filled++
      }
    }
  }
  return filled
}
