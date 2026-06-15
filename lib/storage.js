const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Default Profile',
  personal: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    linkedin: '',
    portfolio: '',
    website: '',
  },
  professional: {
    headline: '',
    summary: '',
    skills: [],
    languages: [],
    certifications: [],
  },
  employment: [],
  education: [],
  resume: { filename: '', data: '' },
}

const DEFAULT_SETTINGS = {
  activeProfile: 'default',
  autoFillDelay: 300,
  showNotifications: true,
  customSites: [],
}

async function getStorage() {
  const result = await chrome.storage.local.get(['profiles', 'settings', 'fieldMappings'])
  return {
    profiles: result.profiles || [{ ...DEFAULT_PROFILE }],
    settings: { ...DEFAULT_SETTINGS, ...result.settings },
    fieldMappings: result.fieldMappings || {},
  }
}

async function saveProfiles(profiles) {
  await chrome.storage.local.set({ profiles })
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ settings })
}

async function saveFieldMappings(mappings) {
  await chrome.storage.local.set({ fieldMappings: mappings })
}

async function getActiveProfile() {
  const { profiles, settings } = await getStorage()
  return profiles.find(p => p.id === settings.activeProfile) || profiles[0]
}
