const linkedinSelectors = {
  firstName: 'input[name="firstName"], input[autocomplete="given-name"], input[id*="firstName"]',
  lastName: 'input[name="lastName"], input[autocomplete="family-name"], input[id*="lastName"]',
  fullName: 'input[name="fullName"], input[autocomplete="name"], input[id*="name"]',
  email: 'input[name="email"], input[autocomplete="email"], input[id*="email"]',
  phone: 'input[name="phone"], input[autocomplete="tel"], input[id*="phone"]',
  address: 'input[name="address"], input[autocomplete="street-address"]',
  city: 'input[name="city"], input[autocomplete="address-level2"]',
  state: 'input[name="state"], input[autocomplete="address-level1"]',
  zip: 'input[name="postalCode"], input[autocomplete="postal-code"]',
  country: 'select[name="country"], input[name="country"]',
  headline: 'input[name="headline"]',
  summary: 'textarea[name="summary"], div[aria-label*="summary"i][contenteditable]',
  skills: 'input[name="skills"]',
}

function detectLinkedInForm() {
  const easyApply = document.querySelector('.jobs-easy-apply-modal, [data-job-id]')
  if (easyApply) return 'easy-apply'
  const external = document.querySelector('iframe[src*="apply"]')
  if (external) return 'external'
  return null
}

async function fillLinkedInEasyApply(profile) {
  const modal = document.querySelector('.jobs-easy-apply-modal')
  if (!modal) return 0

  let filled = 0
  const forms = modal.querySelectorAll('form')
  for (const form of forms) {
    for (const [field, selector] of Object.entries(linkedinSelectors)) {
      const value = getValueFromProfile(profile, field)
      if (!value) continue
      const el = form.querySelector(selector)
      if (el && !el.value) {
        const delay = Math.random() * 200 + 100
        await fillField(el, value, delay)
        filled++
      }
    }
  }
  return filled
}

async function waitForEasyApplyModal(timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const modal = document.querySelector('.jobs-easy-apply-modal')
    if (modal && modal.offsetParent !== null) return modal
    await new Promise(r => setTimeout(r, 200))
  }
  return null
}
