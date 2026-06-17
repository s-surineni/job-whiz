import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Job Whiz',
    description: 'Auto-fill job applications on LinkedIn, Indeed, and more with your saved profile',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://*/*'],
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
});