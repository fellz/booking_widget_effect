import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Served from https://fellz.github.io/booking_widget_effect/ on GitHub Pages.
  base: command === 'build' ? '/booking_widget_effect/' : '/',
  plugins: [tailwindcss(), foldkit({ devToolsMcpPort: 9988 })],
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
}))
