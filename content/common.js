function detectPlatform() {
  const host = window.location.hostname
  if (host.includes('linkedin.com')) return 'linkedin'
  if (host.includes('indeed.com')) return 'indeed'
  return 'unknown'
}

function getFieldSelectors(platform) {
  const selectors = {
    linkedin: {
      fullName: 'input[name="fullName"], input[autocomplete="name"]',
      email: 'input[name="email"], input[autocomplete="email"]',
      phone: 'input[name="phone"], input[autocomplete="tel"]',
      address: 'input[name="address"], input[autocomplete="street-address"]',
      city: 'input[name="city"], input[autocomplete="address-level2"]',
      state: 'input[name="state"], input[autocomplete="address-level1"]',
      zip: 'input[name="postalCode"], input[autocomplete="postal-code"]',
      country: 'select[name="country"], input[name="country"]',
      headline: 'input[name="headline"]',
      summary: 'textarea[name="summary"], div[contenteditable="true"][aria-label*="summary"i]',
      skills: 'input[name="skills"]',
    },
    indeed: {
      fullName: 'input[name="fullName"], input[data-testid="fullName"]',
      email: 'input[name="email"], input[data-testid="email"]',
      phone: 'input[name="phone"], input[data-testid="phone"]',
      address: 'input[name="address"], input[data-testid="address"]',
      city: 'input[name="city"], input[data-testid="city"]',
      state: 'input[name="state"], input[data-testid="state"]',
      zip: 'input[name="zip"], input[data-testid="postalCode"]',
      country: 'select[name="country"], select[data-testid="country"]',
    },
  }
  return selectors[platform] || {}
}

async function fillField(field, value, delay = 0) {
  if (!field || value === undefined || value === null) return
  return new Promise(resolve => {
    setTimeout(() => {
      const tag = field.tagName.toLowerCase()
      if (tag === 'select') {
        const option = Array.from(field.options).find(
          o => o.value.toLowerCase() === value.toLowerCase()
            || o.text.toLowerCase() === value.toLowerCase()
        )
        if (option) field.value = option.value
      } else if (field.isContentEditable) {
        field.textContent = value
      } else {
        field.value = value
      }
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      resolve()
    }, delay)
  })
}
