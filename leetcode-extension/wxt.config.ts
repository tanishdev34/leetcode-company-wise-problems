import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  runner: {
    startUrls: ['http://localhost:3000'],
  },
  manifest: {
    name: 'LC Tracker',
    description: 'Add LeetCode questions and solutions to your tracker.',
    permissions: ['storage', 'tabs'],
    host_permissions: [
      'https://leetcode.com/*',
      'http://localhost:3000/*',
      'https://lc-grind.vercel.app/*',
    ],
    action: {
      default_title: 'LC Tracker',
    },
  },
})
