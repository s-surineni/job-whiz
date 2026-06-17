;(async () => {
  const platform = detectPlatform()

  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'FILL_JOB_APPLICATION') {
      sendResponse({ status: 'started' })
      await fillApplication(platform)
    }
    if (message.type === 'CLEAR_FIELDS') {
      sendResponse({ status: 'cleared' })
      clearFilledFields(platform)
    }
  })

  function sendProgress(text, level = 'info') {
    chrome.runtime.sendMessage({ type: 'FILL_PROGRESS', text, level })
  }

  const FIELD_HINTS = {
    firstName: ['first name', 'given name', 'first'],
    lastName: ['last name', 'surname', 'family name', 'last'],
    fullName: ['full name', 'name', 'your name', 'applicant name', 'candidate name'],
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
    workAuthorized: ['work authorized', 'legally authorized', 'work authorization', 'right to work', 'authorized to work']
  }

  function normalizeText(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  }

  function getElementTextHints(element) {
    const hints = []
    if (element.name) hints.push(element.name)
    if (element.id) hints.push(element.id)
    if (element.placeholder) hints.push(element.placeholder)
    const aria = element.getAttribute('aria-label')
    if (aria) hints.push(aria)
    const label = getLabelText(element)
    if (label) hints.push(label)
    const title = element.getAttribute('title')
    if (title) hints.push(title)
    const role = element.getAttribute('role')
    if (role) hints.push(role)
    return normalizeText(hints.join(' '))
  }

  function scoreElementForField(field, element) {
    const text = getElementTextHints(element)
    const hints = FIELD_HINTS[field] || []
    let score = 0
    for (const hint of hints) {
      const normalized = normalizeText(hint)
      if (text.includes(normalized)) {
        score += 2
      }
    }
    // Prefer comboboxes for location fields when a location hint exists
    if (field === 'city' && element.getAttribute('role') === 'combobox') {
      score += 2
    }
    if (field === 'workAuthorized' && element.type === 'radio') {
      score += 2
    }
    if (element.tagName.toLowerCase() === 'select' && field === 'country') {
      score += 1
    }
    return score
  }

  function findBestPageField(field) {
    const candidates = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter(el => !el.disabled && el.offsetParent !== null)
    let best = { score: 0, element: null }
    for (const element of candidates) {
      const score = scoreElementForField(field, element)
      if (score > best.score) {
        best = { score, element }
      }
    }
    return best.element
  }

  async function fillApplication(platform) {
    const { profiles, settings } = await getStorage()
    const profile = profiles.find(p => p.id === settings.activeProfile) || profiles[0]
    const selectors = getFieldSelectors(platform)
    const delay = settings.autoFillDelay || 300
    const matchedElements = new Set()

    sendProgress('Considering configured profile values for target page fields.', 'info')

    let filled = 0
    sendProgress('Beginning form fill...', 'info')

    for (const [field, selectorOrArray] of Object.entries(selectors)) {
      const value = getValueFromProfile(profile, field)
      const selectorText = describeSelector(selectorOrArray)

      if (!value) {
        sendProgress(`Skipping lookup for selectors: ${selectorText}. No profile value available.`, 'info')
        continue
      }

      if (field === 'workAuthorized') {
        sendProgress(`Looking for work authorization page field using selectors: ${selectorText}`, 'info')
        const matchedElement = await fillWorkAuthorization(selectorOrArray, value)
        if (matchedElement) {
          matchedElements.add(matchedElement)
          filled++
          const desc = describeElement(matchedElement)
          sendProgress(`Filled target page field ${desc} with work authorization value ${value}.`, 'success')
        } else {
          sendProgress(`Could not find a matching work authorization page field. Selectors: ${selectorText}`, 'error')
        }
        continue
      }

      const lookup = findField(field, selectorOrArray)
      let element = lookup.element
      let matchType = 'selector'
      let matchedSelector = lookup.selector || selectorText

      if (!element) {
        const fallback = findBestPageField(field)
        if (fallback) {
          element = fallback
          matchType = 'heuristic'
          matchedSelector = describeElement(fallback)
        }
      }

      if (!element) {
        sendProgress(`No matching page field found for selectors: ${selectorText}.`, 'error')
        continue
      }

      matchedElements.add(element)

      const pageFieldDesc = describeElement(element)
      if (element.value || element.textContent) {
        sendProgress(`Target page field already has a value: ${pageFieldDesc} (matched by ${matchType}).`, 'info')
        continue
      }

      try {
        await fillField(element, value, delay)
        filled++
        sendProgress(`Filled target page field ${pageFieldDesc} using selector ${matchedSelector}.`, 'success')
      } catch (err) {
        console.error('Fill field error:', err)
        sendProgress(`Error filling target page field ${pageFieldDesc}: ${err.message || err}`, 'error')
      }
    }

    sendProgress(`Summary: ${filled}/${Object.keys(selectors).length} target page fields filled.`, 'info')

    if (profile.resume && profile.resume.data) {
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        try {
          const blob = dataURLToBlob(profile.resume.data)
          const file = new File([blob], profile.resume.filename, { type: 'application/pdf' })
          const dt = new DataTransfer()
          dt.items.add(file)
          fileInput.files = dt.files
          fileInput.dispatchEvent(new Event('change', { bubbles: true }))
          sendProgress('Resume file attached.', 'success')
        } catch (err) {
          console.error('Attach resume error:', err)
          sendProgress(`Error attaching resume: ${err.message || err}`, 'error')
        }
      }
    }

    const unmatchedPageFields = findUnmatchedFields(matchedElements)
    chrome.runtime.sendMessage({ type: 'UNMATCHED_PAGE_FIELDS', fields: unmatchedPageFields })
    chrome.runtime.sendMessage({
      type: 'FILL_COMPLETE',
      fieldsFilled: filled,
    })
  }

  async function fillWorkAuthorization(selectorOrArray, value) {
    if (Array.isArray(selectorOrArray)) {
      for (const selector of selectorOrArray) {
        const radios = document.querySelectorAll(selector)
        for (const radio of radios) {
          if (radio.type === 'radio' && radio.value.toLowerCase() === value.toLowerCase()) {
            radio.checked = true
            radio.dispatchEvent(new Event('change', { bubbles: true }))
            return radio
          }
        }
      }
      return null
    }

    // First try the provided selector directly
    const radios = document.querySelectorAll(selectorOrArray)
    for (const radio of radios) {
      if (radio.type === 'radio' && radio.value.toLowerCase() === value.toLowerCase()) {
        radio.checked = true
        radio.dispatchEvent(new Event('change', { bubbles: true }))
        return radio
      }
    }

    // Fallback: heuristically locate work authorization controls by scanning nearby labels
    const candidates = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"], select'))
      .filter(el => !el.disabled && el.offsetParent !== null)

    // Group radio inputs by name so we can pick the right option within a group
    const radiosByName = {}
    for (const el of candidates) {
      if (el.type === 'radio' && el.name) {
        radiosByName[el.name] = radiosByName[el.name] || []
        radiosByName[el.name].push(el)
      }
    }

    // Check radio groups first: prefer groups where the group or options hint at work authorization
    for (const name of Object.keys(radiosByName)) {
      const group = radiosByName[name]
      // compute best score for the group by checking labels of each option and the group container
      let groupScore = 0
      for (const opt of group) {
        const { bestField, score } = getBestFieldHint(opt)
        if (bestField === 'workAuthorized') groupScore = Math.max(groupScore, score)
      }
      if (groupScore >= 2) {
        // choose the option whose value or label best matches the desired profile value
        for (const opt of group) {
          const labelText = normalizeText(getLabelText(opt) || opt.value || opt.getAttribute('aria-label'))
          if (labelText.includes(normalizeText(String(value)))) {
            opt.checked = true
            opt.dispatchEvent(new Event('change', { bubbles: true }))
            return opt
          }
        }
        // if exact match not found, try matching by yes/no semantics
        const lower = String(value || '').toLowerCase()
        const yesVals = ['yes', 'y', 'true', 'eligible', 'authorized', 'right to work']
        const wantYes = yesVals.some(v => lower.includes(v))
        for (const opt of group) {
          const label = normalizeText(getLabelText(opt) || opt.value || opt.getAttribute('aria-label'))
          if (wantYes && /yes|y|true|eligible|authorized|right to work/.test(label)) {
            opt.checked = true
            opt.dispatchEvent(new Event('change', { bubbles: true }))
            return opt
          }
          if (!wantYes && /no|n|false|not authorized|not eligible/.test(label)) {
            opt.checked = true
            opt.dispatchEvent(new Event('change', { bubbles: true }))
            return opt
          }
        }
      }
    }

    // Check standalone selects/checkboxes as fallback
    for (const el of candidates) {
      const { bestField, score } = getBestFieldHint(el)
      if (bestField !== 'workAuthorized' || score < 2) continue
      if (el.tagName.toLowerCase() === 'select') {
        const opts = Array.from(el.options)
        const found = opts.find(o => normalizeText(o.value || o.text).includes(normalizeText(String(value))))
        if (found) {
          el.value = found.value
          el.dispatchEvent(new Event('change', { bubbles: true }))
          return el
        }
      }
      if (el.type === 'checkbox') {
        const lower = String(value || '').toLowerCase()
        const want = ['yes', 'true', '1', 'on', 'authorized', 'eligible'].some(v => lower.includes(v))
        el.checked = !!want
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return el
      }
    }

    return null
  }

  function clearFilledFields(platform) {
    const selectors = getFieldSelectors(platform)
    for (const [field, selectorOrArray] of Object.entries(selectors)) {
      let lookup
      if (Array.isArray(selectorOrArray)) {
        lookup = findField(field, selectorOrArray)
      } else {
        lookup = { element: document.querySelector(selectorOrArray), selector: selectorOrArray }
      }
      
      const element = lookup.element
      if (element) {
        if (element.tagName.toLowerCase() === 'select') {
          element.selectedIndex = 0
        } else if (element.type === 'checkbox' || element.type === 'radio') {
          element.checked = false
        } else {
          element.value = ''
        }
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  function getValueFromProfile(profile, field) {
    const personal = profile.personal || {}
    const professional = profile.professional || {}
    const map = {
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
      skills: Array.isArray(professional.skills) ? professional.skills.join(', ') : '',
      workAuthorized: personal.workAuthorized,
    }
    return map[field]
  }

  function describeSelector(selectorOrArray) {
    if (Array.isArray(selectorOrArray)) {
      return selectorOrArray.join(' | ')
    }
    return selectorOrArray || '[unknown selector]'
  }

  function describeElement(element) {
    if (!element) return '[unknown page field]'
    const parts = [element.tagName.toLowerCase()]
    if (element.type) parts.push(`type=${element.type}`)
    if (element.id) parts.push(`id=${element.id}`)
    if (element.name) parts.push(`name=${element.name}`)
    if (element.placeholder) parts.push(`placeholder=${element.placeholder}`)
    const aria = element.getAttribute('aria-label')
    if (aria) parts.push(`aria-label=${aria}`)
    const label = getLabelText(element)
    if (label) parts.push(`label="${label}"`)
    return parts.join(' ')
  }

  function getLabelText(element) {
    if (!element) return ''
    let label = ''
    if (element.id) {
      const labelEl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
      if (labelEl) label = labelEl.textContent.trim()
    }
    if (!label) {
      const parentLabel = element.closest('label')
      if (parentLabel) label = parentLabel.textContent.trim()
    }
    return label.replace(/\s+/g, ' ').trim()
  }

  function getBestFieldHint(element) {
    let bestScore = 0
    let bestField = null
    for (const field of Object.keys(FIELD_HINTS)) {
      const score = scoreElementForField(field, element)
      if (score > bestScore) {
        bestScore = score
        bestField = field
      }
    }
    return { bestField, score: bestScore }
  }

  function findUnmatchedFields(matchedElements) {
    const candidates = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter(el => !el.disabled && el.offsetParent !== null)

    const results = []
    for (const element of candidates) {
      if (matchedElements.has(element)) continue
      const { bestField, score } = getBestFieldHint(element)
      if (score >= 2) {
        results.push({ descriptor: describeElement(element), bestField, score })
      }
    }
    return results
  }

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',')
    const mime = parts[0].match(/:(.*?);/)[1]
    const bytes = atob(parts[1])
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }
})()
