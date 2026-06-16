function detectPlatform() {
  const host = window.location.hostname
  if (host.includes('linkedin.com')) return 'linkedin'
  if (host.includes('indeed.com')) return 'indeed'
  return 'generic'
}

function getFieldSelectors(platform) {
  const commonSelectors = {
    fullName: [
      'input[name*="name" i][type="text"]',
      'input[aria-label*="name" i]',
      'input[placeholder*="name" i]',
      'input[name*="full" i]',
      'input[id*="name" i]'
    ],
    email: [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[aria-label*="email" i]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]'
    ],
    phone: [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="mobile" i]',
      'input[aria-label*="phone" i]',
      'input[placeholder*="phone" i]',
      'input[id*="phone" i]'
    ],
    address: [
      'input[name*="address" i]',
      'input[aria-label*="address" i]',
      'input[placeholder*="address" i]',
      'input[id*="address" i]'
    ],
    city: [
      'input[name*="city" i]',
      'input[aria-label*="city" i]',
      'input[placeholder*="city" i]',
      'input[id*="city" i]'
    ],
    state: [
      'input[name*="state" i]',
      'input[name*="province" i]',
      'input[aria-label*="state" i]',
      'input[placeholder*="state" i]',
      'input[id*="state" i]'
    ],
    zip: [
      'input[name*="zip" i]',
      'input[name*="postal" i]',
      'input[aria-label*="zip" i]',
      'input[placeholder*="zip" i]',
      'input[id*="zip" i]'
    ],
    country: [
      'select[name*="country" i]',
      'input[name*="country" i]',
      'input[aria-label*="country" i]',
      'input[id*="country" i]'
    ],
    headline: [
      'input[name*="headline" i]',
      'input[name*="title" i]',
      'input[aria-label*="headline" i]'
    ],
    summary: [
      'textarea[name*="summary" i]',
      'textarea[name*="about" i]',
      'textarea[aria-label*="summary" i]',
      'div[contenteditable="true"][aria-label*="summary" i]'
    ],
    skills: [
      'input[name*="skills" i]',
      'textarea[name*="skills" i]',
      'input[aria-label*="skills" i]'
    ],
    workAuthorized: [
      'input[type="radio"][name*="work" i]',
      'input[type="radio"][name*="author" i]',
      'select[name*="work" i]',
      'select[name*="author" i]',
      'input[type="checkbox"][name*="work" i]',
      'input[aria-label*="legally" i]',
      'input[aria-label*="work" i]'
    ]
  }

  const platformSpecific = {
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

  if (platformSpecific[platform]) {
    return platformSpecific[platform]
  }
  
  // For generic platform, return selector arrays
  return commonSelectors
}

function findField(fieldName, selectors) {
  if (typeof selectors === 'string') {
    // Single selector string (specific platform)
    return document.querySelector(selectors)
  }
  
  if (Array.isArray(selectors)) {
    // Try each selector in order
    for (const selector of selectors) {
      const el = document.querySelector(selector)
      if (el) return el
    }
  }
  
  return null
}

async function fillField(field, value, delay = 0) {
  if (!field || value === undefined || value === null) return
  return new Promise(resolve => {
    setTimeout(() => {
      const tag = field.tagName.toLowerCase()
      const type = field.type ? field.type.toLowerCase() : ''
      
      if (type === 'radio') {
        // For radio buttons, find the matching value
        const allRadios = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`)
        for (const radio of allRadios) {
          if (radio.value.toLowerCase() === value.toLowerCase()) {
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            break
          }
        }
      } else if (type === 'checkbox') {
        // For checkboxes, check if value matches yes/true
        if (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
          field.checked = true
        } else if (value.toLowerCase() === 'no' || value.toLowerCase() === 'false') {
          field.checked = false
        }
        field.dispatchEvent(new Event('change', { bubbles: true }))
      } else if (tag === 'select') {
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
