export const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Default Profile',
  personal: {
    firstName: '',
    lastName: '',
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
    workAuthorized: 'yes',
  },
  professional: {
    headline: '',
    summary: '',
    skills: [] as string[],
    languages: [] as string[],
    certifications: [] as string[],
  },
  employment: [] as any[],
  education: [] as any[],
  resume: { filename: '', data: '' },
};

export const DEFAULT_SETTINGS = {
  activeProfile: 'default',
  autoFillDelay: 300,
  showNotifications: true,
  customSites: [] as string[],
};

export type Profile = typeof DEFAULT_PROFILE;
export type Settings = typeof DEFAULT_SETTINGS;

export async function getStorage() {
  const result = await chrome.storage.local.get(['profiles', 'settings', 'fieldMappings']);
  return {
    profiles: (result.profiles || [{ ...DEFAULT_PROFILE }]) as Profile[],
    settings: { ...DEFAULT_SETTINGS, ...result.settings } as Settings,
    fieldMappings: (result.fieldMappings || {}) as Record<string, any>,
  };
}

export async function saveProfiles(profiles: Profile[]) {
  await chrome.storage.local.set({ profiles });
}

export async function saveSettings(settings: Settings) {
  await chrome.storage.local.set({ settings });
}

export async function saveFieldMappings(mappings: Record<string, any>) {
  await chrome.storage.local.set({ fieldMappings: mappings });
}

export async function getActiveProfile() {
  const { profiles, settings } = await getStorage();
  return profiles.find((p) => p.id === settings.activeProfile) || profiles[0];
}