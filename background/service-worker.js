chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['profiles', 'settings'], (result) => {
    if (!result.profiles) {
      chrome.storage.local.set({
        profiles: [{
          id: 'default',
          name: 'Default Profile',
          personal: { fullName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', country: 'US', linkedin: '', portfolio: '', website: '' },
          professional: { headline: '', summary: '', skills: [], languages: [], certifications: [] },
          employment: [],
          education: [],
          resume: { filename: '', data: '' },
        }],
      })
    }
    if (!result.settings) {
      chrome.storage.local.set({
        settings: { activeProfile: 'default', autoFillDelay: 300, showNotifications: true, customSites: [] },
      })
    }
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILL_COMPLETE') {
    chrome.action.setBadgeText({ text: String(message.fieldsFilled) })
    chrome.action.setBadgeBackgroundColor({ color: '#4a90d9' })
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
  }
})
