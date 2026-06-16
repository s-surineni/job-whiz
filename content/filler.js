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

  async function fillApplication(platform) {
    const { profiles, settings } = await getStorage()
    const profile = profiles.find(p => p.id === settings.activeProfile) || profiles[0]
    const selectors = getFieldSelectors(platform)
    const delay = settings.autoFillDelay || 300

    let filled = 0
    for (const [field, selectorOrArray] of Object.entries(selectors)) {
      const value = getValueFromProfile(profile, field)
      if (!value) continue

      if (field === 'workAuthorized') {
        // Special handling for work authorization (likely radio buttons)
        if (Array.isArray(selectorOrArray)) {
          for (const selector of selectorOrArray) {
            const radios = document.querySelectorAll(`${selector}`)
            for (const radio of radios) {
              if (radio.type === 'radio' && radio.value.toLowerCase() === value.toLowerCase()) {
                radio.checked = true
                radio.dispatchEvent(new Event('change', { bubbles: true }))
                filled++
                break
              }
            }
            if (filled > 0) break
          }
        } else {
          const radios = document.querySelectorAll(selectorOrArray)
          for (const radio of radios) {
            if (radio.type === 'radio' && radio.value.toLowerCase() === value.toLowerCase()) {
              radio.checked = true
              radio.dispatchEvent(new Event('change', { bubbles: true }))
              filled++
              break
            }
          }
        }
      } else {
        // Regular field handling
        let element = null
        if (Array.isArray(selectorOrArray)) {
          // Generic platform: try selectors in order
          element = findField(field, selectorOrArray)
        } else {
          // Specific platform: use querySelector
          element = document.querySelector(selectorOrArray)
        }
        
        if (element && (!element.value && !element.textContent)) {
          await fillField(element, value, delay)
          filled++
        }
      }
    }

    if (profile.resume && profile.resume.data) {
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        const blob = dataURLToBlob(profile.resume.data)
        const file = new File([blob], profile.resume.filename, { type: 'application/pdf' })
        const dt = new DataTransfer()
        dt.items.add(file)
        fileInput.files = dt.files
        fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }

    if (settings.showNotifications) {
      chrome.runtime.sendMessage({
        type: 'FILL_COMPLETE',
        fieldsFilled: filled,
      })
    }
  }

  function clearFilledFields(platform) {
    const selectors = getFieldSelectors(platform)
    for (const [field, selectorOrArray] of Object.entries(selectors)) {
      let element = null
      if (Array.isArray(selectorOrArray)) {
        element = findField(field, selectorOrArray)
      } else {
        element = document.querySelector(selectorOrArray)
      }
      
      if (element) {
        if (element.tagName.toLowerCase() === 'select') {
          element.selectedIndex = 0
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
      fullName: personal.fullName,
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

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',')
    const mime = parts[0].match(/:(.*?);/)[1]
    const bytes = atob(parts[1])
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }
})()
